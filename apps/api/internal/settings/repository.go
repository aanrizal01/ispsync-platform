package settings

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetInvoiceTemplate(ctx context.Context) (*InvoiceTemplateSettings, error) {
	const query = `SELECT value, updated_at FROM app_settings WHERE key = 'invoice_template'`
	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, query).Scan(&valBytes, &updatedAt)
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

	// Backward compatibility: ensure BankAccounts has at least the primary bank if set
	if len(s.BankAccounts) == 0 && s.BankName != "" {
		s.BankAccounts = []BankAccountItem{
			{
				BankName:          s.BankName,
				BankAccountNumber: s.BankAccountNumber,
				BankAccountHolder: s.BankAccountHolder,
			},
		}
	}

	return &s, nil
}

func (r *Repository) SaveInvoiceTemplate(ctx context.Context, s *InvoiceTemplateSettings) error {
	// Sync primary fields from the first bank account
	if len(s.BankAccounts) > 0 {
		s.BankName = s.BankAccounts[0].BankName
		s.BankAccountNumber = s.BankAccounts[0].BankAccountNumber
		s.BankAccountHolder = s.BankAccounts[0].BankAccountHolder
	}

	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ('invoice_template', $1, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, valBytes)
	return err
}

func (r *Repository) GetBillingAddonSettings(ctx context.Context) (*BillingAddonSettings, error) {
	const query = `SELECT value, updated_at FROM app_settings WHERE key = 'billing_addons'`
	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, query).Scan(&valBytes, &updatedAt)
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

func (r *Repository) SaveBillingAddonSettings(ctx context.Context, s *BillingAddonSettings) error {
	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ('billing_addons', $1, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, valBytes)
	return err
}

func (r *Repository) GetSecuritySettings(ctx context.Context) (*SecuritySettings, error) {
	const query = `SELECT value, updated_at FROM app_settings WHERE key = 'security_settings'`
	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, query).Scan(&valBytes, &updatedAt)
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

func (r *Repository) SaveSecuritySettings(ctx context.Context, s *SecuritySettings) error {
	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ('security_settings', $1, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, valBytes)
	return err
}

func (r *Repository) GetPaymentGatewaySettings(ctx context.Context) (*PaymentGatewaySettings, error) {
	const query = `SELECT value, updated_at FROM app_settings WHERE key = 'payment_gateway'`
	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, query).Scan(&valBytes, &updatedAt)
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

	// Fallback to environment variables if empty in database
	if s.MidtransServerKey == "" {
		s.MidtransServerKey = os.Getenv("MIDTRANS_SERVER_KEY")
	}
	if s.MidtransClientKey == "" {
		s.MidtransClientKey = os.Getenv("MIDTRANS_CLIENT_KEY")
	}
	if s.MidtransMerchantID == "" {
		s.MidtransMerchantID = os.Getenv("MIDTRANS_MERCHANT_ID")
	}
	if s.MidtransEnv == "" {
		s.MidtransEnv = os.Getenv("MIDTRANS_ENV")
		if s.MidtransEnv == "" {
			s.MidtransEnv = "production"
		}
	}

	s.UpdatedAt = updatedAt
	return &s, nil
}

func (r *Repository) SavePaymentGatewaySettings(ctx context.Context, s *PaymentGatewaySettings) error {
	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ('payment_gateway', $1, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, valBytes)
	return err
}

func (r *Repository) GetDomainSettings(ctx context.Context) (*DomainSettings, error) {
	const query = `SELECT value, updated_at FROM app_settings WHERE key = 'domain_settings'`
	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, query).Scan(&valBytes, &updatedAt)
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

func (r *Repository) SaveDomainSettings(ctx context.Context, s *DomainSettings) error {
	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ('domain_settings', $1, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, valBytes)
	return err
}

func (r *Repository) GetNotificationSettings(ctx context.Context) (*NotificationSettings, error) {
	const query = `SELECT value, updated_at FROM app_settings WHERE key = 'notification_settings'`
	var valBytes []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, query).Scan(&valBytes, &updatedAt)
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

func (r *Repository) SaveNotificationSettings(ctx context.Context, s *NotificationSettings) error {
	valBytes, err := json.Marshal(s)
	if err != nil {
		return err
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ('notification_settings', $1, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err = r.db.Exec(ctx, query, valBytes)
	return err
}



