package settings

import (
	"context"
	"fmt"
	"log/slog"
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

func (s *Service) GetInvoiceTemplate(ctx context.Context) (*InvoiceTemplateSettings, error) {
	return s.repo.GetInvoiceTemplate(ctx)
}

func (s *Service) UpdateInvoiceTemplate(ctx context.Context, input InvoiceTemplateSettings) (*InvoiceTemplateSettings, error) {
	if input.BrandName == "" {
		input.BrandName = "ISPSYNC"
	}
	if input.CompanyName == "" {
		input.CompanyName = "PT Inovasi Sistem Pintar"
	}
	if input.AccentColor == "" {
		input.AccentColor = "#2563eb"
	}

	if err := s.repo.SaveInvoiceTemplate(ctx, &input); err != nil {
		return nil, err
	}
	return s.repo.GetInvoiceTemplate(ctx)
}

func (s *Service) GetBillingAddons(ctx context.Context) (*BillingAddonSettings, error) {
	return s.repo.GetBillingAddonSettings(ctx)
}

func (s *Service) UpdateBillingAddons(ctx context.Context, input BillingAddonSettings) (*BillingAddonSettings, error) {
	if input.PublicIPDescription == "" {
		input.PublicIPDescription = "Sewa Add-on IP Publik Statik"
	}
	if input.PublicIPMonthlyPrice < 0 {
		input.PublicIPMonthlyPrice = 0
	}
	if err := s.repo.SaveBillingAddonSettings(ctx, &input); err != nil {
		return nil, err
	}
	return s.repo.GetBillingAddonSettings(ctx)
}

func (s *Service) GetSecuritySettings(ctx context.Context) (*SecuritySettings, error) {
	return s.repo.GetSecuritySettings(ctx)
}

func (s *Service) UpdateSecuritySettings(ctx context.Context, input SecuritySettings) (*SecuritySettings, error) {
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

	if err := s.repo.SaveSecuritySettings(ctx, &input); err != nil {
		return nil, err
	}
	return s.repo.GetSecuritySettings(ctx)
}

func (s *Service) GetPaymentGatewaySettings(ctx context.Context) (*PaymentGatewaySettings, error) {
	return s.repo.GetPaymentGatewaySettings(ctx)
}

func (s *Service) UpdatePaymentGatewaySettings(ctx context.Context, input PaymentGatewaySettings) (*PaymentGatewaySettings, error) {
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

	if err := s.repo.SavePaymentGatewaySettings(ctx, &input); err != nil {
		return nil, err
	}
	return s.repo.GetPaymentGatewaySettings(ctx)
}

func (s *Service) GetDomainSettings(ctx context.Context) (*DomainSettings, error) {
	return s.repo.GetDomainSettings(ctx)
}

func (s *Service) UpdateDomainSettings(ctx context.Context, input DomainSettings) (*DomainSettings, error) {
	if input.PrimaryDomain == "" {
		input.PrimaryDomain = "gogiga.net.id"
	}
	if input.LedgerDomain == "" {
		input.LedgerDomain = "ledger.dev.ispsync.id"
	}
	if input.WifiDomain == "" {
		input.WifiDomain = "wifi.dev.ispsync.id"
	}
	if input.WifiBrandName == "" {
		input.WifiBrandName = "@gowifi"
	}
	if input.ServerIP == "" {
		input.ServerIP = "103.179.65.73"
	}

	if err := s.repo.SaveDomainSettings(ctx, &input); err != nil {
		return nil, err
	}
	return s.repo.GetDomainSettings(ctx)
}

func (s *Service) GetNotificationSettings(ctx context.Context) (*NotificationSettings, error) {
	return s.repo.GetNotificationSettings(ctx)
}

func (s *Service) UpdateNotificationSettings(ctx context.Context, input NotificationSettings) (*NotificationSettings, error) {
	if input.WAProvider == "" {
		input.WAProvider = "FONNTE"
	}
	if input.WAServerURL == "" {
		input.WAServerURL = "https://api.wablas.com"
	}
	if input.SMTPPort <= 0 {
		input.SMTPPort = 587
	}

	if err := s.repo.SaveNotificationSettings(ctx, &input); err != nil {
		return nil, err
	}
	return s.repo.GetNotificationSettings(ctx)
}

func (s *Service) TestWhatsApp(ctx context.Context, input TestWhatsAppRequest) error {
	recipient := strings.TrimSpace(input.Recipient)
	if recipient == "" {
		return apperrors.BadRequest("Nomor WhatsApp tujuan uji coba wajib diisi")
	}

	saved, err := s.repo.GetNotificationSettings(ctx)
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
		messageText = fmt.Sprintf("[ISPSYNC Gateway Test]\n\nKonfigurasi WhatsApp Gateway berhasil terhubung ke server ISPSYNC.\n\nProvider: %s\nTarget: %s\nWaktu Uji: %s WIB\nStatus: Terverifikasi Aktif", provider, recipient, nowStr)
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



