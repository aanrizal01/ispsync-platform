package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/gigabill/isp/internal/billing"
	"github.com/gigabill/isp/internal/customer"
	"github.com/gigabill/isp/internal/notification"
	"github.com/gigabill/isp/internal/notification/providers/email"
	"github.com/gigabill/isp/internal/notification/providers/telegram"
	"github.com/gigabill/isp/internal/notification/providers/whatsapp"
	"github.com/gigabill/isp/internal/passpoint"
	"github.com/gigabill/isp/internal/plan"
	"github.com/gigabill/isp/internal/radius"
	"github.com/gigabill/isp/internal/shared/config"
	"github.com/gigabill/isp/internal/shared/logger"
	"github.com/gigabill/isp/internal/subscription"
	"github.com/gigabill/isp/internal/voucher"
)

func main() {
	// ── Load Configuration ─────────────────────────────────────
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config error: %v\n", err)
		os.Exit(1)
	}

	// ── Logger ──────────────────────────────────────────────────
	log := logger.New(cfg.LogFormat, cfg.LogLevel)
	slog.SetDefault(log)

	log.Info("starting ISP Billing Worker", "env", cfg.Env)

	// ── Database ────────────────────────────────────────────────
	db, err := connectDatabase(cfg, log)
	if err != nil {
		log.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// ── Redis ───────────────────────────────────────────────────
	rdb, err := connectRedis(cfg, log)
	if err != nil {
		log.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer rdb.Close()

	// ── Wire Billing & Subscription Services for Worker ────────
	custRepo := customer.NewRepository(db)
	planRepo := plan.NewRepository(db)
	subRepo := subscription.NewRepository(db)
	radiusRepo := radius.NewRepository(db)
	radiusSvc := radius.NewService(radiusRepo, log)
	subSvc := subscription.NewService(subRepo, planRepo, custRepo, radiusSvc, log)

	// ── Wire Notification Engine for Worker ─────────────────────
	notifRepo := notification.NewRepository(db)
	tgProvider := telegram.NewProvider(os.Getenv("TELEGRAM_BOT_TOKEN"))
	waProvider := whatsapp.NewProvider(os.Getenv("FONNTE_TOKEN"))
	emailProvider := email.NewProvider(os.Getenv("SMTP_HOST"), 587, os.Getenv("SMTP_USER"), os.Getenv("SMTP_PASS"), "ISPSYNC", os.Getenv("SMTP_FROM"))
	notifSvc := notification.NewService(notifRepo, tgProvider, waProvider, emailProvider, log)

	billingRepo := billing.NewRepository(db)
	billingEngine := billing.NewEngine()
	billingSvc := billing.NewService(billingRepo, billingEngine, custRepo, subRepo, log)
	billingSvc.SetSubscriptionService(subSvc)
	billingSvc.SetNotificationService(notifSvc)

	voucherRepo := voucher.NewRepository(db)
	voucherSvc := voucher.NewService(voucherRepo, log)

	passpointRepo := passpoint.NewRepository(db)
	passpointSvc := passpoint.NewService(passpointRepo, custRepo, radiusSvc, log)
	passpointSvc.SetNotificationService(notifSvc)

	// ── Periodic Job Runner ──────────────────────────────────────
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Ticker for periodic billing runs (e.g. checks every 1 minute in dev / worker)
	billingTicker := time.NewTicker(1 * time.Minute)
	defer billingTicker.Stop()

	overdueTicker := time.NewTicker(5 * time.Minute)
	defer overdueTicker.Stop()

	reminderTicker := time.NewTicker(15 * time.Minute)
	defer reminderTicker.Stop()

	voucherTicker := time.NewTicker(1 * time.Hour)
	defer voucherTicker.Stop()

	passpointTicker := time.NewTicker(2 * time.Minute)
	defer passpointTicker.Stop()

	go func() {
		log.Info("background workers started (auto-invoice, overdue/isolir, wa-reminder, voucher-cleanup, passpoint-expiry-reminder)")
		// Immediate initial checks on startup
		if err := billingSvc.RunInvoiceReminderJob(ctx); err != nil {
			log.Error("error in initial whatsapp reminder job", "error", err)
		}
		if err := voucherSvc.RunVoucherCleanupJob(ctx); err != nil {
			log.Error("error in initial voucher cleanup job", "error", err)
		}
		if err := passpointSvc.RunPasspointExpiryJob(ctx); err != nil {
			log.Error("error in initial passpoint expiry job", "error", err)
		}
		if err := passpointSvc.RunPasspointReminderJob(ctx); err != nil {
			log.Error("error in initial passpoint reminder job", "error", err)
		}

		for {
			select {
			case <-billingTicker.C:
				if err := billingSvc.RunInvoiceGenerationJob(ctx); err != nil {
					log.Error("error in auto-invoice generation job", "error", err)
				}
			case <-overdueTicker.C:
				if err := billingSvc.RunOverdueCheckJob(ctx); err != nil {
					log.Error("error in overdue/grace check job", "error", err)
				}
				if _, err := billingSvc.RunDepositReleaseJob(ctx); err != nil {
					log.Error("error in deposit release job", "error", err)
				}
			case <-reminderTicker.C:
				if err := billingSvc.RunInvoiceReminderJob(ctx); err != nil {
					log.Error("error in automated whatsapp reminder job", "error", err)
				}
			case <-voucherTicker.C:
				if err := voucherSvc.RunVoucherCleanupJob(ctx); err != nil {
					log.Error("error in periodic voucher cleanup job", "error", err)
				}
			case <-passpointTicker.C:
				if err := passpointSvc.RunPasspointExpiryJob(ctx); err != nil {
					log.Error("error in passpoint expiry job", "error", err)
				}
				if err := passpointSvc.RunPasspointReminderJob(ctx); err != nil {
					log.Error("error in passpoint reminder job", "error", err)
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	// ── Graceful Shutdown ────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	log.Info("worker is active and processing scheduled tasks...")
	<-quit

	log.Info("shutting down worker...")
	cancel()

	time.Sleep(500 * time.Millisecond)
	log.Info("worker stopped cleanly")
}

func connectDatabase(cfg *config.Config, log *slog.Logger) (*pgxpool.Pool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse db config: %w", err)
	}

	poolCfg.MaxConns = int32(cfg.DatabaseMaxOpenConns)

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("create db pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	log.Info("worker: connected to PostgreSQL")
	return pool, nil
}

func connectRedis(cfg *config.Config, log *slog.Logger) (*redis.Client, error) {
	opt, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}
	if cfg.RedisPassword != "" {
		opt.Password = cfg.RedisPassword
	}
	rdb := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	log.Info("worker: connected to Redis")
	return rdb, nil
}
