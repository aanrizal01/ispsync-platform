package acs

import (
	"context"
	"fmt"

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

func (r *Repository) ListONTs(ctx context.Context) ([]CustomerONT, error) {
	const q = `
		SELECT o.id, o.customer_id, c.full_name as customer_name, c.phone as customer_phone,
		       o.access_account_id, o.serial_number, COALESCE(o.mac_address, ''),
		       o.vendor, o.model, COALESCE(o.hardware_version, ''), COALESCE(o.software_version, ''),
		       o.wifi_ssid, o.wifi_password, o.wifi_security, o.wifi_channel, o.is_wifi_enabled,
		       o.rx_optical_power, o.tx_optical_power, o.optical_status,
		       o.connection_status, COALESCE(o.ip_address, ''), o.uptime_seconds,
		       o.last_inform_at, COALESCE(o.notes, ''), o.created_at, o.updated_at
		FROM customer_onts o
		JOIN customers c ON c.id = o.customer_id
		ORDER BY o.created_at DESC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var onts []CustomerONT
	for rows.Next() {
		var o CustomerONT
		if err := rows.Scan(
			&o.ID, &o.CustomerID, &o.CustomerName, &o.CustomerPhone,
			&o.AccessAccountID, &o.SerialNumber, &o.MACAddress,
			&o.Vendor, &o.Model, &o.HardwareVersion, &o.SoftwareVersion,
			&o.WiFiSSID, &o.WiFiPassword, &o.WiFiSecurity, &o.WiFiChannel, &o.IsWiFiEnabled,
			&o.RxOpticalPower, &o.TxOpticalPower, &o.OpticalStatus,
			&o.ConnectionStatus, &o.IPAddress, &o.UptimeSeconds,
			&o.LastInformAt, &o.Notes, &o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			return nil, err
		}
		onts = append(onts, o)
	}
	return onts, nil
}

func (r *Repository) GetONTByID(ctx context.Context, id uuid.UUID) (*CustomerONT, error) {
	const q = `
		SELECT o.id, o.customer_id, c.full_name as customer_name, c.phone as customer_phone,
		       o.access_account_id, o.serial_number, COALESCE(o.mac_address, ''),
		       o.vendor, o.model, COALESCE(o.hardware_version, ''), COALESCE(o.software_version, ''),
		       o.wifi_ssid, o.wifi_password, o.wifi_security, o.wifi_channel, o.is_wifi_enabled,
		       o.rx_optical_power, o.tx_optical_power, o.optical_status,
		       o.connection_status, COALESCE(o.ip_address, ''), o.uptime_seconds,
		       o.last_inform_at, COALESCE(o.notes, ''), o.created_at, o.updated_at
		FROM customer_onts o
		JOIN customers c ON c.id = o.customer_id
		WHERE o.id = $1
	`
	var o CustomerONT
	err := r.db.QueryRow(ctx, q, id).Scan(
		&o.ID, &o.CustomerID, &o.CustomerName, &o.CustomerPhone,
		&o.AccessAccountID, &o.SerialNumber, &o.MACAddress,
		&o.Vendor, &o.Model, &o.HardwareVersion, &o.SoftwareVersion,
		&o.WiFiSSID, &o.WiFiPassword, &o.WiFiSecurity, &o.WiFiChannel, &o.IsWiFiEnabled,
		&o.RxOpticalPower, &o.TxOpticalPower, &o.OpticalStatus,
		&o.ConnectionStatus, &o.IPAddress, &o.UptimeSeconds,
		&o.LastInformAt, &o.Notes, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &o, nil
}

func (r *Repository) GetONTByCustomerID(ctx context.Context, customerID uuid.UUID) (*CustomerONT, error) {
	const q = `
		SELECT o.id, o.customer_id, c.full_name as customer_name, c.phone as customer_phone,
		       o.access_account_id, o.serial_number, COALESCE(o.mac_address, ''),
		       o.vendor, o.model, COALESCE(o.hardware_version, ''), COALESCE(o.software_version, ''),
		       o.wifi_ssid, o.wifi_password, o.wifi_security, o.wifi_channel, o.is_wifi_enabled,
		       o.rx_optical_power, o.tx_optical_power, o.optical_status,
		       o.connection_status, COALESCE(o.ip_address, ''), o.uptime_seconds,
		       o.last_inform_at, COALESCE(o.notes, ''), o.created_at, o.updated_at
		FROM customer_onts o
		JOIN customers c ON c.id = o.customer_id
		WHERE o.customer_id = $1
		LIMIT 1
	`
	var o CustomerONT
	err := r.db.QueryRow(ctx, q, customerID).Scan(
		&o.ID, &o.CustomerID, &o.CustomerName, &o.CustomerPhone,
		&o.AccessAccountID, &o.SerialNumber, &o.MACAddress,
		&o.Vendor, &o.Model, &o.HardwareVersion, &o.SoftwareVersion,
		&o.WiFiSSID, &o.WiFiPassword, &o.WiFiSecurity, &o.WiFiChannel, &o.IsWiFiEnabled,
		&o.RxOpticalPower, &o.TxOpticalPower, &o.OpticalStatus,
		&o.ConnectionStatus, &o.IPAddress, &o.UptimeSeconds,
		&o.LastInformAt, &o.Notes, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &o, nil
}

func (r *Repository) UpdateWiFi(ctx context.Context, id uuid.UUID, ssid, password string) error {
	const q = `
		UPDATE customer_onts
		SET wifi_ssid = $1, wifi_password = $2, updated_at = NOW()
		WHERE id = $3
	`
	cmd, err := r.db.Exec(ctx, q, ssid, password, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("ont not found")
	}
	return nil
}

func (r *Repository) CreateONT(ctx context.Context, req RegisterONTRequest) (*CustomerONT, error) {
	const q = `
		INSERT INTO customer_onts (
			customer_id, serial_number, mac_address, vendor, model,
			wifi_ssid, wifi_password, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`
	var o CustomerONT
	o.CustomerID = req.CustomerID
	o.SerialNumber = req.SerialNumber
	o.MACAddress = req.MACAddress
	o.Vendor = req.Vendor
	o.Model = req.Model
	o.WiFiSSID = req.WiFiSSID
	o.WiFiPassword = req.WiFiPassword
	o.Notes = req.Notes

	err := r.db.QueryRow(ctx, q,
		req.CustomerID, req.SerialNumber, req.MACAddress, req.Vendor, req.Model,
		req.WiFiSSID, req.WiFiPassword, req.Notes,
	).Scan(&o.ID, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &o, nil
}
