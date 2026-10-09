package settings

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gigabill/isp/internal/notification/providers/whatsapp"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
)

type Service struct {
	repo   *Repository
	logger *slog.Logger
}

func NewService(repo *Repository, logger *slog.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice Template
// ─────────────────────────────────────────────────────────────────────────────

func (s *Service) GetInvoiceTemplate(ctx context.Context, tenantSlug ...string) (*InvoiceTemplateSettings, error) {
	return s.repo.GetInvoiceTemplate(ctx, tenantSlug...)
}

func (s *Service) UpdateInvoiceTemplate(ctx context.Context, tenantSlug string, input InvoiceTemplateSettings) (*InvoiceTemplateSettings, error) {
	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	if input.BrandName == "" {
		if slug != "" && slug != "dev" {
			input.BrandName = strings.ToUpper(slug)
		} else {
			input.BrandName = "ISPSYNC"
		}
	}
	if input.CompanyName == "" {
		if slug != "" && slug != "dev" {
			input.CompanyName = "PT " + strings.ToUpper(slug) + " Data Nusantara"
		} else {
			input.CompanyName = "PT Inovasi Sistem Pintar"
		}
	}
	if input.AccentColor == "" {
		input.AccentColor = "#06b6d4"
	}

	if err := s.repo.SaveInvoiceTemplate(ctx, slug, &input); err != nil {
		return nil, err
	}
	return s.repo.GetInvoiceTemplate(ctx, slug)
}

// ─────────────────────────────────────────────────────────────────────────────
// Billing Addons
// ─────────────────────────────────────────────────────────────────────────────

func (s *Service) GetBillingAddons(ctx context.Context, tenantSlug ...string) (*BillingAddonSettings, error) {
	return s.repo.GetBillingAddonSettings(ctx, tenantSlug...)
}

func (s *Service) UpdateBillingAddons(ctx context.Context, tenantSlug string, input BillingAddonSettings) (*BillingAddonSettings, error) {
	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	if input.PublicIPDescription == "" {
		input.PublicIPDescription = "Sewa Add-on IP Publik Statik"
	}
	if input.PublicIPMonthlyPrice < 0 {
		input.PublicIPMonthlyPrice = 0
	}
	if err := s.repo.SaveBillingAddonSettings(ctx, slug, &input); err != nil {
		return nil, err
	}
	return s.repo.GetBillingAddonSettings(ctx, slug)
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Settings
// ─────────────────────────────────────────────────────────────────────────────

func (s *Service) GetSecuritySettings(ctx context.Context, tenantSlug ...string) (*SecuritySettings, error) {
	return s.repo.GetSecuritySettings(ctx, tenantSlug...)
}

func (s *Service) UpdateSecuritySettings(ctx context.Context, tenantSlug string, input SecuritySettings) (*SecuritySettings, error) {
	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	if input.JWTExpiryHours <= 0 {
		input.JWTExpiryHours = 8
	}
	if input.AllowedNOCSubnets == "" {
		input.AllowedNOCSubnets = "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1/32"
	}
	if input.WalledGardenHosts == "" {
		input.WalledGardenHosts = "ledger.ispsync.id, nexus.ispsync.id, fibergrid.ispsync.id, api.midtrans.com, app.midtrans.com"
	}
	if strings.TrimSpace(input.GoogleMapsAPIKey) == "" {
		input.GoogleMapsAPIKey = DefaultSecuritySettings().GoogleMapsAPIKey
	}

	if err := s.repo.SaveSecuritySettings(ctx, slug, &input); err != nil {
		return nil, err
	}
	return s.repo.GetSecuritySettings(ctx, slug)
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Gateway Settings
// ─────────────────────────────────────────────────────────────────────────────

func (s *Service) GetPaymentGatewaySettings(ctx context.Context, tenantSlug ...string) (*PaymentGatewaySettings, error) {
	return s.repo.GetPaymentGatewaySettings(ctx, tenantSlug...)
}

func (s *Service) UpdatePaymentGatewaySettings(ctx context.Context, tenantSlug string, input PaymentGatewaySettings) (*PaymentGatewaySettings, error) {
	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	if input.PPPoEProvider == "" {
		input.PPPoEProvider = "midtrans"
	}
	if input.VoucherProvider == "" {
		input.VoucherProvider = "duitku"
	}
	if input.PasspointProvider == "" {
		input.PasspointProvider = "duitku"
	}
	if input.MidtransEnv == "" {
		input.MidtransEnv = "sandbox"
	}
	if input.DuitkuEnv == "" {
		input.DuitkuEnv = "sandbox"
	}

	if err := s.repo.SavePaymentGatewaySettings(ctx, slug, &input); err != nil {
		return nil, err
	}
	return s.repo.GetPaymentGatewaySettings(ctx, slug)
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Settings
// ─────────────────────────────────────────────────────────────────────────────

func (s *Service) GetDomainSettings(ctx context.Context, tenantSlug ...string) (*DomainSettings, error) {
	return s.repo.GetDomainSettings(ctx, tenantSlug...)
}

func (s *Service) UpdateDomainSettings(ctx context.Context, tenantSlug string, input DomainSettings) (*DomainSettings, error) {
	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	if input.PrimaryDomain == "" {
		input.PrimaryDomain = "ispsync.id"
	}
	if input.LedgerDomain == "" {
		if slug != "" && slug != "dev" {
			input.LedgerDomain = "ledger." + slug + ".ispsync.id"
		} else {
			input.LedgerDomain = "ledger.dev.ispsync.id"
		}
	}
	if input.WifiDomain == "" {
		if slug != "" && slug != "dev" {
			input.WifiDomain = "wifi." + slug + ".ispsync.id"
		} else {
			input.WifiDomain = "wifi.dev.ispsync.id"
		}
	}
	if input.WifiBrandName == "" {
		if slug != "" && slug != "dev" {
			input.WifiBrandName = "@" + slug
		} else {
			input.WifiBrandName = "@gowifi"
		}
	}
	if input.ServerIP == "" {
		input.ServerIP = "103.179.65.73"
	}

	if err := s.repo.SaveDomainSettings(ctx, slug, &input); err != nil {
		return nil, err
	}
	return s.repo.GetDomainSettings(ctx, slug)
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification Settings & WhatsApp Test
// ─────────────────────────────────────────────────────────────────────────────

func (s *Service) GetNotificationSettings(ctx context.Context, tenantSlug ...string) (*NotificationSettings, error) {
	return s.repo.GetNotificationSettings(ctx, tenantSlug...)
}

func (s *Service) UpdateNotificationSettings(ctx context.Context, tenantSlug string, input NotificationSettings) (*NotificationSettings, error) {
	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	if input.WAProvider == "" {
		input.WAProvider = "FONNTE"
	}
	if input.WAServerURL == "" {
		input.WAServerURL = "https://api.wablas.com"
	}
	if input.SMTPPort <= 0 {
		input.SMTPPort = 587
	}

	if err := s.repo.SaveNotificationSettings(ctx, slug, &input); err != nil {
		return nil, err
	}
	return s.repo.GetNotificationSettings(ctx, slug)
}

func (s *Service) TestWhatsApp(ctx context.Context, tenantSlug string, input TestWhatsAppRequest) error {
	recipient := strings.TrimSpace(input.Recipient)
	if recipient == "" {
		return apperrors.BadRequest("Nomor WhatsApp tujuan uji coba wajib diisi")
	}

	saved, err := s.repo.GetNotificationSettings(ctx, tenantSlug)
	if err != nil && saved == nil {
		def := DefaultNotificationSettings()
		saved = &def
	}

	provider := strings.ToUpper(strings.TrimSpace(input.Provider))
	if provider == "" {
		provider = saved.WAProvider
	}
	if provider == "" {
		provider = "WABLAS"
	}

	apiToken := strings.TrimSpace(input.APIToken)
	if apiToken == "" {
		apiToken = saved.WAApiToken
	}
	if apiToken == "" {
		return apperrors.BadRequest("Token API WhatsApp wajib diisi atau disimpan terlebih dahulu")
	}

	serverURL := strings.TrimSpace(input.ServerURL)
	if serverURL == "" {
		serverURL = saved.WAServerURL
	}
	if serverURL == "" {
		serverURL = "https://api.wablas.com"
	}

	messageText := input.Message
	if strings.TrimSpace(messageText) == "" {
		nowStr := time.Now().Format("02-01-2006 15:04:05")
		brand := "ISPSYNC"
		if tenantSlug != "" && tenantSlug != "dev" {
			brand = strings.ToUpper(tenantSlug)
		}
		messageText = fmt.Sprintf("[%s Gateway Test]\n\nKonfigurasi WhatsApp Gateway berhasil terhubung ke server %s.\n\nProvider: %s\nTarget: %s\nWaktu Uji: %s WIB\nStatus: Terverifikasi Aktif", brand, brand, provider, recipient, nowStr)
	}

	switch provider {
	case "WABLAS":
		wbProvider := whatsapp.NewWablasProvider(apiToken, serverURL)
		if err := wbProvider.Send(ctx, recipient, "", messageText); err != nil {
			s.logger.Error("wablas test failed", "recipient", recipient, "error", err)
			return apperrors.BadRequest(fmt.Sprintf("Wablas API error: %v", err))
		}
	case "FONNTE":
		fnProvider := whatsapp.NewProvider(apiToken)
		if err := fnProvider.Send(ctx, recipient, "", messageText); err != nil {
			s.logger.Error("fonnte test failed", "recipient", recipient, "error", err)
			return apperrors.BadRequest(fmt.Sprintf("Fonnte API error: %v", err))
		}
	default:
		return apperrors.BadRequest(fmt.Sprintf("Provider WhatsApp '%s' tidak didukung untuk uji coba", provider))
	}

	s.logger.Info("whatsapp test message sent successfully", "provider", provider, "recipient", recipient)
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// FiberGrid Settings & Connection Test
// ─────────────────────────────────────────────────────────────────────────────

func (s *Service) GetFiberGridSettings(ctx context.Context, tenantSlug string) (*FiberGridIntegrationSettings, error) {
	return s.repo.GetFiberGridSettings(ctx, tenantSlug)
}

func (s *Service) UpdateFiberGridSettings(ctx context.Context, tenantSlug string, input FiberGridIntegrationSettings) (*FiberGridIntegrationSettings, error) {
	if err := s.repo.SaveFiberGridSettings(ctx, tenantSlug, &input); err != nil {
		return nil, err
	}
	return s.repo.GetFiberGridSettings(ctx, tenantSlug)
}

func (s *Service) TestFiberGridConnection(ctx context.Context, req TestFiberGridRequest) (*TestFiberGridResponse, error) {
	apiURL := strings.TrimSpace(req.APIURL)
	if apiURL == "" {
		return nil, apperrors.BadRequest("URL API FiberGrid wajib diisi")
	}

	start := time.Now()
	testEndpoint := strings.TrimRight(apiURL, "/") + "/api/v1/fttx/routes"
	httpReq, err := http.NewRequestWithContext(ctx, "GET", testEndpoint, nil)
	if err != nil {
		return nil, apperrors.BadRequest(fmt.Sprintf("Format URL tidak valid: %v", err))
	}

	if req.APIKey != "" {
		httpReq.Header.Set("X-Admin-Key", req.APIKey)
		httpReq.Header.Set("Authorization", "Bearer "+req.APIKey)
	}
	if req.TenantCode != "" {
		httpReq.Header.Set("X-Tenant-Slug", req.TenantCode)
	}

	client := &http.Client{Timeout: 4 * time.Second}
	resp, err := client.Do(httpReq)
	latency := float64(time.Since(start).Microseconds()) / 1000.0
	if err != nil {
		return &TestFiberGridResponse{
			Success:   false,
			Message:   fmt.Sprintf("Gagal terhubung ke host FiberGrid (%s): %v", apiURL, err),
			LatencyMs: latency,
		}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return &TestFiberGridResponse{
			Success:   false,
			Message:   "Koneksi berhasil tetapi ditolak: API Key atau Secret Token salah (Unauthorized)",
			LatencyMs: latency,
		}, nil
	}

	if resp.StatusCode != http.StatusOK {
		return &TestFiberGridResponse{
			Success:   false,
			Message:   fmt.Sprintf("Server FiberGrid merespon dengan status error HTTP %d", resp.StatusCode),
			LatencyMs: latency,
		}, nil
	}

	var parsed struct {
		Success bool  `json:"success"`
		Data    []any `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&parsed)

	routesCount := len(parsed.Data)
	return &TestFiberGridResponse{
		Success:     true,
		Message:     fmt.Sprintf("Koneksi berhasil terhubung ke Engine FiberGrid! Ditemukan %d rute kabel fisik aktif.", routesCount),
		LatencyMs:   latency,
		RoutesCount: routesCount,
	}, nil
}
