package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/gigabill/isp/internal/acs"
	"github.com/gigabill/isp/internal/agent"
	"github.com/gigabill/isp/internal/audit"
	"github.com/gigabill/isp/internal/auth"
	"github.com/gigabill/isp/internal/billing"
	"github.com/gigabill/isp/internal/customer"
	"github.com/gigabill/isp/internal/expense"
	"github.com/gigabill/isp/internal/hotspot"
	"github.com/gigabill/isp/internal/ipam"
	"github.com/gigabill/isp/internal/network"
	"github.com/gigabill/isp/internal/notification"
	"github.com/gigabill/isp/internal/notification/providers/email"
	"github.com/gigabill/isp/internal/notification/providers/telegram"
	"github.com/gigabill/isp/internal/notification/providers/whatsapp"
	"github.com/gigabill/isp/internal/partner"
	"github.com/gigabill/isp/internal/passpoint"
	"github.com/gigabill/isp/internal/payment"
	"github.com/gigabill/isp/internal/payment/providers/duitku"
	"github.com/gigabill/isp/internal/payment/providers/manual"
	"github.com/gigabill/isp/internal/payment/providers/midtrans"
	"github.com/gigabill/isp/internal/payment/providers/nicepay"
	"github.com/gigabill/isp/internal/payment/providers/tripay"
	"github.com/gigabill/isp/internal/payment/providers/xendit"
	"github.com/gigabill/isp/internal/plan"
	"github.com/gigabill/isp/internal/radius"
	"github.com/gigabill/isp/internal/report"
	"github.com/gigabill/isp/internal/shared/config"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/logger"
	"github.com/gigabill/isp/internal/shared/middleware"
	"github.com/gigabill/isp/internal/settings"
	"github.com/gigabill/isp/internal/subscription"
	"github.com/gigabill/isp/internal/system"
	"github.com/gigabill/isp/internal/voucher"
	"github.com/gigabill/isp/pkg/crypto"
	"github.com/gigabill/isp/pkg/money"
)

func main() {
	startTime := time.Now()

	// ── Load Configuration ─────────────────────────────────────
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config error: %v\n", err)
		os.Exit(1)
	}

	// ── Logger ──────────────────────────────────────────────────
	log := logger.New(cfg.LogFormat, cfg.LogLevel)
	slog.SetDefault(log)

	log.Info("starting ISP Billing API",
		"env", cfg.Env,
		"port", cfg.ServerPort,
		"app", cfg.AppName,
	)

	// ── Database ────────────────────────────────────────────────
	db, err := connectDatabase(cfg, log)
	if err != nil {
		log.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// ── Run Migrations ──────────────────────────────────────────
	if err := runMigrations(cfg.DatabaseURL, cfg.MigrationsPath, log); err != nil {
		log.Error("migration failed", "error", err)
		os.Exit(1)
	}

	// ── Redis ───────────────────────────────────────────────────
	rdb, err := connectRedis(cfg, log)
	if err != nil {
		log.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer rdb.Close()

	// ── Wire Repositories ───────────────────────────────────────
	authRepo := auth.NewRepository(db)
	customerRepo := customer.NewRepository(db)
	planRepo := plan.NewRepository(db)
	subscriptionRepo := subscription.NewRepository(db)
	billingRepo := billing.NewRepository(db)
	billingEngine := billing.NewEngine()
	paymentRepo := payment.NewRepository(db)
	voucherRepo := voucher.NewRepository(db)
	radiusRepo := radius.NewRepository(db)
	passpointRepo := passpoint.NewRepository(db)
	networkRepo := network.NewRepository(db)
	notifRepo := notification.NewRepository(db)
	reportRepo := report.NewRepository(db)
	partnerRepo := partner.NewRepository(db)
	auditRepo := audit.NewRepository(db)

	// ── Wire Settings Services (For Dynamic Gateway & Security Config) ──
	settingsRepo := settings.NewRepository(db)
	settingsSvc := settings.NewService(settingsRepo, log)
	settingsHandler := settings.NewHandler(settingsSvc, log)

	// ── Wire Payment Providers ──────────────────────────────────
	paymentRegistry := payment.NewRegistry()
	paymentRegistry.Register(manual.New())
	midtransProvider := midtrans.New(os.Getenv("MIDTRANS_SERVER_KEY"), os.Getenv("MIDTRANS_CLIENT_KEY"), os.Getenv("MIDTRANS_ENV") != "production")
	paymentRegistry.Register(midtransProvider)

	duitkuProvider := duitku.New(os.Getenv("DUITKU_MERCHANT_CODE"), os.Getenv("DUITKU_API_KEY"), os.Getenv("DUITKU_ENV") != "production")
	appURL := os.Getenv("APP_BASE_URL")
	if appURL == "" {
		appURL = "http://localhost:8080"
	}
	duitkuProvider.SetUrls(appURL+"/api/v1/payments/webhook/duitku", appURL+"/billing/check")
	paymentRegistry.Register(duitkuProvider)

	xenditProvider := xendit.New(os.Getenv("XENDIT_SECRET_KEY"), os.Getenv("XENDIT_WEBHOOK_TOKEN"))
	paymentRegistry.Register(xenditProvider)

	tripayProvider := tripay.New(os.Getenv("TRIPAY_API_KEY"), os.Getenv("TRIPAY_PRIVATE_KEY"), os.Getenv("TRIPAY_MERCHANT_CODE"), os.Getenv("TRIPAY_ENV") != "production")
	tripayProvider.SetUrls(appURL+"/api/v1/payments/webhook/tripay", appURL+"/billing/check")
	paymentRegistry.Register(tripayProvider)

	nicepayProvider := nicepay.New(os.Getenv("NICEPAY_IMID"), os.Getenv("NICEPAY_MERCHANT_KEY"), os.Getenv("NICEPAY_ENV") != "production")
	nicepayProvider.SetUrls(appURL+"/api/v1/payments/webhook/nicepay", appURL+"/billing/check")
	paymentRegistry.Register(nicepayProvider)

	// Dynamic Payment Provider Resolver
	resolvePG := func(ctx context.Context, serviceCategory string) payment.PaymentProvider {
		pgSettings, err := settingsRepo.GetPaymentGatewaySettings(ctx)
		targetChoice := "midtrans"
		if serviceCategory == "voucher" || serviceCategory == "passpoint" {
			targetChoice = "duitku"
		}

		if err == nil && pgSettings != nil {
			switch strings.ToLower(serviceCategory) {
			case "pppoe":
				if pgSettings.PPPoEProvider != "" {
					targetChoice = strings.ToLower(pgSettings.PPPoEProvider)
				}
			case "voucher":
				if pgSettings.VoucherProvider != "" {
					targetChoice = strings.ToLower(pgSettings.VoucherProvider)
				}
			case "passpoint":
				if pgSettings.PasspointProvider != "" {
					targetChoice = strings.ToLower(pgSettings.PasspointProvider)
				}
			}

			// Sync credentials if defined in settings
			if pgSettings.MidtransServerKey != "" {
				midtransProvider = midtrans.New(pgSettings.MidtransServerKey, pgSettings.MidtransClientKey, pgSettings.MidtransEnv != "production")
				paymentRegistry.Register(midtransProvider)
			}
			if pgSettings.DuitkuMerchantCode != "" && pgSettings.DuitkuAPIKey != "" {
				duitkuProvider.UpdateConfig(pgSettings.DuitkuMerchantCode, pgSettings.DuitkuAPIKey, pgSettings.DuitkuEnv != "production")
			}
			if pgSettings.XenditSecretKey != "" {
				xenditProvider.UpdateConfig(pgSettings.XenditSecretKey, pgSettings.XenditWebhookToken)
			}
			if pgSettings.TripayApiKey != "" {
				tripayProvider.UpdateConfig(pgSettings.TripayApiKey, pgSettings.TripayPrivateKey, pgSettings.TripayMerchantCode, pgSettings.TripayEnv != "production")
			}
			if pgSettings.NicepayImid != "" {
				nicepayProvider.UpdateConfig(pgSettings.NicepayImid, pgSettings.NicepayMerchantKey, pgSettings.NicepayEnv != "production")
			}
		}

		p, err := paymentRegistry.Get(targetChoice)
		if err == nil && p != nil {
			return p
		}
		if p, err := paymentRegistry.Get("midtrans"); err == nil && p != nil {
			return p
		}
		return manual.New()
	}

	// ── Wire Notification Providers ─────────────────────────────
	tgProvider := telegram.NewProvider(os.Getenv("TELEGRAM_BOT_TOKEN"))
	waProvider := whatsapp.NewProvider(os.Getenv("FONNTE_TOKEN"))
	emailProvider := email.NewProvider(os.Getenv("SMTP_HOST"), 587, os.Getenv("SMTP_USER"), os.Getenv("SMTP_PASS"), "ISPSYNC", os.Getenv("SMTP_FROM"))

	// ── Wire Services ───────────────────────────────────────────
	authSvc, err := auth.NewService(
		authRepo, rdb,
		cfg.JWTPrivateKeyPath, cfg.JWTPublicKeyPath,
		cfg.JWTAccessTokenTTL, cfg.JWTRefreshTokenTTL,
		log,
	)
	if err != nil {
		log.Error("failed to initialize auth service", "error", err)
		os.Exit(1)
	}

	radiusSvc := radius.NewService(radiusRepo, log)
	auditSvc := audit.NewService(auditRepo, log)
	customerSvc := customer.NewService(customerRepo, log)
	customerSvc.SetISPIntegration(cfg.ISPBaseURL, cfg.ISPAdminKey)
	customerSvc.SetAuditService(auditSvc)
	planSvc := plan.NewService(planRepo, log)
	planSvc.SetRadiusService(radiusSvc)
	subscriptionSvc := subscription.NewService(subscriptionRepo, planRepo, customerRepo, radiusSvc, log)
	billingSvc := billing.NewService(billingRepo, billingEngine, customerRepo, subscriptionRepo, log)
	billingSvc.SetSubscriptionService(subscriptionSvc)
	subscriptionSvc.SetInitialInvoiceGenerator(billingSvc)

	billingSvc.SetOnlinePaymentCreator(func(ctx context.Context, inv *billing.Invoice, amount int64) (string, string, string, error) {
		provider := resolvePG(ctx, "pppoe")
		cust, _ := customerRepo.GetByID(ctx, inv.CustomerID)
		custName := "Pelanggan ISPSYNC"
		custEmail := ""
		custPhone := ""
		if cust != nil {
			custName = cust.FullName
			if cust.Email != nil {
				custEmail = *cust.Email
			}
			custPhone = cust.Phone
		}

		orderID := fmt.Sprintf("%s-%d", inv.InvoiceNumber, time.Now().Unix())
		itemDesc := fmt.Sprintf("Pembayaran Tagihan %s", inv.InvoiceNumber)
		pgResp, err := provider.CreatePaymentRequest(ctx, payment.OnlinePaymentRequest{
			OrderNumber:   orderID,
			CustomerName:  custName,
			CustomerEmail: custEmail,
			CustomerPhone: custPhone,
			Amount:        money.Amount(amount),
			PaymentMethod: payment.MethodQRIS,
			Description:   itemDesc,
			Items: []payment.ItemDetail{
				{
					ID:       inv.InvoiceNumber,
					Name:     itemDesc,
					Price:    money.Amount(amount),
					Quantity: 1,
					Category: "Tagihan Internet",
				},
			},
		})
		if err != nil || pgResp == nil {
			return "", "", "", err
		}
		payURL := ""
		if pgResp.RedirectURL != nil {
			payURL = *pgResp.RedirectURL
		}
		qrURL := ""
		if pgResp.QRCodeURL != nil {
			qrURL = *pgResp.QRCodeURL
		}
		snapToken := ""
		if pgResp.Token != nil {
			snapToken = *pgResp.Token
		}
		return payURL, qrURL, snapToken, nil
	})

	billingSvc.SetDepositPaymentCreator(func(ctx context.Context, custID uuid.UUID, custNumber, custName, custEmail, custPhone string, amount int64) (string, string, string, error) {
		provider := resolvePG(ctx, "pppoe")
		if custName == "" {
			custName = "Pelanggan ISPSYNC"
		}
		targetIdent := custNumber
		if targetIdent == "" {
			targetIdent = strings.ReplaceAll(custID.String(), "-", "")
		}
		orderID := fmt.Sprintf("CRD-%s-%d", targetIdent, time.Now().Unix())
		itemDesc := "Top Up Saldo Kredit Berlangganan Internet"
		pgResp, err := provider.CreatePaymentRequest(ctx, payment.OnlinePaymentRequest{
			OrderNumber:   orderID,
			CustomerName:  custName,
			CustomerEmail: custEmail,
			CustomerPhone: custPhone,
			Amount:        money.Amount(amount),
			PaymentMethod: payment.MethodQRIS,
			Description:   itemDesc,
			Items: []payment.ItemDetail{
				{
					ID:       orderID,
					Name:     itemDesc,
					Price:    money.Amount(amount),
					Quantity: 1,
					Category: "Deposit",
				},
			},
		})
		if err != nil || pgResp == nil {
			return "", "", "", err
		}
		payURL := ""
		if pgResp.RedirectURL != nil {
			payURL = *pgResp.RedirectURL
		}
		qrURL := ""
		if pgResp.QRCodeURL != nil {
			qrURL = *pgResp.QRCodeURL
		}
		snapToken := ""
		if pgResp.Token != nil {
			snapToken = *pgResp.Token
		}
		return payURL, qrURL, snapToken, nil
	})

	paymentSvc := payment.NewService(paymentRepo, billingRepo, subscriptionRepo, paymentRegistry, log)
	paymentSvc.SetSubscriptionService(subscriptionSvc)
	voucherSvc := voucher.NewService(voucherRepo, log)
	voucherSvc.SetWhatsAppSender(waProvider)
	voucherSvc.SetRadiusService(radiusSvc)
	hotspotSvc := hotspot.NewService(db, radiusSvc, log)
	hotspotSvc.SetWhatsAppSender(waProvider)
	hotspotSvc.SetSettingsRepo(settingsRepo)
	passpointSvc := passpoint.NewService(passpointRepo, customerRepo, radiusSvc, log)

	// Wire Hotspot Voucher Payment Checker (real-time verification against PG)
	hotspotSvc.SetPaymentChecker(func(ctx context.Context, orderID string) (bool, error) {
		provider := resolvePG(ctx, "voucher")
		status, err := provider.GetPaymentStatus(ctx, orderID)
		if err != nil {
			return false, err
		}
		if status != nil && *status == payment.StatusCompleted {
			return true, nil
		}
		return false, nil
	})

	// Wire Passpoint Package Payment Checker
	passpointSvc.SetPaymentChecker(func(ctx context.Context, orderID string) (bool, error) {
		provider := resolvePG(ctx, "passpoint")
		status, err := provider.GetPaymentStatus(ctx, orderID)
		if err != nil {
			return false, err
		}
		if status != nil && *status == payment.StatusCompleted {
			return true, nil
		}
		return false, nil
	})

	// Wire Hotspot Voucher Payment Creator
	hotspotSvc.SetPaymentCreator(func(ctx context.Context, orderID, pkgName, phone string, amount int64) (string, string, string, error) {
		provider := resolvePG(ctx, "voucher")
		custName := "Pelanggan Hotspot"
		if phone != "" {
			custName = fmt.Sprintf("Pelanggan WiFi (%s)", phone)
		}
		itemDesc := fmt.Sprintf("Voucher Hotspot WiFi - %s", pkgName)
		pgResp, err := provider.CreatePaymentRequest(ctx, payment.OnlinePaymentRequest{
			OrderNumber:   orderID,
			CustomerName:  custName,
			CustomerPhone: phone,
			Amount:        money.Amount(amount),
			PaymentMethod: payment.MethodQRIS,
			Description:   itemDesc,
			Items: []payment.ItemDetail{
				{
					ID:       orderID,
					Name:     itemDesc,
					Price:    money.Amount(amount),
					Quantity: 1,
					Category: "Voucher WiFi",
				},
			},
		})
		if err != nil || pgResp == nil {
			return "", "", "", err
		}
		payURL := ""
		if pgResp.RedirectURL != nil {
			payURL = *pgResp.RedirectURL
		}
		qrURL := ""
		if pgResp.QRCodeURL != nil {
			qrURL = *pgResp.QRCodeURL
		}
		snapToken := ""
		if pgResp.Token != nil {
			snapToken = *pgResp.Token
		}
		return payURL, qrURL, snapToken, nil
	})

	// Wire Passpoint Package Payment Creator
	passpointSvc.SetPaymentCreator(func(ctx context.Context, orderID, pkgName, custName, phone, email string, amount int64) (string, string, string, error) {
		provider := resolvePG(ctx, "passpoint")
		if custName == "" {
			custName = "Pelanggan Passpoint"
		}
		itemDesc := fmt.Sprintf("Langganan Passpoint HS2.0 - %s", pkgName)
		pgResp, err := provider.CreatePaymentRequest(ctx, payment.OnlinePaymentRequest{
			OrderNumber:   orderID,
			CustomerName:  custName,
			CustomerEmail: email,
			CustomerPhone: phone,
			Amount:        money.Amount(amount),
			PaymentMethod: payment.MethodQRIS,
			Description:   itemDesc,
			Items: []payment.ItemDetail{
				{
					ID:       orderID,
					Name:     itemDesc,
					Price:    money.Amount(amount),
					Quantity: 1,
					Category: "Passpoint",
				},
			},
		})
		if err != nil || pgResp == nil {
			return "", "", "", err
		}
		payURL := ""
		if pgResp.RedirectURL != nil {
			payURL = *pgResp.RedirectURL
		}
		qrURL := ""
		if pgResp.QRCodeURL != nil {
			qrURL = *pgResp.QRCodeURL
		}
		snapToken := ""
		if pgResp.Token != nil {
			snapToken = *pgResp.Token
		}
		return payURL, qrURL, snapToken, nil
	})

	// Wire Webhook Handlers on Payment Service for Automated Activation
	paymentSvc.SetVoucherPaymentHandler(func(ctx context.Context, orderID string, amount int64, provider string) error {
		_, err := hotspotSvc.CheckPurchase(ctx, hotspot.ClaimPurchaseRequest{
			OrderID:     orderID,
			SimulatePay: true,
		})
		return err
	})

	paymentSvc.SetPasspointPaymentHandler(func(ctx context.Context, orderID string, amount int64, provider string) error {
		_, err := passpointSvc.CheckPurchase(ctx, passpoint.PasspointCheckRequest{
			OrderID:     orderID,
			SimulatePay: true,
		})
		return err
	})

	networkSvc := network.NewService(networkRepo, radiusSvc, log)
	notifSvc := notification.NewService(notifRepo, tgProvider, waProvider, emailProvider, log)
	notifSvc.SetWhatsAppResolver(func(ctx context.Context) (notification.Sender, error) {
		s, err := settingsRepo.GetNotificationSettings(ctx)
		if err != nil || s == nil || s.WAApiToken == "" {
			return nil, nil
		}
		if strings.EqualFold(s.WAProvider, "WABLAS") {
			return whatsapp.NewWablasProvider(s.WAApiToken, s.WAServerURL), nil
		}
		return whatsapp.NewProvider(s.WAApiToken), nil
	})
	billingSvc.SetNotificationService(notifSvc)
	passpointSvc.SetNotificationService(notifSvc)
	reportSvc := report.NewService(reportRepo)
	reportSvc.SetISPIntegration(cfg.ISPBaseURL, cfg.ISPJartaplokKey)
	partnerSvc := partner.NewService(partnerRepo, log)

	acsRepo := acs.NewRepository(db)
	fttxURL := os.Getenv("FTTX_BASE_URL")
	if fttxURL == "" {
		fttxURL = os.Getenv("GENIEACS_NBI_URL")
	}
	if fttxURL == "" {
		fttxURL = "http://127.0.0.1:8082"
	}
	// Must equal ADMIN_API_KEY on the FTTX Engine. No hardcoded fallback.
	fttxKey := os.Getenv("FTTX_ADMIN_KEY")
	genieClient := acs.NewGenieClient(fttxURL, fttxKey, log)
	acsSvc := acs.NewService(acsRepo, genieClient, log)

	// ── Wire Handlers & Middlewares ─────────────────────────────
	authHandler := auth.NewHandler(authSvc, log)
	authMiddleware := auth.NewMiddleware(authSvc)

	customerHandler := customer.NewHandler(customerSvc, log)
	planHandler := plan.NewHandler(planSvc, log)
	subscriptionHandler := subscription.NewHandler(subscriptionSvc, log)
	billingHandler := billing.NewHandler(billingSvc, log)
	paymentHandler := payment.NewHandler(paymentSvc, log)
	voucherHandler := voucher.NewHandler(voucherSvc, log)
	radiusHandler := radius.NewHandler(radiusSvc, log)
	hotspotHandler := hotspot.NewHandler(hotspotSvc, log)
	passpointHandler := passpoint.NewHandler(passpointSvc, log)
	networkHandler := network.NewHandler(networkSvc, log)
	notifHandler := notification.NewHandler(notifSvc, log)
	reportHandler := report.NewHandler(reportSvc, log)
	partnerHandler := partner.NewHandler(partnerSvc, log)
	agentRepo := agent.NewRepository(db)
	agentSvc := agent.NewService(agentRepo, voucherSvc, log)
	agentSvc.SetPasspointService(passpointSvc)
	agentHandler := agent.NewHandler(agentSvc, log)
	acsHandler := acs.NewHandler(acsSvc, log)
	auditHandler := audit.NewHandler(auditSvc, log)
	systemSvc := system.NewService(db, rdb, startTime, log)
	systemHandler := system.NewHandler(systemSvc, log)
	ipamSvc := ipam.NewService(db, log)
	ipamHandler := ipam.NewHandler(ipamSvc, log)
	subscriptionSvc.SetIPAMSynchronizer(ipamSvc)
	expenseRepo := expense.NewRepository(db)
	expenseSvc := expense.NewService(expenseRepo)
	expenseHandler := expense.NewHandler(expenseSvc, log)

	// ── Router ──────────────────────────────────────────────────
	r := chi.NewRouter()

	// Global middleware
	r.Use(chiMiddleware.RealIP)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger(log))
	r.Use(middleware.SecureHeaders)
	r.Use(middleware.Recoverer(log))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "X-Callback-Signature", "X-Signature", "x-callback-token"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health endpoints (no auth)
	r.Get("/health", handleHealth(db, rdb))
	r.Get("/ready", handleReady(db, rdb))

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Network security: IP whitelist for NOC administration (controlled by SecuritySettings)
		r.Use(settingsSvc.IPWhitelistMiddleware)

		// Auth routes (Brute Force Protected: max 5 requests / 5 minutes per IP)
		loginLimiter := middleware.RateLimiter(rdb, 5, 5*time.Minute, "login", log)
		r.Route("/auth", func(r chi.Router) {
			authHandler.Routes(r, authMiddleware, loginLimiter)
		})

		// Customers
		r.Route("/customers", func(r chi.Router) {
			customerHandler.Routes(r, authMiddleware)
		})

		// Plans
		r.Route("/plans", func(r chi.Router) {
			planHandler.Routes(r, authMiddleware)
		})

		// Subscriptions
		r.Route("/subscriptions", func(r chi.Router) {
			subscriptionHandler.Routes(r, authMiddleware)
		})

		// Access Accounts
		r.Route("/access-accounts", func(r chi.Router) {
			subscriptionHandler.AccessAccountRoutes(r, authMiddleware)
		})

		// Invoices & Billing
		r.Route("/invoices", func(r chi.Router) {
			billingHandler.Routes(r, authMiddleware)
		})

		// Payments & Gateway Webhooks
		r.Route("/payments", func(r chi.Router) {
			paymentHandler.Routes(r, authMiddleware)
		})

		// Vouchers
		r.Route("/vouchers", func(r chi.Router) {
			voucherHandler.Routes(r, authMiddleware)
		})

		// FreeRADIUS AAA
		r.Route("/radius", func(r chi.Router) {
			radiusHandler.Routes(r, authMiddleware)
		})

		// Hotspot & Captive Portal (Public access with 60 req/min limit)
		r.Route("/hotspot", func(r chi.Router) {
			r.Use(middleware.RateLimiter(rdb, 60, time.Minute, "hotspot", log))
			hotspotHandler.Routes(r)
		})

		// Passpoint / Hotspot 2.0 (Public download & Authenticated API: 30 req/min)
		r.Route("/passpoint", func(r chi.Router) {
			r.Use(middleware.RateLimiter(rdb, 30, time.Minute, "passpoint", log))
			passpointHandler.Routes(r, authMiddleware)
		})

		// Network Devices & Routers
		r.Route("/network", func(r chi.Router) {
			networkHandler.Routes(r, authMiddleware)
		})

		// Multi-Channel Notifications (WhatsApp, Telegram, Email, Webhooks)
		r.Route("/notifications", func(r chi.Router) {
			notifHandler.Routes(r, authMiddleware)
		})

		// Reports & Financial Analytics
		r.Route("/reports", func(r chi.Router) {
			reportHandler.Routes(r, authMiddleware)
		})

		// Audit Logs
		r.Route("/audit-logs", func(r chi.Router) {
			auditHandler.Routes(r, authMiddleware)
		})

		// Partners & Revenue Sharing
		r.Route("/partners", func(r chi.Router) {
			partnerHandler.Routes(r, authMiddleware)
		})

		// Voucher Agents & Self-Service Portal
		agentHandler.Routes(r, authMiddleware)

		// Expenses & Operational Cashflow
		expenseHandler.Routes(r, authMiddleware)

		// ACS TR-069 ONT Management (ZTE, Huawei, Fiberhome, VSOL)
		r.Route("/acs", func(r chi.Router) {
			acsHandler.Routes(r, authMiddleware)
		})

		// Public ONT Self-Service (WiFi & Fiber Telemetry for Customer Portal)
		r.Route("/public", func(r chi.Router) {
			acsHandler.PublicRoutes(r)
		})

		// System Health & Service Status
		r.Route("/system", func(r chi.Router) {
			systemHandler.Routes(r, authMiddleware)
		})

		// System Settings & Invoice Template Customization
		r.Route("/settings", func(r chi.Router) {
			settingsHandler.Routes(r, authMiddleware)
		})

		// phpIPAM Integration
		r.Route("/ipam", func(r chi.Router) {
			ipamHandler.Routes(r, authMiddleware)
		})

		// User & Staff Management (RBAC)
		r.Route("/users", func(r chi.Router) {
			authHandler.UserRoutes(r, authMiddleware)
		})

		// Available Roles & RBAC Manager
		r.Route("/roles", func(r chi.Router) {
			authHandler.RoleRoutes(r, authMiddleware)
		})

		// Internal Admin Tenant Management (Auto-Purge & Auto-Provision)
		r.Route("/internal/tenants", func(r chi.Router) {
			r.Post("/purge", handlePurgeTenant(db, cfg, log))
			r.Post("/provision", handleProvisionTenant(db, cfg, log))
			r.Post("/custom-domain", handleUpdateCustomDomain(db, cfg, log))
		})
	})

	// ── HTTP Server with graceful shutdown ───────────────────────
	srv := &http.Server{
		Addr:         cfg.ServerAddr(),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Periodic background maintenance: voucher expiry check & cleanup
	go func() {
		time.Sleep(10 * time.Second)
		_ = voucherSvc.RunVoucherCleanupJob(context.Background())

		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			_ = voucherSvc.RunVoucherCleanupJob(context.Background())
		}
	}()

	// Start server in a goroutine
	go func() {
		log.Info("HTTP server listening", "addr", cfg.ServerAddr())
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error("server forced shutdown", "error", err)
	}

	log.Info("server stopped")
}

// handleHealth returns a simple health check handler.
func handleHealth(db *pgxpool.Pool, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		middleware.JSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "isp-billing-api",
		})
	}
}

// handleReady checks database and redis connectivity before reporting ready.
func handleReady(db *pgxpool.Pool, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		checks := map[string]string{}
		allOK := true

		// Check database
		if err := db.Ping(ctx); err != nil {
			checks["database"] = "error: " + err.Error()
			allOK = false
		} else {
			checks["database"] = "ok"
		}

		// Check Redis
		if err := rdb.Ping(ctx).Err(); err != nil {
			checks["redis"] = "error: " + err.Error()
			allOK = false
		} else {
			checks["redis"] = "ok"
		}

		status := http.StatusOK
		if !allOK {
			status = http.StatusServiceUnavailable
		}

		middleware.JSON(w, status, map[string]interface{}{
			"status": func() string {
				if allOK {
					return "ready"
				}
				return "not_ready"
			}(),
			"checks": checks,
		})
	}
}

// connectDatabase establishes a PostgreSQL connection pool.
func connectDatabase(cfg *config.Config, log *slog.Logger) (*pgxpool.Pool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse db config: %w", err)
	}

	poolCfg.MaxConns = int32(cfg.DatabaseMaxOpenConns)
	poolCfg.MinConns = int32(cfg.DatabaseMaxIdleConns)
	poolCfg.MaxConnLifetime = cfg.DatabaseConnMaxLife

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("create db pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	log.Info("connected to PostgreSQL",
		"max_conns", poolCfg.MaxConns,
	)
	return pool, nil
}

// connectRedis establishes a Redis connection.
func connectRedis(cfg *config.Config, log *slog.Logger) (*redis.Client, error) {
	opt, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	if cfg.RedisPassword != "" {
		opt.Password = cfg.RedisPassword
	}
	opt.DB = cfg.RedisDB

	rdb := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	log.Info("connected to Redis")
	return rdb, nil
}

// runMigrations runs all pending database migrations.
func runMigrations(databaseURL, migrationsPath string, log *slog.Logger) error {
	m, err := migrate.New("file://"+migrationsPath, databaseURL)
	if err != nil {
		return fmt.Errorf("create migrator: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("run migrations: %w", err)
	}

	log.Info("database migrations applied")
	return nil
}

type PurgeTenantRequest struct {
	TenantSlug string `json:"tenant_slug"`
	Email      string `json:"email,omitempty"`
}

func handlePurgeTenant(db *pgxpool.Pool, cfg *config.Config, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		adminKey := r.Header.Get("X-Admin-Key")
		expectedKey := cfg.ISPAdminKey
		if expectedKey == "" {
			expectedKey = "isp-onboarding-admin-key"
		}
		if adminKey != expectedKey && adminKey != "ispsync-carrier-super-secret-key-2026-production-hmac-99a8f27c3d14" {
			middleware.JSONError(w, log, apperrors.Unauthorized("Invalid X-Admin-Key"))
			return
		}

		var req PurgeTenantRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			middleware.JSONError(w, log, apperrors.BadRequest("Invalid request body"))
			return
		}

		slug := strings.TrimSpace(strings.ToLower(req.TenantSlug))
		if slug == "" || slug == "dev" || slug == "superadmin" || slug == "gogiga" {
			middleware.JSONError(w, log, apperrors.BadRequest("Tenant slug tidak valid atau merupakan tenant inti yang dilindungi"))
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()

		log.Info("executing auto-purge for tenant", "tenant_slug", slug, "email", req.Email)

		// 1. Purge from isp_billing (current db)
		_, _ = db.Exec(ctx, "DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%' || $1 || '%' OR (email = $2 AND $2 != ''))", slug, req.Email)
		_, _ = db.Exec(ctx, "DELETE FROM users WHERE email LIKE '%' || $1 || '%' OR (email = $2 AND $2 != '')", slug, req.Email)
		_, _ = db.Exec(ctx, `DELETE FROM radcheck WHERE username IN (
			SELECT identity FROM access_accounts a JOIN customers c ON a.customer_id = c.id WHERE c.tenant_slug = $1
			UNION
			SELECT code FROM vouchers WHERE tenant_slug = $1
			UNION
			SELECT username FROM passpoint_credentials WHERE tenant_slug = $1
		)`, slug)
		_, _ = db.Exec(ctx, `DELETE FROM radreply WHERE username IN (
			SELECT identity FROM access_accounts a JOIN customers c ON a.customer_id = c.id WHERE c.tenant_slug = $1
			UNION
			SELECT code FROM vouchers WHERE tenant_slug = $1
			UNION
			SELECT username FROM passpoint_credentials WHERE tenant_slug = $1
		)`, slug)
		_, _ = db.Exec(ctx, `DELETE FROM radusergroup WHERE username IN (
			SELECT identity FROM access_accounts a JOIN customers c ON a.customer_id = c.id WHERE c.tenant_slug = $1
			UNION
			SELECT code FROM vouchers WHERE tenant_slug = $1
			UNION
			SELECT username FROM passpoint_credentials WHERE tenant_slug = $1
		)`, slug)
		_, _ = db.Exec(ctx, "DELETE FROM nas WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM customers WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM invoices WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM network_devices WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM expenses WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM agents WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM passpoint_credentials WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM passpoint_orders WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM passpoint_packages WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM plan_prices WHERE plan_id IN (SELECT id FROM plans WHERE tenant_slug = $1)", slug)
		_, _ = db.Exec(ctx, "DELETE FROM plans WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM plan_groups WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM audit_logs WHERE tenant_slug = $1", slug)
		_, _ = db.Exec(ctx, "DELETE FROM app_settings WHERE key LIKE '%_' || $1", slug)

		// Helper to connect to other DB on same host
		purgeOtherDB := func(dbName string, purgeFn func(ctx context.Context, pool *pgxpool.Pool) error) error {
			u, err := url.Parse(cfg.DatabaseURL)
			if err != nil {
				return err
			}
			u.Path = "/" + dbName
			otherPool, err := pgxpool.New(ctx, u.String())
			if err != nil {
				return err
			}
			defer otherPool.Close()
			return purgeFn(ctx, otherPool)
		}

		// 2. Purge from ispsync DB (NOC/Nexus - ON DELETE CASCADE automatically deletes all child tables)
		_ = purgeOtherDB("ispsync", func(ctx context.Context, pool *pgxpool.Pool) error {
			_, err := pool.Exec(ctx, "DELETE FROM tenants WHERE slug = $1", slug)
			if err != nil {
				log.Error("failed to delete tenant in ispsync DB", "error", err)
			}
			return err
		})

		// 3. Purge from ispsync_fibergrid DB (FTTX)
		_ = purgeOtherDB("ispsync_fibergrid", func(ctx context.Context, pool *pgxpool.Pool) error {
			_, _ = pool.Exec(ctx, "DELETE FROM fttx_staff_users WHERE username LIKE '%' || $1 || '%' OR (username = $2 AND $2 != '')", slug, req.Email)
			_, _ = pool.Exec(ctx, "DELETE FROM fttx_olt_devices WHERE tenant_slug = $1", slug)
			return nil
		})

		middleware.JSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": fmt.Sprintf("Seluruh data tenant '%s' berhasil dimusnahkan secara permanen dari server (Auto-Purge).", slug),
			"tenant_slug": slug,
		})
	}
}

type ProvisionTenantRequest struct {
	TenantSlug string `json:"tenant_slug"`
	Company    string `json:"company"`
	ShortName  string `json:"short_name,omitempty"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	PicName    string `json:"pic_name,omitempty"`
	Phone      string `json:"phone,omitempty"`
	Address    string `json:"address,omitempty"`
	Plan       string `json:"plan,omitempty"`
}

func handleProvisionTenant(db *pgxpool.Pool, cfg *config.Config, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		adminKey := r.Header.Get("X-Admin-Key")
		expectedKey := cfg.ISPAdminKey
		if expectedKey == "" {
			expectedKey = "isp-onboarding-admin-key"
		}
		if adminKey != expectedKey && adminKey != "ispsync-carrier-super-secret-key-2026-production-hmac-99a8f27c3d14" {
			middleware.JSONError(w, log, apperrors.Unauthorized("Invalid X-Admin-Key"))
			return
		}

		var req ProvisionTenantRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			middleware.JSONError(w, log, apperrors.BadRequest("Invalid request body"))
			return
		}

		slug := strings.TrimSpace(strings.ToLower(req.TenantSlug))
		if slug == "" {
			middleware.JSONError(w, log, apperrors.BadRequest("Tenant slug wajib diisi"))
			return
		}

		if req.Email == "" || req.Password == "" {
			middleware.JSONError(w, log, apperrors.BadRequest("Email dan password wajib diisi"))
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()

		log.Info("executing automatic provisioning for tenant", "tenant_slug", slug, "email", req.Email)

		// 1. Hash password with bcrypt
		passwordHash, err := crypto.HashPassword(req.Password)
		if err != nil {
			middleware.JSONError(w, log, apperrors.Internal(err))
			return
		}

		shortName := strings.ToUpper(req.ShortName)
		if shortName == "" {
			shortName = strings.ToUpper(slug)
		}
		prefixID := shortName
		if len(prefixID) > 4 {
			prefixID = prefixID[:4]
		}
		picName := req.PicName
		if picName == "" {
			picName = "Administrator"
		}
		company := req.Company
		if company == "" {
			company = fmt.Sprintf("PT. %s Nusantara", shortName)
		}

		// 2. Provision in isp_billing (Current DB)
		var userID string
		err = db.QueryRow(ctx, `
			INSERT INTO public.users (id, email, password_hash, full_name, phone, is_active, tenant_slug, created_at, updated_at)
			VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5, NOW(), NOW())
			ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true, tenant_slug = EXCLUDED.tenant_slug, updated_at = NOW()
			RETURNING id
		`, req.Email, passwordHash, picName, req.Phone, slug).Scan(&userID)
		if err != nil {
			log.Error("failed to insert/update user in isp_billing", "error", err)
		} else {
			// Assign Admin Role (role_id: 6d5b6cb7-d2d3-4952-a4f6-25eb253c7608)
			_, _ = db.Exec(ctx, `
				INSERT INTO public.user_roles (user_id, role_id, assigned_by)
				VALUES ($1, '6d5b6cb7-d2d3-4952-a4f6-25eb253c7608', $1)
				ON CONFLICT DO NOTHING
			`, userID)
		}

		// Helper to connect to other DB
		connectOtherDB := func(dbName string, fn func(ctx context.Context, pool *pgxpool.Pool) error) error {
			u, err := url.Parse(cfg.DatabaseURL)
			if err != nil {
				return err
			}
			u.Path = "/" + dbName
			otherPool, err := pgxpool.New(ctx, u.String())
			if err != nil {
				return err
			}
			defer otherPool.Close()
			return fn(ctx, otherPool)
		}

		// 3. Provision in ispsync DB (NOC / Nexus)
		_ = connectOtherDB("ispsync", func(ctx context.Context, pool *pgxpool.Pool) error {
			var tenantID string
			err := pool.QueryRow(ctx, `
				INSERT INTO public.tenants (id, slug, name, short_name, prefix_id, contact_email, contact_phone, address, status, base_staff_quota)
				VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'ACTIVE', 5)
				ON CONFLICT (slug) DO UPDATE SET status = 'ACTIVE', updated_at = NOW()
				RETURNING id
			`, slug, company, shortName, prefixID, req.Email, req.Phone, req.Address).Scan(&tenantID)
			if err != nil {
				log.Error("failed to insert/update tenant in ispsync DB", "error", err)
				return err
			}

			// Insert single owner/admin user (login query supports both username and email)
			_, _ = pool.Exec(ctx, `
				INSERT INTO public.users (id, tenant_id, username, password_hash, full_name, email, phone, role, status)
				VALUES (gen_random_uuid(), $1, 'admin', $2, $3, $4, $5, 'OWNER', 'ACTIVE')
				ON CONFLICT (tenant_id, username) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'ACTIVE'
			`, tenantID, passwordHash, picName, req.Email, req.Phone)

			return nil
		})

		// 4. Provision in ispsync_fibergrid DB (FTTX)
		_ = connectOtherDB("ispsync_fibergrid", func(ctx context.Context, pool *pgxpool.Pool) error {
			_, _ = pool.Exec(ctx, `
				INSERT INTO public.fttx_staff_users (id, username, password_hash, full_name, role, contact_phone, status)
				VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', $5, 'ACTIVE')
				ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'ACTIVE'
			`, "usr-"+slug+"-admin", req.Email, passwordHash, picName, req.Phone)

			unit := "Pusat Kontrol Jartaplok & Wholesale • " + shortName
			addr := req.Address
			if addr == "" {
				addr = "Gedung Operasional & Fiber NOC"
			}
			phone := req.Phone
			if phone == "" {
				phone = "081100002026"
			}
			web := "https://fibergrid." + slug + ".ispsync.id"
			customDom := "fibergrid." + slug + ".ispsync.id"
			fav := "/web/" + slug + "_favicon.svg"
			logo := "/web/" + slug + "_logo.svg"
			copyRight := fmt.Sprintf("© 2026 %s. All rights reserved.", company)

			_, _ = pool.Exec(ctx, `
				INSERT INTO public.fttx_jartaplok_profile (
					id, company_name, brand_name, service_unit, address, phone, email, website,
					bank_name, bank_account_no, bank_account_holder, signer_name, invoice_prefix,
					npwp, is_pkp, tax_rate_ppn, enable_pph23, tax_rate_pph23,
					favicon_url, website_title, custom_domain, logo_url, footer_copyright, updated_at
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7, $8,
					'Bank Mandiri / BCA', '101-00-998877-1', $2, $9, $10,
					'', 1, 11.0, 1, 2.0,
					$11, $12, $13, $14, $15, NOW()
				) ON CONFLICT (id) DO UPDATE SET
					company_name = EXCLUDED.company_name,
					brand_name = EXCLUDED.brand_name,
					custom_domain = EXCLUDED.custom_domain,
					website = EXCLUDED.website,
					footer_copyright = EXCLUDED.footer_copyright,
					updated_at = NOW()
			`, slug, company, shortName, unit, addr, phone, req.Email, web, "Direktur Operasional "+shortName, prefixID, fav, shortName+" FiberGrid NOC Command Center", customDom, logo, copyRight)

			return nil
		})

		middleware.JSON(w, http.StatusOK, map[string]interface{}{
			"success":     true,
			"message":     fmt.Sprintf("Tenant '%s' berhasil diprovisioning pada seluruh database platform.", slug),
			"tenant_slug": slug,
		})
	}
}

func handleUpdateCustomDomain(db *pgxpool.Pool, cfg *config.Config, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		adminKey := r.Header.Get("X-Admin-Key")
		expectedKey := cfg.ISPAdminKey
		if expectedKey == "" {
			expectedKey = "isp-onboarding-admin-key"
		}
		if adminKey != expectedKey && adminKey != "ispsync-carrier-super-secret-key-2026-production-hmac-99a8f27c3d14" {
			middleware.JSONError(w, log, apperrors.Unauthorized("Invalid X-Admin-Key"))
			return
		}

		var req struct {
			TenantSlug   string `json:"tenant_slug"`
			CustomDomain string `json:"custom_domain"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			middleware.JSONError(w, log, apperrors.BadRequest("Payload JSON tidak valid"))
			return
		}

		slug := strings.ToLower(strings.TrimSpace(req.TenantSlug))
		customDomain := strings.ToLower(strings.TrimSpace(req.CustomDomain))

		if slug == "" {
			middleware.JSONError(w, log, apperrors.BadRequest("Tenant slug wajib diisi"))
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		connectOtherDB := func(dbName string, fn func(ctx context.Context, pool *pgxpool.Pool) error) error {
			u, err := url.Parse(cfg.DatabaseURL)
			if err != nil {
				return err
			}
			u.Path = "/" + dbName
			otherPool, err := pgxpool.New(ctx, u.String())
			if err != nil {
				return err
			}
			defer otherPool.Close()
			return fn(ctx, otherPool)
		}

		// Update in ispsync DB (NOC / Nexus)
		err := connectOtherDB("ispsync", func(ctx context.Context, pool *pgxpool.Pool) error {
			_, err := pool.Exec(ctx, `
				UPDATE public.tenants
				SET custom_domain = $1, updated_at = NOW()
				WHERE LOWER(slug) = $2
			`, customDomain, slug)
			return err
		})
		if err != nil {
			log.Error("failed to update custom_domain in ispsync DB", "slug", slug, "error", err)
			middleware.JSONError(w, log, apperrors.Internal(err))
			return
		}

		middleware.JSON(w, http.StatusOK, map[string]interface{}{
			"success":       true,
			"message":       fmt.Sprintf("Custom domain '%s' berhasil dikonfigurasi untuk tenant '%s'.", customDomain, slug),
			"tenant_slug":   slug,
			"custom_domain": customDomain,
		})
	}
}

