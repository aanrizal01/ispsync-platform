package settings

import (
	"context"
	"log/slog"
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


