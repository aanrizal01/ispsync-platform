package settings

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gigabill/isp/internal/auth"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func resolveTenantSlugFromContext(ctx context.Context) string {
	claims := auth.ClaimsFromContext(ctx)
	if claims != nil {
		if claims.TenantSlug != "" {
			return strings.ToLower(claims.TenantSlug)
		}
		if claims.Email != "" {
			email := strings.ToLower(claims.Email)
			if atIdx := strings.Index(email, "@"); atIdx != -1 {
				domainPart := email[atIdx+1:]
				parts := strings.Split(domainPart, ".")
				if len(parts) >= 3 && parts[len(parts)-2] == "ispsync" && parts[len(parts)-1] == "id" {
					slug := parts[0]
					if slug != "admin" && slug != "private" && slug != "member" {
						return slug
					}
				}
			}
		}
	}
	return "dev"
}

func ensureBankAccounts(s *InvoiceTemplateSettings) {
	if len(s.BankAccounts) == 0 && s.BankName != "" {
		s.BankAccounts = []BankAccountItem{
			{
				BankName:          s.BankName,
				BankAccountNumber: s.BankAccountNumber,
				BankAccountHolder: s.BankAccountHolder,
			},
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice Template Settings (Tenant-Scoped)
// ─────────────────────────────────────────────────────────────────────────────

func (r *Repository) GetInvoiceTemplate(ctx context.Context, tenantSlug ...string) (*InvoiceTemplateSettings, error) {
	slug := ""
	if len(tenantSlug) > 0 {
		slug = strings.ToLower(strings.TrimSpace(tenantSlug[0]))
	}
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	if slug == "" || slug == "dev" {
		var valBytes []byte
		var updatedAt time.Time
		err := r.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = 'invoice_template_dev'").Scan(&valBytes, &updatedAt)
		if err != nil && errors.Is(err, pgx.ErrNoRows) {
			err = r.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = 'invoice_template'").Scan(&valBytes, &updatedAt)
		}
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				def := DefaultInvoiceTemplateSettings()
				return &def, nil
			}
			return nil, err
		}

		s := DefaultInvoiceTemplateSettings()
		if err := json.Unmarshal(valBytes, &s); err != nil {
			return nil, err
		}
		s.UpdatedAt = updatedAt
		ensureBankAccounts(&s)
		return &s, nil
	}

	// For specific non-dev tenant (e.g. gbd, ispku, ispmu)
	key := "invoice_template_" + slug
	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = $1", key).Scan(&valBytes, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			def := DefaultInvoiceTemplateSettingsForTenant(slug)
			return &def, nil
		}
		return nil, err
	}

	s := DefaultInvoiceTemplateSettingsForTenant(slug)
	if err := json.Unmarshal(valBytes, &s); err != nil {
		return nil, err
	}
	s.UpdatedAt = updatedAt
	ensureBankAccounts(&s)
	return &s, nil
}

func (r *Repository) SaveInvoiceTemplate(ctx context.Context, tenantSlug string, s *InvoiceTemplateSettings) error {
	if len(s.BankAccounts) > 0 {
		s.BankName = s.BankAccounts[0].BankName
		s.BankAccountNumber = s.BankAccounts[0].BankAccountNumber
		s.BankAccountHolder = s.BankAccounts[0].BankAccountHolder
	}

	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	if slug == "" || slug == "dev" {
		const query = `
			INSERT INTO app_settings (key, value, updated_at)
			VALUES ($1, $2, NOW())
			ON CONFLICT (key) DO UPDATE
			SET value = EXCLUDED.value, updated_at = NOW()
		`
		if _, err := r.db.Exec(ctx, query, "invoice_template_dev", valBytes); err != nil {
			return err
		}
		_, err = r.db.Exec(ctx, query, "invoice_template", valBytes)
		return err
	}

	key := "invoice_template_" + slug
	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, key, valBytes)
	return err
}

// ─────────────────────────────────────────────────────────────────────────────
// Billing Addon Settings (Tenant-Scoped)
// ─────────────────────────────────────────────────────────────────────────────

func (r *Repository) GetBillingAddonSettings(ctx context.Context, tenantSlug ...string) (*BillingAddonSettings, error) {
	slug := ""
	if len(tenantSlug) > 0 {
		slug = strings.ToLower(strings.TrimSpace(tenantSlug[0]))
	}
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	key := "billing_addons"
	if slug != "" && slug != "dev" {
		key = "billing_addons_" + slug
	}

	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = $1", key).Scan(&valBytes, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			def := DefaultBillingAddonSettings()
			return &def, nil
		}
		return nil, err
	}

	var s BillingAddonSettings
	if err := json.Unmarshal(valBytes, &s); err != nil {
		return nil, err
	}
	s.UpdatedAt = updatedAt
	return &s, nil
}

func (r *Repository) SaveBillingAddonSettings(ctx context.Context, tenantSlug string, s *BillingAddonSettings) error {
	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	key := "billing_addons"
	if slug != "" && slug != "dev" {
		key = "billing_addons_" + slug
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, key, valBytes)
	return err
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Settings (Tenant-Scoped)
// ─────────────────────────────────────────────────────────────────────────────

func (r *Repository) GetSecuritySettings(ctx context.Context, tenantSlug ...string) (*SecuritySettings, error) {
	slug := ""
	if len(tenantSlug) > 0 {
		slug = strings.ToLower(strings.TrimSpace(tenantSlug[0]))
	}
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	key := "security_settings"
	if slug != "" && slug != "dev" {
		key = "security_settings_" + slug
	}

	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = $1", key).Scan(&valBytes, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			def := DefaultSecuritySettings()
			return &def, nil
		}
		return nil, err
	}

	s := DefaultSecuritySettings()
	if err := json.Unmarshal(valBytes, &s); err != nil {
		return nil, err
	}
	s.UpdatedAt = updatedAt
	return &s, nil
}

func (r *Repository) SaveSecuritySettings(ctx context.Context, tenantSlug string, s *SecuritySettings) error {
	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	key := "security_settings"
	if slug != "" && slug != "dev" {
		key = "security_settings_" + slug
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, key, valBytes)
	return err
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Gateway Settings (Tenant-Scoped)
// ─────────────────────────────────────────────────────────────────────────────

func (r *Repository) GetPaymentGatewaySettings(ctx context.Context, tenantSlug ...string) (*PaymentGatewaySettings, error) {
	slug := ""
	if len(tenantSlug) > 0 {
		slug = strings.ToLower(strings.TrimSpace(tenantSlug[0]))
	}
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	key := "payment_gateway"
	if slug != "" && slug != "dev" {
		key = "payment_gateway_" + slug
	}

	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = $1", key).Scan(&valBytes, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			def := DefaultPaymentGatewaySettings()
			return &def, nil
		}
		return nil, err
	}

	s := DefaultPaymentGatewaySettings()
	if err := json.Unmarshal(valBytes, &s); err != nil {
		return nil, err
	}
	s.UpdatedAt = updatedAt
	return &s, nil
}

func (r *Repository) SavePaymentGatewaySettings(ctx context.Context, tenantSlug string, s *PaymentGatewaySettings) error {
	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	key := "payment_gateway"
	if slug != "" && slug != "dev" {
		key = "payment_gateway_" + slug
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, key, valBytes)
	return err
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Settings (Tenant-Scoped)
// ─────────────────────────────────────────────────────────────────────────────

func (r *Repository) GetDomainSettings(ctx context.Context, tenantSlug ...string) (*DomainSettings, error) {
	slug := ""
	if len(tenantSlug) > 0 {
		slug = strings.ToLower(strings.TrimSpace(tenantSlug[0]))
	}
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	if slug == "" || slug == "dev" {
		var valBytes []byte
		var updatedAt time.Time
		err := r.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = 'domain_settings_dev'").Scan(&valBytes, &updatedAt)
		if err != nil && errors.Is(err, pgx.ErrNoRows) {
			err = r.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = 'domain_settings'").Scan(&valBytes, &updatedAt)
		}
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				def := DefaultDomainSettings()
				return &def, nil
			}
			return nil, err
		}

		s := DefaultDomainSettings()
		if err := json.Unmarshal(valBytes, &s); err != nil {
			return nil, err
		}
		s.UpdatedAt = updatedAt
		return &s, nil
	}

	key := "domain_settings_" + slug
	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = $1", key).Scan(&valBytes, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			def := DefaultDomainSettingsForTenant(slug)
			return &def, nil
		}
		return nil, err
	}

	s := DefaultDomainSettingsForTenant(slug)
	if err := json.Unmarshal(valBytes, &s); err != nil {
		return nil, err
	}
	s.UpdatedAt = updatedAt
	return &s, nil
}

func (r *Repository) SaveDomainSettings(ctx context.Context, tenantSlug string, s *DomainSettings) error {
	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	if slug == "" || slug == "dev" {
		const query = `
			INSERT INTO app_settings (key, value, updated_at)
			VALUES ($1, $2, NOW())
			ON CONFLICT (key) DO UPDATE
			SET value = EXCLUDED.value, updated_at = NOW()
		`
		if _, err := r.db.Exec(ctx, query, "domain_settings_dev", valBytes); err != nil {
			return err
		}
		_, err = r.db.Exec(ctx, query, "domain_settings", valBytes)
		return err
	}

	key := "domain_settings_" + slug
	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, key, valBytes)
	return err
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification Settings (Tenant-Scoped)
// ─────────────────────────────────────────────────────────────────────────────

func (r *Repository) GetNotificationSettings(ctx context.Context, tenantSlug ...string) (*NotificationSettings, error) {
	slug := ""
	if len(tenantSlug) > 0 {
		slug = strings.ToLower(strings.TrimSpace(tenantSlug[0]))
	}
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	key := "notification_settings"
	if slug != "" && slug != "dev" {
		key = "notification_settings_" + slug
	}

	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = $1", key).Scan(&valBytes, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			def := DefaultNotificationSettings()
			return &def, nil
		}
		return nil, err
	}

	s := DefaultNotificationSettings()
	if err := json.Unmarshal(valBytes, &s); err != nil {
		return nil, err
	}
	s.UpdatedAt = updatedAt
	return &s, nil
}

func (r *Repository) SaveNotificationSettings(ctx context.Context, tenantSlug string, s *NotificationSettings) error {
	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	key := "notification_settings"
	if slug != "" && slug != "dev" {
		key = "notification_settings_" + slug
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, key, valBytes)
	return err
}

// ─────────────────────────────────────────────────────────────────────────────
// FiberGrid Integration Settings (Tenant-Scoped)
// ─────────────────────────────────────────────────────────────────────────────

func (r *Repository) GetFiberGridSettings(ctx context.Context, tenantSlug ...string) (*FiberGridIntegrationSettings, error) {
	slug := ""
	if len(tenantSlug) > 0 {
		slug = strings.ToLower(strings.TrimSpace(tenantSlug[0]))
	}
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	key := "fibergrid_integration"
	if slug != "" && slug != "dev" {
		key = "fibergrid_integration_" + slug
		var exists bool
		_ = r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM app_settings WHERE key = $1)", key).Scan(&exists)
		if !exists {
			def := DefaultFiberGridIntegrationSettings()
			def.TenantCode = slug
			return &def, nil
		}
	}

	const query = `SELECT value, updated_at FROM app_settings WHERE key = $1`
	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, query, key).Scan(&valBytes, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			def := DefaultFiberGridIntegrationSettings()
			if slug != "" && slug != "dev" {
				def.TenantCode = slug
			}
			return &def, nil
		}
		return nil, err
	}

	var s FiberGridIntegrationSettings
	if err := json.Unmarshal(valBytes, &s); err != nil {
		return nil, err
	}
	s.UpdatedAt = updatedAt
	return &s, nil
}

func (r *Repository) SaveFiberGridSettings(ctx context.Context, tenantSlug string, s *FiberGridIntegrationSettings) error {
	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	key := "fibergrid_integration"
	if slug != "" && slug != "dev" {
		key = "fibergrid_integration_" + slug
	}

	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, key, valBytes)
	return err
}
