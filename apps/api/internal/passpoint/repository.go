package passpoint

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateProfile(ctx context.Context, p *Profile) error {
	const q = `
		INSERT INTO passpoint_profiles (
			id, name, operator_friendly_name, domain_name, realm, roaming_consortium_ois,
			eap_method, inner_auth, venue_name, venue_group, venue_type, is_default, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
		)
	`
	_, err := r.db.Exec(ctx, q,
		p.ID, p.Name, p.OperatorFriendlyName, p.DomainName, p.Realm, p.RoamingConsortiumOIs,
		p.EAPMethod, p.InnerAuth, p.VenueName, p.VenueGroup, p.VenueType, p.IsDefault, p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func (r *Repository) GetProfileByID(ctx context.Context, id uuid.UUID) (*Profile, error) {
	const q = `
		SELECT id, name, operator_friendly_name, domain_name, realm, roaming_consortium_ois,
		       eap_method, inner_auth, venue_name, venue_group, venue_type, is_default, created_at, updated_at
		FROM passpoint_profiles
		WHERE id = $1
	`
	var p Profile
	err := r.db.QueryRow(ctx, q, id).Scan(
		&p.ID, &p.Name, &p.OperatorFriendlyName, &p.DomainName, &p.Realm, &p.RoamingConsortiumOIs,
		&p.EAPMethod, &p.InnerAuth, &p.VenueName, &p.VenueGroup, &p.VenueType, &p.IsDefault, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("query profile by id: %w", err)
	}
	return &p, nil
}

func (r *Repository) GetDefaultProfile(ctx context.Context) (*Profile, error) {
	const q = `
		SELECT id, name, operator_friendly_name, domain_name, realm, roaming_consortium_ois,
		       eap_method, inner_auth, venue_name, venue_group, venue_type, is_default, created_at, updated_at
		FROM passpoint_profiles
		WHERE is_default = TRUE
		LIMIT 1
	`
	var p Profile
	err := r.db.QueryRow(ctx, q).Scan(
		&p.ID, &p.Name, &p.OperatorFriendlyName, &p.DomainName, &p.Realm, &p.RoamingConsortiumOIs,
		&p.EAPMethod, &p.InnerAuth, &p.VenueName, &p.VenueGroup, &p.VenueType, &p.IsDefault, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("query default profile: %w", err)
	}
	return &p, nil
}

func (r *Repository) ListProfiles(ctx context.Context) ([]Profile, error) {
	const q = `
		SELECT id, name, operator_friendly_name, domain_name, realm, roaming_consortium_ois,
		       eap_method, inner_auth, venue_name, venue_group, venue_type, is_default, created_at, updated_at
		FROM passpoint_profiles
		ORDER BY is_default DESC, name ASC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list profiles: %w", err)
	}
	defer rows.Close()

	var profiles []Profile
	for rows.Next() {
		var p Profile
		if err := rows.Scan(
			&p.ID, &p.Name, &p.OperatorFriendlyName, &p.DomainName, &p.Realm, &p.RoamingConsortiumOIs,
			&p.EAPMethod, &p.InnerAuth, &p.VenueName, &p.VenueGroup, &p.VenueType, &p.IsDefault, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan profile: %w", err)
		}
		profiles = append(profiles, p)
	}
	return profiles, nil
}

func (r *Repository) CreateCredential(ctx context.Context, c *Credential) error {
	const q = `
		INSERT INTO passpoint_credentials (
			id, customer_id, profile_id, username, password, status,
			last_authenticated_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		)
	`
	_, err := r.db.Exec(ctx, q,
		c.ID, c.CustomerID, c.ProfileID, c.Username, c.Password, c.Status,
		c.LastAuthenticatedAt, c.CreatedAt, c.UpdatedAt,
	)
	return err
}

func (r *Repository) GetCredentialByID(ctx context.Context, id uuid.UUID) (*Credential, error) {
	const q = `
		SELECT c.id, c.customer_id, cust.full_name, cust.customer_number, cust.phone,
		       c.profile_id, p.name, c.username, c.password, c.status,
		       c.last_authenticated_at, c.created_at, c.updated_at,
		       COALESCE(po.expires_at, c.created_at + INTERVAL '30 days') as expires_at,
		       COALESCE(po.package_name, 'Passpoint Standar') as package_name,
		       COALESCE(
		           CASE 
		               WHEN a.name IS NOT NULL THEN 'Agen ' || a.name || ' (' || a.code || ')'
		               WHEN po.paid_by_agent_id IS NOT NULL OR po.payment_method = 'MANUAL_COUNTER' THEN 'Loket Agen'
		               WHEN po.order_id IS NOT NULL THEN 'Online (Self-Service)'
		               ELSE 'Admin Sistem'
		           END, 'Admin Sistem'
		       ) AS issuer_name,
		       CASE 
		           WHEN a.name IS NOT NULL OR po.paid_by_agent_id IS NOT NULL OR po.payment_method = 'MANUAL_COUNTER' THEN 'AGENT'
		           WHEN po.order_id IS NOT NULL THEN 'ONLINE'
		           ELSE 'ADMIN'
		       END AS issuer_type
		FROM passpoint_credentials c
		JOIN customers cust ON cust.id = c.customer_id
		JOIN passpoint_profiles p ON p.id = c.profile_id
		LEFT JOIN LATERAL (
			SELECT po.expires_at, po.package_name, po.paid_by_agent_id, po.agent_id, po.payment_method, po.order_id
			FROM passpoint_orders po
			WHERE po.credential_id = c.id AND po.status = 'PAID'
			ORDER BY po.created_at DESC
			LIMIT 1
		) po ON true
		LEFT JOIN agents a ON a.id = COALESCE(po.paid_by_agent_id, po.agent_id)
		WHERE c.id = $1
	`
	var cred Credential
	err := r.db.QueryRow(ctx, q, id).Scan(
		&cred.ID, &cred.CustomerID, &cred.CustomerName, &cred.CustomerNumber, &cred.CustomerPhone,
		&cred.ProfileID, &cred.ProfileName, &cred.Username, &cred.Password, &cred.Status,
		&cred.LastAuthenticatedAt, &cred.CreatedAt, &cred.UpdatedAt,
		&cred.ExpiresAt, &cred.PackageName,
		&cred.IssuerName, &cred.IssuerType,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("query credential by id: %w", err)
	}
	return &cred, nil
}

func (r *Repository) ListCredentialsByCustomer(ctx context.Context, customerID uuid.UUID) ([]Credential, error) {
	const q = `
		SELECT c.id, c.customer_id, cust.full_name, cust.customer_number, cust.phone,
		       c.profile_id, p.name, c.username, c.password, c.status,
		       c.last_authenticated_at, c.created_at, c.updated_at,
		       COALESCE(po.expires_at, c.created_at + INTERVAL '30 days') as expires_at,
		       COALESCE(po.package_name, 'Passpoint Standar') as package_name,
		       COALESCE(
		           CASE 
		               WHEN a.name IS NOT NULL THEN 'Agen ' || a.name || ' (' || a.code || ')'
		               WHEN po.paid_by_agent_id IS NOT NULL OR po.payment_method = 'MANUAL_COUNTER' THEN 'Loket Agen'
		               WHEN po.order_id IS NOT NULL THEN 'Online (Self-Service)'
		               ELSE 'Admin Sistem'
		           END, 'Admin Sistem'
		       ) AS issuer_name,
		       CASE 
		           WHEN a.name IS NOT NULL OR po.paid_by_agent_id IS NOT NULL OR po.payment_method = 'MANUAL_COUNTER' THEN 'AGENT'
		           WHEN po.order_id IS NOT NULL THEN 'ONLINE'
		           ELSE 'ADMIN'
		       END AS issuer_type
		FROM passpoint_credentials c
		JOIN customers cust ON cust.id = c.customer_id
		JOIN passpoint_profiles p ON p.id = c.profile_id
		LEFT JOIN LATERAL (
			SELECT po.expires_at, po.package_name, po.paid_by_agent_id, po.agent_id, po.payment_method, po.order_id
			FROM passpoint_orders po
			WHERE po.credential_id = c.id AND po.status = 'PAID'
			ORDER BY po.created_at DESC
			LIMIT 1
		) po ON true
		LEFT JOIN agents a ON a.id = COALESCE(po.paid_by_agent_id, po.agent_id)
		WHERE c.customer_id = $1
		ORDER BY c.created_at DESC
	`
	rows, err := r.db.Query(ctx, q, customerID)
	if err != nil {
		return nil, fmt.Errorf("list customer credentials: %w", err)
	}
	defer rows.Close()

	var creds []Credential
	for rows.Next() {
		var cred Credential
		if err := rows.Scan(
			&cred.ID, &cred.CustomerID, &cred.CustomerName, &cred.CustomerNumber, &cred.CustomerPhone,
			&cred.ProfileID, &cred.ProfileName, &cred.Username, &cred.Password, &cred.Status,
			&cred.LastAuthenticatedAt, &cred.CreatedAt, &cred.UpdatedAt,
			&cred.ExpiresAt, &cred.PackageName,
			&cred.IssuerName, &cred.IssuerType,
		); err != nil {
			return nil, fmt.Errorf("scan credential: %w", err)
		}
		creds = append(creds, cred)
	}
	return creds, nil
}

func (r *Repository) ListCredentials(ctx context.Context, limit, offset int) ([]Credential, int64, error) {
	const countQ = `SELECT COUNT(*) FROM passpoint_credentials`
	var total int64
	if err := r.db.QueryRow(ctx, countQ).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count credentials: %w", err)
	}

	const q = `
		SELECT c.id, c.customer_id, cust.full_name, cust.customer_number, cust.phone,
		       c.profile_id, p.name, c.username, c.password, c.status,
		       c.last_authenticated_at, c.created_at, c.updated_at,
		       COALESCE(po.expires_at, c.created_at + INTERVAL '30 days') as expires_at,
		       COALESCE(po.package_name, 'Passpoint Standar') as package_name,
		       COALESCE(
		           CASE 
		               WHEN a.name IS NOT NULL THEN 'Agen ' || a.name || ' (' || a.code || ')'
		               WHEN po.paid_by_agent_id IS NOT NULL OR po.payment_method = 'MANUAL_COUNTER' THEN 'Loket Agen'
		               WHEN po.order_id IS NOT NULL THEN 'Online (Self-Service)'
		               ELSE 'Admin Sistem'
		           END, 'Admin Sistem'
		       ) AS issuer_name,
		       CASE 
		           WHEN a.name IS NOT NULL OR po.paid_by_agent_id IS NOT NULL OR po.payment_method = 'MANUAL_COUNTER' THEN 'AGENT'
		           WHEN po.order_id IS NOT NULL THEN 'ONLINE'
		           ELSE 'ADMIN'
		       END AS issuer_type
		FROM passpoint_credentials c
		JOIN customers cust ON cust.id = c.customer_id
		JOIN passpoint_profiles p ON p.id = c.profile_id
		LEFT JOIN LATERAL (
			SELECT po.expires_at, po.package_name, po.paid_by_agent_id, po.agent_id, po.payment_method, po.order_id
			FROM passpoint_orders po
			WHERE po.credential_id = c.id AND po.status = 'PAID'
			ORDER BY po.created_at DESC
			LIMIT 1
		) po ON true
		LEFT JOIN agents a ON a.id = COALESCE(po.paid_by_agent_id, po.agent_id)
		ORDER BY c.created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Query(ctx, q, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list credentials: %w", err)
	}
	defer rows.Close()

	var creds []Credential
	for rows.Next() {
		var cred Credential
		if err := rows.Scan(
			&cred.ID, &cred.CustomerID, &cred.CustomerName, &cred.CustomerNumber, &cred.CustomerPhone,
			&cred.ProfileID, &cred.ProfileName, &cred.Username, &cred.Password, &cred.Status,
			&cred.LastAuthenticatedAt, &cred.CreatedAt, &cred.UpdatedAt,
			&cred.ExpiresAt, &cred.PackageName,
			&cred.IssuerName, &cred.IssuerType,
		); err != nil {
			return nil, 0, fmt.Errorf("scan credential: %w", err)
		}
		creds = append(creds, cred)
	}
	return creds, total, nil
}

func (r *Repository) UpdateCredentialStatus(ctx context.Context, id uuid.UUID, status string) error {
	const q = `
		UPDATE passpoint_credentials
		SET status = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.db.Exec(ctx, q, status, id)
	return err
}

func (r *Repository) ValidateAgentReferral(ctx context.Context, code string) (uuid.UUID, string, float64, float64, error) {
	cleaned := strings.ToUpper(strings.TrimSpace(code))
	const promoQ = `
		SELECT a.id, a.name, a.online_discount_pct, a.online_cashback_pct
		FROM agents a
		LEFT JOIN agent_daily_promos p ON p.agent_id = a.id AND p.valid_date = CURRENT_DATE
		WHERE (UPPER(a.code) = $1 OR UPPER(p.promo_code) = $1) AND a.status = 'ACTIVE'
		ORDER BY (CASE WHEN UPPER(p.promo_code) = $1 THEN 1 ELSE 2 END)
		LIMIT 1
	`
	var aID uuid.UUID
	var aName string
	var discPct, cashPct float64
	err := r.db.QueryRow(ctx, promoQ, cleaned).Scan(&aID, &aName, &discPct, &cashPct)
	return aID, aName, discPct, cashPct, err
}

func (r *Repository) ResolveOrCreateCustomer(ctx context.Context, name, phone, email string) (uuid.UUID, error) {
	phone = strings.TrimSpace(phone)
	if phone != "" {
		var existingID uuid.UUID
		err := r.db.QueryRow(ctx, "SELECT id FROM customers WHERE phone = $1 LIMIT 1", phone).Scan(&existingID)
		if err == nil {
			return existingID, nil
		}
	}

	custID := uuid.New()
	var seqVal int64
	_ = r.db.QueryRow(ctx, "SELECT nextval('customer_number_seq')").Scan(&seqVal)
	if seqVal == 0 {
		seqVal = time.Now().Unix() % 100000
	}
	custNum := fmt.Sprintf("CUS-%d-%05d", time.Now().Year(), seqVal)

	if name == "" {
		name = "Pelanggan Passpoint"
		if phone != "" {
			name = fmt.Sprintf("Pelanggan (%s)", phone)
		}
	}

	const q = `
		INSERT INTO customers (id, customer_number, full_name, email, phone, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`
	_, err := r.db.Exec(ctx, q, custID, custNum, name, email, phone)
	if err != nil {
		return uuid.Nil, fmt.Errorf("create customer for passpoint: %w", err)
	}
	return custID, nil
}

func (r *Repository) CreateOrder(ctx context.Context, order *PasspointOrder) error {
	const q = `
		INSERT INTO passpoint_orders (
			id, order_id, cashier_code, order_type, package_id, package_name, duration_days,
			customer_name, customer_phone, customer_email, original_price, discount_amount,
			admin_fee, final_price, agent_id, promo_code, agent_commission, payment_method,
			status, expires_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17, $18,
			$19, $20, $21, $22
		)
	`
	_, err := r.db.Exec(ctx, q,
		order.ID, order.OrderID, order.CashierCode, order.OrderType, order.PackageID, order.PackageName, order.DurationDays,
		order.CustomerName, order.CustomerPhone, order.CustomerEmail, order.OriginalPrice, order.DiscountAmount,
		order.AdminFee, order.FinalPrice, order.AgentID, order.PromoCode, order.AgentCommission, order.PaymentMethod,
		order.Status, order.ExpiresAt, order.CreatedAt, order.UpdatedAt,
	)
	return err
}

func (r *Repository) GetOrderByOrderID(ctx context.Context, orderID string) (*PasspointOrder, error) {
	const q = `
		SELECT id, order_id, cashier_code, order_type, package_id, package_name, duration_days,
		       customer_name, customer_phone, customer_email, original_price, discount_amount,
		       admin_fee, final_price, agent_id, promo_code, agent_commission, payment_method,
		       status, credential_id, paid_by_agent_id, paid_at, expires_at, created_at, updated_at
		FROM passpoint_orders
		WHERE order_id = $1
		LIMIT 1
	`
	var o PasspointOrder
	err := r.db.QueryRow(ctx, q, orderID).Scan(
		&o.ID, &o.OrderID, &o.CashierCode, &o.OrderType, &o.PackageID, &o.PackageName, &o.DurationDays,
		&o.CustomerName, &o.CustomerPhone, &o.CustomerEmail, &o.OriginalPrice, &o.DiscountAmount,
		&o.AdminFee, &o.FinalPrice, &o.AgentID, &o.PromoCode, &o.AgentCommission, &o.PaymentMethod,
		&o.Status, &o.CredentialID, &o.PaidByAgentID, &o.PaidAt, &o.ExpiresAt, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &o, nil
}

func (r *Repository) InquireCashierOrder(ctx context.Context, code string, agentAdminFee int64) (*PasspointInquiryResult, error) {
	cleaned := strings.ToUpper(strings.TrimSpace(code))
	const q = `
		SELECT id, order_id, cashier_code, order_type, package_id, package_name, duration_days,
		       customer_name, customer_phone, original_price, discount_amount, final_price,
		       admin_fee, agent_commission, status, expires_at
		FROM passpoint_orders
		WHERE (cashier_code = $1 OR order_id = $1)
		LIMIT 1
	`
	var (
		id                                                    uuid.UUID
		orderID, cashierCode, orderType, packageID, packageName string
		durationDays                                          int
		customerName, customerPhone, status                   string
		originalPrice, discountAmount, finalPrice, adminFee, comm int64
		expiresAt                                             time.Time
	)

	err := r.db.QueryRow(ctx, q, cleaned).Scan(
		&id, &orderID, &cashierCode, &orderType, &packageID, &packageName, &durationDays,
		&customerName, &customerPhone, &originalPrice, &discountAmount, &finalPrice,
		&adminFee, &comm, &status, &expiresAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("kode pesanan kasir '%s' tidak ditemukan", cleaned)
		}
		return nil, fmt.Errorf("cari pesanan kasir: %w", err)
	}

	if status == "PAID" {
		return nil, fmt.Errorf("pesanan %s sudah lunas dibayar sebelumnya", cashierCode)
	}
	if status == "CANCELLED" || status == "EXPIRED" {
		return nil, fmt.Errorf("pesanan %s sudah tidak berlaku (%s)", cashierCode, status)
	}
	if time.Now().After(expiresAt) {
		return nil, fmt.Errorf("pesanan %s sudah kedaluwarsa", cashierCode)
	}

	if adminFee <= 0 {
		adminFee = agentAdminFee
		if adminFee <= 0 {
			adminFee = 2500
		}
	}

	if comm <= 0 {
		comm = int64(float64(originalPrice) * 0.10)
	}

	totalCust := finalPrice + adminFee
	debitAmount := finalPrice - comm
	if debitAmount < 0 {
		debitAmount = 0
	}
	agentProfit := comm + adminFee

	return &PasspointInquiryResult{
		OrderID:           orderID,
		CashierCode:       cashierCode,
		OrderType:         orderType,
		PackageID:         packageID,
		PackageName:       packageName,
		DurationDays:      durationDays,
		CustomerName:      customerName,
		CustomerPhone:     customerPhone,
		OriginalPrice:     originalPrice,
		DiscountAmount:    discountAmount,
		PackagePrice:      finalPrice,
		AdminFee:          adminFee,
		TotalCustomerPays: totalCust,
		AgentCommission:   comm,
		AgentDebitAmount:  debitAmount,
		AgentProfit:       agentProfit,
		Status:            status,
		ExpiresAt:         expiresAt.Format("02 Jan 2006, 15:04 WIB"),
	}, nil
}

func (r *Repository) PayOrderWithAgentBalance(
	ctx context.Context,
	agentID uuid.UUID,
	code string,
	prof *Profile,
	username, password string,
) (*PasspointReceipt, *Credential, error) {
	cleaned := strings.ToUpper(strings.TrimSpace(code))

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Lock and fetch order
	const orderQ = `
		SELECT id, order_id, cashier_code, order_type, package_id, package_name, duration_days,
		       customer_name, customer_phone, customer_email, original_price, discount_amount,
		       final_price, COALESCE(admin_fee, 2500), agent_commission, status, expires_at
		FROM passpoint_orders
		WHERE (cashier_code = $1 OR order_id = $1)
		FOR UPDATE
	`
	var (
		orderUUID                                            uuid.UUID
		orderID, cashierCode, orderType, packageID, packageName string
		durationDays                                         int
		customerName, customerPhone, customerEmail, status   string
		originalPrice, discountAmount, finalPrice, adminFee, comm int64
		expiresAt                                            time.Time
	)
	err = tx.QueryRow(ctx, orderQ, cleaned).Scan(
		&orderUUID, &orderID, &cashierCode, &orderType, &packageID, &packageName, &durationDays,
		&customerName, &customerPhone, &customerEmail, &originalPrice, &discountAmount,
		&finalPrice, &adminFee, &comm, &status, &expiresAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, fmt.Errorf("kode pesanan '%s' tidak ditemukan", cleaned)
		}
		return nil, nil, fmt.Errorf("query pesanan: %w", err)
	}

	if status == "PAID" {
		return nil, nil, errors.New("pesanan ini sudah lunas sebelumnya")
	}
	if time.Now().After(expiresAt) {
		return nil, nil, errors.New("pesanan ini sudah kedaluwarsa")
	}

	// 2. Lock and fetch agent
	const agentQ = `
		SELECT balance, code, name, COALESCE(loket_admin_fee, 2500), status
		FROM agents
		WHERE id = $1
		FOR UPDATE
	`
	var (
		agentBalance, agentAdminFee int64
		agentCode, agentName, agentStatus string
	)
	err = tx.QueryRow(ctx, agentQ, agentID).Scan(
		&agentBalance, &agentCode, &agentName, &agentAdminFee, &agentStatus,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("query agen: %w", err)
	}
	if agentStatus != "ACTIVE" {
		return nil, nil, errors.New("status akun agen tidak aktif")
	}

	if adminFee <= 0 {
		adminFee = agentAdminFee
	}
	if comm <= 0 {
		comm = int64(float64(originalPrice) * 0.10)
	}
	debitAmount := finalPrice - comm
	if debitAmount < 0 {
		debitAmount = 0
	}

	if agentBalance < debitAmount {
		return nil, nil, fmt.Errorf("saldo dompet agen tidak mencukupi (Perlu modal Rp %d, Saldo Anda Rp %d). Silakan isi saldo terlebih dahulu.", debitAmount, agentBalance)
	}

	// 3. Debit agent balance
	newBalance := agentBalance - debitAmount
	_, err = tx.Exec(ctx, "UPDATE agents SET balance = $1, updated_at = NOW() WHERE id = $2", newBalance, agentID)
	if err != nil {
		return nil, nil, fmt.Errorf("potong saldo agen: %w", err)
	}

	// 4. Record mutation
	mutDesc := fmt.Sprintf("Pembayaran Kasir Passpoint %s (%s - %s) Pelanggan %s", cashierCode, packageName, customerPhone, customerName)
	const mutQ = `
		INSERT INTO agent_balance_mutations (
			id, agent_id, mutation_type, amount, balance_before, balance_after,
			reference_id, description, created_at
		) VALUES (
			gen_random_uuid(), $1, 'PASSPOINT_COUNTER_PAY', $2, $3, $4,
			$5, $6, NOW()
		)
	`
	_, err = tx.Exec(ctx, mutQ, agentID, -debitAmount, agentBalance, newBalance, cashierCode, mutDesc)
	if err != nil {
		return nil, nil, fmt.Errorf("catat mutasi saldo: %w", err)
	}

	// 5. Resolve / Create customer
	var custID uuid.UUID
	err = tx.QueryRow(ctx, "SELECT id FROM customers WHERE phone = $1 LIMIT 1", customerPhone).Scan(&custID)
	if err != nil || custID == uuid.Nil {
		custID = uuid.New()
		var seqVal int64
		_ = tx.QueryRow(ctx, "SELECT nextval('customer_number_seq')").Scan(&seqVal)
		if seqVal == 0 {
			seqVal = time.Now().Unix() % 100000
		}
		custNum := fmt.Sprintf("CUS-%d-%05d", time.Now().Year(), seqVal)
		cName := customerName
		if cName == "" {
			cName = fmt.Sprintf("Pelanggan Passpoint (%s)", customerPhone)
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO customers (id, customer_number, full_name, email, phone, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW(), NOW())
		`, custID, custNum, cName, customerEmail, customerPhone)
		if err != nil {
			return nil, nil, fmt.Errorf("buat data customer: %w", err)
		}
	}

	// 6. Create Passpoint credential
	credID := uuid.New()
	now := time.Now()
	cred := &Credential{
		ID:         credID,
		CustomerID: custID,
		ProfileID:  prof.ID,
		Username:   username,
		Password:   password,
		Status:     "ACTIVE",
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	const credQ = `
		INSERT INTO passpoint_credentials (
			id, customer_id, profile_id, username, password, status,
			last_authenticated_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		)
	`
	_, err = tx.Exec(ctx, credQ,
		cred.ID, cred.CustomerID, cred.ProfileID, cred.Username, cred.Password, cred.Status,
		cred.LastAuthenticatedAt, cred.CreatedAt, cred.UpdatedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("buat kredensial passpoint: %w", err)
	}

	// 7. Update order to PAID
	const updOrderQ = `
		UPDATE passpoint_orders SET
			status = 'PAID',
			credential_id = $1,
			paid_by_agent_id = $2,
			paid_at = NOW(),
			admin_fee = $3,
			updated_at = NOW()
		WHERE id = $4
	`
	_, err = tx.Exec(ctx, updOrderQ, credID, agentID, adminFee, orderUUID)
	if err != nil {
		return nil, nil, fmt.Errorf("update status pesanan: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("commit transaksi: %w", err)
	}

	receiptNumber := fmt.Sprintf("RCP-PP-%s", cashierCode)
	totalCustomerPays := finalPrice + adminFee
	agentProfit := comm + adminFee

	receipt := &PasspointReceipt{
		ReceiptNumber:     receiptNumber,
		TransactionTime:   time.Now().Format("02 Jan 2006, 15:04 WIB"),
		CashierCode:       cashierCode,
		AgentName:         agentName,
		AgentCode:         agentCode,
		CustomerName:      customerName,
		CustomerPhone:     customerPhone,
		PackageName:       packageName,
		DurationDays:      durationDays,
		TotalCustomerPays: totalCustomerPays,
		AgentDebitAmount:  debitAmount,
		AgentProfit:       agentProfit,
		Username:          username,
		Password:          password,
		Realm:             prof.Realm,
		DomainName:        prof.DomainName,
		AppleProfileURL:   fmt.Sprintf("/api/v1/passpoint/credentials/%s/apple-profile", credID.String()),
		BalanceAfter:      newBalance,
	}

	return receipt, cred, nil
}

func (r *Repository) IssueManualPasspoint(
	ctx context.Context,
	agentID uuid.UUID,
	pkg PasspointPackage,
	req IssueManualPasspointRequest,
	prof *Profile,
	username, password string,
) (*PasspointReceipt, *Credential, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Lock and fetch agent
	const agentQ = `
		SELECT balance, code, name, COALESCE(offline_cashback_pct, 15.0), status
		FROM agents
		WHERE id = $1
		FOR UPDATE
	`
	var (
		agentBalance int64
		agentCashback float64
		agentCode, agentName, agentStatus string
	)
	err = tx.QueryRow(ctx, agentQ, agentID).Scan(
		&agentBalance, &agentCode, &agentName, &agentCashback, &agentStatus,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("query agen: %w", err)
	}
	if agentStatus != "ACTIVE" {
		return nil, nil, errors.New("status akun agen tidak aktif")
	}

	commission := int64(float64(pkg.Price) * (agentCashback / 100.0))
	debitAmount := pkg.Price - commission
	if debitAmount < 0 {
		debitAmount = 0
	}

	if agentBalance < debitAmount {
		return nil, nil, fmt.Errorf("saldo dompet agen tidak mencukupi (Perlu modal Rp %d, Saldo Anda Rp %d). Silakan isi saldo terlebih dahulu.", debitAmount, agentBalance)
	}

	// 2. Debit agent balance
	newBalance := agentBalance - debitAmount
	_, err = tx.Exec(ctx, "UPDATE agents SET balance = $1, updated_at = NOW() WHERE id = $2", newBalance, agentID)
	if err != nil {
		return nil, nil, fmt.Errorf("potong saldo agen: %w", err)
	}

	// 3. Record mutation
	mutDesc := fmt.Sprintf("Penerbitan Passpoint Loket (%s) Pelanggan %s (%s)", pkg.Name, req.CustomerName, req.Phone)
	const mutQ = `
		INSERT INTO agent_balance_mutations (
			id, agent_id, mutation_type, amount, balance_before, balance_after,
			reference_id, description, created_at
		) VALUES (
			gen_random_uuid(), $1, 'PASSPOINT_OFFLINE_BUY', $2, $3, $4,
			$5, $6, NOW()
		)
	`
	_, err = tx.Exec(ctx, mutQ, agentID, -debitAmount, agentBalance, newBalance, username, mutDesc)
	if err != nil {
		return nil, nil, fmt.Errorf("catat mutasi saldo: %w", err)
	}

	// 4. Resolve / Create customer
	var custID uuid.UUID
	err = tx.QueryRow(ctx, "SELECT id FROM customers WHERE phone = $1 LIMIT 1", req.Phone).Scan(&custID)
	if err != nil || custID == uuid.Nil {
		custID = uuid.New()
		var seqVal int64
		_ = tx.QueryRow(ctx, "SELECT nextval('customer_number_seq')").Scan(&seqVal)
		if seqVal == 0 {
			seqVal = time.Now().Unix() % 100000
		}
		custNum := fmt.Sprintf("CUS-%d-%05d", time.Now().Year(), seqVal)
		cName := req.CustomerName
		if cName == "" {
			cName = fmt.Sprintf("Pelanggan Passpoint (%s)", req.Phone)
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO customers (id, customer_number, full_name, email, phone, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW(), NOW())
		`, custID, custNum, cName, req.Email, req.Phone)
		if err != nil {
			return nil, nil, fmt.Errorf("buat data customer: %w", err)
		}
	}

	// 5. Create Passpoint credential
	credID := uuid.New()
	now := time.Now()
	cred := &Credential{
		ID:         credID,
		CustomerID: custID,
		ProfileID:  prof.ID,
		Username:   username,
		Password:   password,
		Status:     "ACTIVE",
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	const credQ = `
		INSERT INTO passpoint_credentials (
			id, customer_id, profile_id, username, password, status,
			last_authenticated_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		)
	`
	_, err = tx.Exec(ctx, credQ,
		cred.ID, cred.CustomerID, cred.ProfileID, cred.Username, cred.Password, cred.Status,
		cred.LastAuthenticatedAt, cred.CreatedAt, cred.UpdatedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("buat kredensial passpoint: %w", err)
	}

	// 6. Record order as PAID
	randCode := fmt.Sprintf("PP-%d", time.Now().Unix()%90000+10000)
	orderID := fmt.Sprintf("ORD-MOK-%s", randCode)
	const insOrderQ = `
		INSERT INTO passpoint_orders (
			id, order_id, cashier_code, order_type, package_id, package_name, duration_days,
			customer_name, customer_phone, customer_email, original_price, discount_amount,
			admin_fee, final_price, agent_id, promo_code, agent_commission, payment_method,
			status, credential_id, paid_by_agent_id, paid_at, expires_at, created_at, updated_at
		) VALUES (
			gen_random_uuid(), $1, $2, 'NEW_ACCESS', $3, $4, $5,
			$6, $7, $8, $9, 0,
			0, $9, $10, '', $11, 'MANUAL_COUNTER',
			'PAID', $12, $10, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()
		)
	`
	_, _ = tx.Exec(ctx, insOrderQ,
		orderID, randCode, pkg.ID, pkg.Name, pkg.DurationDays,
		req.CustomerName, req.Phone, req.Email, pkg.Price,
		agentID, commission, credID,
	)

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("commit transaksi: %w", err)
	}

	receiptNumber := fmt.Sprintf("RCP-PP-%s", randCode)

	receipt := &PasspointReceipt{
		ReceiptNumber:     receiptNumber,
		TransactionTime:   time.Now().Format("02 Jan 2006, 15:04 WIB"),
		CashierCode:       randCode,
		AgentName:         agentName,
		AgentCode:         agentCode,
		CustomerName:      req.CustomerName,
		CustomerPhone:     req.Phone,
		PackageName:       pkg.Name,
		DurationDays:      pkg.DurationDays,
		TotalCustomerPays: pkg.Price,
		AgentDebitAmount:  debitAmount,
		AgentProfit:       commission,
		Username:          username,
		Password:          password,
		Realm:             prof.Realm,
		DomainName:        prof.DomainName,
		AppleProfileURL:   fmt.Sprintf("/api/v1/passpoint/credentials/%s/apple-profile", credID.String()),
		BalanceAfter:      newBalance,
	}

	return receipt, cred, nil
}

func (r *Repository) MarkOrderPaid(ctx context.Context, orderID string, credID uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var (
		agentID   *uuid.UUID
		comm      int64
		orderCode string
		pkgName   string
		status    string
	)
	err = tx.QueryRow(ctx, `
		SELECT agent_id, agent_commission, cashier_code, package_name, status
		FROM passpoint_orders
		WHERE order_id = $1
		FOR UPDATE
	`, orderID).Scan(&agentID, &comm, &orderCode, &pkgName, &status)
	if err != nil {
		return err
	}
	if status == "PAID" {
		return nil
	}

	// Update order
	_, err = tx.Exec(ctx, `
		UPDATE passpoint_orders SET
			status = 'PAID',
			credential_id = $1,
			paid_at = NOW(),
			updated_at = NOW()
		WHERE order_id = $2
	`, credID, orderID)
	if err != nil {
		return err
	}

	// If order was referred by an agent and has commission, credit agent!
	if agentID != nil && comm > 0 {
		var curBalance int64
		err = tx.QueryRow(ctx, "SELECT balance FROM agents WHERE id = $1 FOR UPDATE", *agentID).Scan(&curBalance)
		if err == nil {
			newBalance := curBalance + comm
			_, _ = tx.Exec(ctx, "UPDATE agents SET balance = $1, updated_at = NOW() WHERE id = $2", newBalance, *agentID)
			_, _ = tx.Exec(ctx, `
				INSERT INTO agent_balance_mutations (
					id, agent_id, mutation_type, amount, balance_before, balance_after,
					reference_id, description, created_at
				) VALUES (
					gen_random_uuid(), $1, 'PASSPOINT_ONLINE_COMMISSION', $2, $3, $4,
					$5, $6, NOW()
				)
			`, *agentID, comm, curBalance, newBalance, orderCode, fmt.Sprintf("Komisi Online Passpoint (%s - Kode %s)", pkgName, orderCode))
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) ListPackages(ctx context.Context, onlyActive bool) ([]PasspointPackage, error) {
	q := `
		SELECT id, name, description, duration_days, price, speed_limit, is_popular, is_active, sort_order, created_at, updated_at
		FROM passpoint_packages
	`
	if onlyActive {
		q += " WHERE is_active = TRUE"
	}
	q += " ORDER BY sort_order ASC, duration_days ASC"

	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list packages: %w", err)
	}
	defer rows.Close()

	var pkgs []PasspointPackage
	for rows.Next() {
		var p PasspointPackage
		if err := rows.Scan(
			&p.ID, &p.Name, &p.Description, &p.DurationDays, &p.Price,
			&p.SpeedLimit, &p.IsPopular, &p.IsActive, &p.SortOrder,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan package: %w", err)
		}
		pkgs = append(pkgs, p)
	}
	return pkgs, nil
}

func (r *Repository) GetPackageByID(ctx context.Context, id string) (*PasspointPackage, error) {
	const q = `
		SELECT id, name, description, duration_days, price, speed_limit, is_popular, is_active, sort_order, created_at, updated_at
		FROM passpoint_packages
		WHERE id = $1
	`
	var p PasspointPackage
	err := r.db.QueryRow(ctx, q, id).Scan(
		&p.ID, &p.Name, &p.Description, &p.DurationDays, &p.Price,
		&p.SpeedLimit, &p.IsPopular, &p.IsActive, &p.SortOrder,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get package by id: %w", err)
	}
	return &p, nil
}

func (r *Repository) CreatePackage(ctx context.Context, p *PasspointPackage) error {
	const q = `
		INSERT INTO passpoint_packages (
			id, name, description, duration_days, price, speed_limit, is_popular, is_active, sort_order, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
		)
	`
	_, err := r.db.Exec(ctx, q,
		p.ID, p.Name, p.Description, p.DurationDays, p.Price,
		p.SpeedLimit, p.IsPopular, p.IsActive, p.SortOrder,
	)
	if err != nil {
		return fmt.Errorf("create package: %w", err)
	}
	return nil
}

func (r *Repository) UpdatePackage(ctx context.Context, p *PasspointPackage) error {
	const q = `
		UPDATE passpoint_packages SET
			name = $2,
			description = $3,
			duration_days = $4,
			price = $5,
			speed_limit = $6,
			is_popular = $7,
			is_active = $8,
			sort_order = $9,
			updated_at = NOW()
		WHERE id = $1
	`
	res, err := r.db.Exec(ctx, q,
		p.ID, p.Name, p.Description, p.DurationDays, p.Price,
		p.SpeedLimit, p.IsPopular, p.IsActive, p.SortOrder,
	)
	if err != nil {
		return fmt.Errorf("update package: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("package not found")
	}
	return nil
}

func (r *Repository) DeletePackage(ctx context.Context, id string) error {
	const q = `DELETE FROM passpoint_packages WHERE id = $1`
	res, err := r.db.Exec(ctx, q, id)
	if err != nil {
		return fmt.Errorf("delete package: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("package not found")
	}
	return nil
}

func (r *Repository) GetExpiredActiveCredentials(ctx context.Context) ([]Credential, error) {
	const q = `
		SELECT c.id, c.customer_id, cust.full_name, cust.customer_number, cust.phone,
		       c.profile_id, p.name, c.username, c.password, c.status,
		       c.last_authenticated_at, c.created_at, c.updated_at,
		       po.expires_at, po.package_name, '' as issuer_name, '' as issuer_type
		FROM passpoint_credentials c
		JOIN customers cust ON cust.id = c.customer_id
		JOIN passpoint_profiles p ON p.id = c.profile_id
		JOIN LATERAL (
			SELECT po.expires_at, po.package_name
			FROM passpoint_orders po
			WHERE po.credential_id = c.id AND po.status = 'PAID'
			ORDER BY po.created_at DESC
			LIMIT 1
		) po ON true
		WHERE c.status = 'ACTIVE' AND po.expires_at <= NOW()
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("query expired credentials: %w", err)
	}
	defer rows.Close()

	var creds []Credential
	for rows.Next() {
		var cred Credential
		if err := rows.Scan(
			&cred.ID, &cred.CustomerID, &cred.CustomerName, &cred.CustomerNumber, &cred.CustomerPhone,
			&cred.ProfileID, &cred.ProfileName, &cred.Username, &cred.Password, &cred.Status,
			&cred.LastAuthenticatedAt, &cred.CreatedAt, &cred.UpdatedAt,
			&cred.ExpiresAt, &cred.PackageName,
			&cred.IssuerName, &cred.IssuerType,
		); err != nil {
			return nil, fmt.Errorf("scan expired credential: %w", err)
		}
		creds = append(creds, cred)
	}
	return creds, nil
}

func (r *Repository) MarkCredentialExpired(ctx context.Context, id uuid.UUID) error {
	const q = `UPDATE passpoint_credentials SET status = 'REVOKED', updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, q, id)
	return err
}

func (r *Repository) GetExpiringCredentialsForReminder(ctx context.Context, windowHours int) ([]Credential, error) {
	const q = `
		SELECT c.id, c.customer_id, cust.full_name, cust.customer_number, cust.phone,
		       c.profile_id, p.name, c.username, c.password, c.status,
		       c.last_authenticated_at, c.created_at, c.updated_at,
		       po.expires_at, po.package_name, '' as issuer_name, '' as issuer_type
		FROM passpoint_credentials c
		JOIN customers cust ON cust.id = c.customer_id
		JOIN passpoint_profiles p ON p.id = c.profile_id
		JOIN LATERAL (
			SELECT po.expires_at, po.package_name
			FROM passpoint_orders po
			WHERE po.credential_id = c.id AND po.status = 'PAID'
			ORDER BY po.created_at DESC
			LIMIT 1
		) po ON true
		WHERE c.status = 'ACTIVE'
		  AND po.expires_at > NOW()
		  AND po.expires_at <= NOW() + ($1 * INTERVAL '1 hour')
		  AND cust.phone IS NOT NULL AND cust.phone != ''
		  AND (c.reminder_sent_at IS NULL OR c.reminder_sent_at < NOW() - INTERVAL '20 hours')
	`
	rows, err := r.db.Query(ctx, q, windowHours)
	if err != nil {
		return nil, fmt.Errorf("query expiring credentials: %w", err)
	}
	defer rows.Close()

	var creds []Credential
	for rows.Next() {
		var cred Credential
		if err := rows.Scan(
			&cred.ID, &cred.CustomerID, &cred.CustomerName, &cred.CustomerNumber, &cred.CustomerPhone,
			&cred.ProfileID, &cred.ProfileName, &cred.Username, &cred.Password, &cred.Status,
			&cred.LastAuthenticatedAt, &cred.CreatedAt, &cred.UpdatedAt,
			&cred.ExpiresAt, &cred.PackageName,
			&cred.IssuerName, &cred.IssuerType,
		); err != nil {
			return nil, fmt.Errorf("scan expiring credential: %w", err)
		}
		creds = append(creds, cred)
	}
	return creds, nil
}

func (r *Repository) MarkReminderSent(ctx context.Context, id uuid.UUID) error {
	const q = `UPDATE passpoint_credentials SET reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, q, id)
	return err
}

