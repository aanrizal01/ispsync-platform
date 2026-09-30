package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ispsync/internal/handler"
	"ispsync/internal/middleware"
	"ispsync/internal/repository"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082" // Port 8082 agar tidak bentrok dengan 8080 (GOGIGABILL) atau 8081 (ISP Onboarding)
	}

	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "ispsync.db"
	}

	baseDomain := os.Getenv("BASE_DOMAIN")
	if baseDomain == "" {
		baseDomain = "ispsync.id"
	}

	log.Printf("[ISPSYNC CORE] Starting SaaS Multi-Tenant Engine on port %s...", port)
	log.Printf("[ISPSYNC CORE] Base SaaS Domain: %s", baseDomain)
	log.Printf("[ISPSYNC CORE] Database File: %s", dbPath)

	// 1. Inisialisasi Database SQLite Multi-Tenant
	store, err := repository.NewSQLiteStorage(dbPath)
	if err != nil {
		log.Fatalf("Fatal: Gagal inisialisasi database: %v", err)
	}
	defer store.Close()

	// 2. Inisialisasi Handlers
	apiH := handler.NewAPIHandler(store)
	pageH := handler.NewPageHandler(store)

	// 3. Router Setup
	r := chi.NewRouter()

	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.Timeout(60 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Tenant-Slug"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Multi-Tenant Context Middleware
	r.Use(middleware.TenantResolver(store, baseDomain))

	// API Endpoints
	r.Route("/api/v1", func(api chi.Router) {
		// Caddy On-Demand TLS Permission Verification Hook
		api.Get("/caddy/ask", apiH.CaddyAsk)

		api.Get("/context", apiH.GetContext)
		api.Post("/tenant/custom-domain", apiH.UpdateCustomDomain)
		api.Get("/plans", apiH.ListPlans)
		api.Get("/odps", apiH.ListODPs)
		api.Get("/olts", apiH.ListOLTs)
		api.Post("/coverage-check", apiH.CheckCoverage)
		api.Post("/register", apiH.Register)

		// Invoices & Billing
		api.Get("/invoices", apiH.ListInvoices)
		api.Post("/invoices/{id}/pay", apiH.PayInvoice)

		// Vouchers & Hotspot POS Blanko
		api.Get("/vouchers", apiH.ListVouchers)
		api.Post("/vouchers/generate", apiH.GenerateVouchers)

		// Subscriber Management
		api.Get("/subscribers", apiH.ListSubscribers)
		api.Get("/subscribers/{id}", apiH.GetSubscriber)
		api.Post("/subscribers/{id}/status", apiH.UpdateSubscriberStatus)
		api.Post("/subscribers/{id}/provision", apiH.ProvisionSubscriber)

		// Work Orders / SPK & BAST
		api.Get("/work-orders", apiH.ListWorkOrders)
		api.Post("/work-orders/{id}/bast", apiH.CompleteBAST)

		// Jartaplok Sharing Agreements
		api.Get("/jartaplok/agreements", apiH.ListJartaplokAgreements)

		// ── GOGIGANET PORTAL COMPATIBLE SUB-ROUTES ─────────
		api.Route("/public", func(pub chi.Router) {
			pub.Post("/coverage-check", apiH.PublicCoverageCheck)
			pub.Get("/plans", apiH.PublicPlans)
			pub.Post("/register", apiH.PublicRegister)
			pub.Get("/odps", apiH.PublicODPs)
			pub.Get("/clusters", apiH.PublicClusters)
			pub.Get("/track/{regNo}", apiH.PublicTrack)
			pub.Post("/track/{regNo}/ktp", apiH.PublicTrackKTP)
			pub.Post("/track/{regNo}/sign-contract", apiH.PublicTrackSignContract)
			pub.Get("/referral/check", apiH.PublicReferralCheck)
		})

		api.Route("/auth", func(a chi.Router) {
			a.Post("/login", apiH.AuthLogin)
			a.Get("/me", apiH.AuthMe)
			a.Post("/logout", apiH.AuthLogout)
		})

		api.Route("/admin", func(adm chi.Router) {
			adm.Get("/registrations", apiH.AdminListRegistrations)
			adm.Get("/odps", apiH.AdminListODPs)
			adm.Post("/odps", apiH.AdminCreateODP)
			adm.Delete("/odps/{id}", apiH.AdminDeleteODP)
			adm.Post("/odps/{id}/delete", apiH.AdminDeleteODP)
			adm.Get("/work-orders", apiH.AdminListWorkOrders)
			adm.Get("/clusters", apiH.AdminListClusters)
			adm.Get("/staff-kpi", apiH.AdminStaffKPI)
			adm.Get("/radius/live-sessions", apiH.AdminRadiusLiveSessions)
		})

		api.Route("/technician", func(tech chi.Router) {
			tech.Get("/work-orders", apiH.TechnicianListWorkOrders)
			tech.Get("/work-orders/{id}", apiH.TechnicianGetWorkOrder)
			tech.Post("/work-orders/{id}/bast", apiH.TechnicianCompleteBAST)
		})

		api.Route("/partner", func(part chi.Router) {
			part.Route("/jartaplok", func(j chi.Router) {
				j.Get("/billing", apiH.JartaplokBilling)
				j.Get("/odps", apiH.JartaplokODPs)
				j.Get("/ports", apiH.JartaplokPorts)
			})
			part.Get("/registrations", apiH.AdminListRegistrations)
		})

		api.Route("/superuser", func(sup chi.Router) {
			sup.Get("/overview", apiH.SuperuserOverview)
			sup.Get("/jartaplok-partners", apiH.SuperuserJartaplokPartners)
		})
	})

	// Static Assets (Logo, Documents, Web files)
	r.Get("/logo.png", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "web/logo.png")
	})
	r.Get("/FORM_SCORECARD_EVALUASI_KPI_BULANAN_GOGIGANET.pdf", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "web/FORM_SCORECARD_EVALUASI_KPI_BULANAN_GOGIGANET.pdf")
	})
	r.Get("/MASTER_SOP_EKOSISTEM_3_ENGINE_GOGIGANET.pdf", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "web/MASTER_SOP_EKOSISTEM_3_ENGINE_GOGIGANET.pdf")
	})
	r.Get("/MATRIKS_TUGAS_DAN_TANGGUNG_JAWAB_SDM_GOGIGANET.pdf", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "web/MATRIKS_TUGAS_DAN_TANGGUNG_JAWAB_SDM_GOGIGANET.pdf")
	})
	r.Get("/PROSEDUR_PENDAFTARAN_PELANGGAN_BARU.pdf", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "web/PROSEDUR_PENDAFTARAN_PELANGGAN_BARU.pdf")
	})
	r.Get("/SOP_OPERASIONAL_LENGKAP_GOGIGANET.pdf", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "web/SOP_OPERASIONAL_LENGKAP_GOGIGANET.pdf")
	})
	r.Handle("/web/*", http.StripPrefix("/web/", http.FileServer(http.Dir("web"))))

	// Web UI Multi-Tenant (CMS, Portal, NOC, Sales, Teknisi)
	r.Get("/*", pageH.ServeApp)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[ISPSYNC CORE] Server listening on http://localhost:%s", port)
		log.Printf("[ISPSYNC CORE] Testing link: http://localhost:%s/?tenant=ispku&app=cms", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[ISPSYNC CORE] Shutting down gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
	log.Println("[ISPSYNC CORE] Stopped.")
}
