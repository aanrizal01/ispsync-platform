package customer

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gigabill/isp/internal/shared/pagination"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GenerateCustomerNumber(ctx context.Context) (string, error) {
	var seqVal int64
	err := r.db.QueryRow(ctx, "SELECT nextval('customer_number_seq')").Scan(&seqVal)
	if err != nil {
		return "", fmt.Errorf("generate customer number: %w", err)
	}
	year := time.Now().Year()
	return fmt.Sprintf("CUS-%d-%05d", year, seqVal), nil
}

func (r *Repository) Create(ctx context.Context, c *Customer, initialAddr *Address) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	const insertCustomer = `
		INSERT INTO customers (id, partner_id, customer_number, full_name, email, phone, status, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err = tx.Exec(ctx, insertCustomer,
		c.ID, c.PartnerID, c.CustomerNumber, c.FullName, c.Email, c.Phone, c.Status, c.Notes, c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert customer: %w", err)
	}

	if initialAddr != nil {
		const insertAddr = `
			INSERT INTO customer_addresses (id, customer_id, address_type, street, city, district, province, postal_code, country, is_primary, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		`
		_, err = tx.Exec(ctx, insertAddr,
			initialAddr.ID, c.ID, initialAddr.AddressType, initialAddr.Street, initialAddr.City,
			initialAddr.District, initialAddr.Province, initialAddr.PostalCode, initialAddr.Country,
			initialAddr.IsPrimary, initialAddr.CreatedAt, initialAddr.UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("insert customer address: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Customer, error) {
	const q = `
		SELECT id, partner_id, customer_number, full_name, email, phone, status, notes, created_at, updated_at, deleted_at
		FROM customers
		WHERE id = $1 AND deleted_at IS NULL
	`
	var c Customer
	err := r.db.QueryRow(ctx, q, id).Scan(
		&c.ID, &c.PartnerID, &c.CustomerNumber, &c.FullName, &c.Email, &c.Phone, &c.Status,
		&c.Notes, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get customer by id: %w", err)
	}

	// Fetch addresses
	addrRows, err := r.db.Query(ctx, `
		SELECT id, customer_id, address_type, street, city, district, province, postal_code, country, is_primary, created_at, updated_at
		FROM customer_addresses
		WHERE customer_id = $1
		ORDER BY is_primary DESC, created_at ASC
	`, id)
	if err == nil {
		defer addrRows.Close()
		for addrRows.Next() {
			var a Address
			if err := addrRows.Scan(
				&a.ID, &a.CustomerID, &a.AddressType, &a.Street, &a.City, &a.District,
				&a.Province, &a.PostalCode, &a.Country, &a.IsPrimary, &a.CreatedAt, &a.UpdatedAt,
			); err == nil {
				c.Addresses = append(c.Addresses, a)
			}
		}
	}

	// Fetch contacts
	contactRows, err := r.db.Query(ctx, `
		SELECT id, customer_id, contact_type, value, label, is_primary, created_at, updated_at
		FROM customer_contacts
		WHERE customer_id = $1
		ORDER BY is_primary DESC, created_at ASC
	`, id)
	if err == nil {
		defer contactRows.Close()
		for contactRows.Next() {
			var ct Contact
			if err := contactRows.Scan(
				&ct.ID, &ct.CustomerID, &ct.ContactType, &ct.Value, &ct.Label,
				&ct.IsPrimary, &ct.CreatedAt, &ct.UpdatedAt,
			); err == nil {
				c.Contacts = append(c.Contacts, ct)
			}
		}
	}

	// Fetch devices
	devRows, err := r.db.Query(ctx, `
		SELECT id, customer_id, access_account_id, mac_address, device_name, device_type, os_type, passpoint_capable, registered_at, last_seen_at
		FROM customer_devices
		WHERE customer_id = $1
		ORDER BY registered_at DESC
	`, id)
	if err == nil {
		defer devRows.Close()
		for devRows.Next() {
			var d Device
			if err := devRows.Scan(
				&d.ID, &d.CustomerID, &d.AccessAccountID, &d.MACAddress, &d.DeviceName,
				&d.DeviceType, &d.OSType, &d.PasspointCapable, &d.RegisteredAt, &d.LastSeenAt,
			); err == nil {
				c.Devices = append(c.Devices, d)
			}
		}
	}

	return &c, nil
}

func (r *Repository) List(ctx context.Context, params pagination.Params, search string, status string) ([]Customer, int, error) {
	where := "WHERE deleted_at IS NULL"
	args := []interface{}{}
	argIdx := 1

	if search != "" {
		where += fmt.Sprintf(" AND (full_name ILIKE $%d OR customer_number ILIKE $%d OR phone ILIKE $%d OR email ILIKE $%d)", argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	if status != "" {
		where += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM customers %s", where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count customers: %w", err)
	}

	orderBy := "ORDER BY created_at DESC"
	if params.Sort != "" {
		orderBy = fmt.Sprintf("ORDER BY %s %s", params.Sort, params.Order)
	}

	dataQuery := fmt.Sprintf(`
		SELECT id, customer_number, full_name, email, phone, status, notes, created_at, updated_at
		FROM customers
		%s
		%s
		LIMIT $%d OFFSET $%d
	`, where, orderBy, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query customers: %w", err)
	}
	defer rows.Close()

	var customers []Customer
	for rows.Next() {
		var c Customer
		if err := rows.Scan(
			&c.ID, &c.CustomerNumber, &c.FullName, &c.Email, &c.Phone, &c.Status,
			&c.Notes, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		customers = append(customers, c)
	}

	return customers, total, nil
}

func (r *Repository) Update(ctx context.Context, c *Customer) error {
	const q = `
		UPDATE customers
		SET full_name = $1, email = $2, phone = $3, status = $4, notes = $5, updated_at = NOW()
		WHERE id = $6 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(ctx, q, c.FullName, c.Email, c.Phone, c.Status, c.Notes, c.ID)
	return err
}

func (r *Repository) HasFinancialOrNetworkHistory(ctx context.Context, customerID uuid.UUID) (bool, error) {
	// Check subscriptions
	var countSub int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM subscriptions WHERE customer_id = $1", customerID).Scan(&countSub)
	if err == nil && countSub > 0 {
		return true, nil
	}

	// Check if invoices table exists yet
	var tableExists bool
	_ = r.db.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices')").Scan(&tableExists)
	if tableExists {
		var countInv int
		err = r.db.QueryRow(ctx, "SELECT COUNT(*) FROM invoices WHERE customer_id = $1", customerID).Scan(&countInv)
		if err == nil && countInv > 0 {
			return true, nil
		}
	}

	return false, nil
}

func (r *Repository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	const q = `UPDATE customers SET deleted_at = NOW(), status = 'TERMINATED', updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, q, id)
	return err
}

func (r *Repository) AddAddress(ctx context.Context, a *Address) error {
	const q = `
		INSERT INTO customer_addresses (id, customer_id, address_type, street, city, district, province, postal_code, country, is_primary, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.db.Exec(ctx, q,
		a.ID, a.CustomerID, a.AddressType, a.Street, a.City, a.District,
		a.Province, a.PostalCode, a.Country, a.IsPrimary, a.CreatedAt, a.UpdatedAt,
	)
	return err
}

func (r *Repository) AddDevice(ctx context.Context, d *Device) error {
	const q = `
		INSERT INTO customer_devices (id, customer_id, access_account_id, mac_address, device_name, device_type, os_type, passpoint_capable, registered_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (customer_id, mac_address) DO UPDATE
		SET device_name = EXCLUDED.device_name,
		    access_account_id = COALESCE(EXCLUDED.access_account_id, customer_devices.access_account_id),
		    passpoint_capable = EXCLUDED.passpoint_capable
	`
	_, err := r.db.Exec(ctx, q,
		d.ID, d.CustomerID, d.AccessAccountID, d.MACAddress, d.DeviceName,
		d.DeviceType, d.OSType, d.PasspointCapable, d.RegisteredAt,
	)
	return err
}

func (r *Repository) GetDevices(ctx context.Context, customerID uuid.UUID) ([]Device, error) {
	const q = `
		SELECT id, customer_id, access_account_id, mac_address, device_name, device_type, os_type, passpoint_capable, registered_at, last_seen_at
		FROM customer_devices
		WHERE customer_id = $1
		ORDER BY registered_at DESC
	`
	rows, err := r.db.Query(ctx, q, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []Device
	for rows.Next() {
		var d Device
		if err := rows.Scan(
			&d.ID, &d.CustomerID, &d.AccessAccountID, &d.MACAddress, &d.DeviceName,
			&d.DeviceType, &d.OSType, &d.PasspointCapable, &d.RegisteredAt, &d.LastSeenAt,
		); err != nil {
			return nil, err
		}
		devices = append(devices, d)
	}
	return devices, nil
}
