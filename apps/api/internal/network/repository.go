package network

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
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

func (r *Repository) Create(ctx context.Context, d *Device) error {
	metaJSON, err := json.Marshal(d.Metadata)
	if err != nil {
		metaJSON = []byte("{}")
	}

	const q = `
		INSERT INTO network_devices (
			id, name, vendor, model, ip_address, api_port, auth_type,
			username, password_encrypted, use_tls, is_active, status,
			last_seen_at, metadata, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		)
	`
	_, err = r.db.Exec(ctx, q,
		d.ID, d.Name, d.Vendor, d.Model, d.IPAddress, d.APIPort, d.AuthType,
		d.Username, d.PasswordEncrypted, d.UseTLS, d.IsActive, d.Status,
		d.LastSeenAt, metaJSON, d.CreatedAt, d.UpdatedAt,
	)
	return err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Device, error) {
	const q = `
		SELECT id, name, vendor, model, HOST(ip_address), api_port, auth_type,
		       username, password_encrypted, use_tls, is_active, status,
		       last_seen_at, metadata, created_at, updated_at
		FROM network_devices
		WHERE id = $1
	`
	var d Device
	var metaJSON []byte
	err := r.db.QueryRow(ctx, q, id).Scan(
		&d.ID, &d.Name, &d.Vendor, &d.Model, &d.IPAddress, &d.APIPort, &d.AuthType,
		&d.Username, &d.PasswordEncrypted, &d.UseTLS, &d.IsActive, &d.Status,
		&d.LastSeenAt, &metaJSON, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get network device by id: %w", err)
	}

	if len(metaJSON) > 0 {
		_ = json.Unmarshal(metaJSON, &d.Metadata)
	}
	return &d, nil
}

func (r *Repository) List(ctx context.Context, vendor *Vendor, isActive *bool) ([]Device, error) {
	where := "WHERE 1=1"
	args := []any{}
	argIdx := 1

	if vendor != nil && *vendor != "" {
		where += fmt.Sprintf(" AND vendor = $%d", argIdx)
		args = append(args, *vendor)
		argIdx++
	}

	if isActive != nil {
		where += fmt.Sprintf(" AND is_active = $%d", argIdx)
		args = append(args, *isActive)
		argIdx++
	}

	q := fmt.Sprintf(`
		SELECT id, name, vendor, model, HOST(ip_address), api_port, auth_type,
		       username, password_encrypted, use_tls, is_active, status,
		       last_seen_at, metadata, created_at, updated_at
		FROM network_devices
		%s
		ORDER BY created_at DESC
	`, where)

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("list network devices: %w", err)
	}
	defer rows.Close()

	var devices []Device
	for rows.Next() {
		var d Device
		var metaJSON []byte
		if err := rows.Scan(
			&d.ID, &d.Name, &d.Vendor, &d.Model, &d.IPAddress, &d.APIPort, &d.AuthType,
			&d.Username, &d.PasswordEncrypted, &d.UseTLS, &d.IsActive, &d.Status,
			&d.LastSeenAt, &metaJSON, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan device: %w", err)
		}
		if len(metaJSON) > 0 {
			_ = json.Unmarshal(metaJSON, &d.Metadata)
		}
		devices = append(devices, d)
	}
	return devices, nil
}

func (r *Repository) Update(ctx context.Context, d *Device) error {
	metaJSON, err := json.Marshal(d.Metadata)
	if err != nil {
		metaJSON = []byte("{}")
	}

	const q = `
		UPDATE network_devices
		SET name = $1, model = $2, ip_address = $3, api_port = $4,
		    username = $5, password_encrypted = $6, use_tls = $7,
		    is_active = $8, metadata = $9, updated_at = NOW()
		WHERE id = $10
	`
	_, err = r.db.Exec(ctx, q,
		d.Name, d.Model, d.IPAddress, d.APIPort,
		d.Username, d.PasswordEncrypted, d.UseTLS,
		d.IsActive, metaJSON, d.ID,
	)
	return err
}

func (r *Repository) UpdateStatus(ctx context.Context, id uuid.UUID, status DeviceStatus, lastSeen *time.Time) error {
	const q = `
		UPDATE network_devices
		SET status = $1,
		    last_seen_at = COALESCE($2, last_seen_at),
		    updated_at = NOW()
		WHERE id = $3
	`
	_, err := r.db.Exec(ctx, q, status, lastSeen, id)
	return err
}

func (r *Repository) UpdateStatusWithModel(ctx context.Context, id uuid.UUID, status DeviceStatus, model string, lastSeen *time.Time) error {
	const q = `
		UPDATE network_devices
		SET status = $1,
		    model = CASE WHEN $2 <> '' THEN $2 ELSE model END,
		    last_seen_at = COALESCE($3, last_seen_at),
		    updated_at = NOW()
		WHERE id = $4
	`
	_, err := r.db.Exec(ctx, q, status, model, lastSeen, id)
	return err
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	const q = `DELETE FROM network_devices WHERE id = $1`
	_, err := r.db.Exec(ctx, q, id)
	return err
}

func (r *Repository) AddLog(ctx context.Context, log *DeviceLog) error {
	const q = `
		INSERT INTO network_device_logs (id, device_id, action, status, details, executed_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.Exec(ctx, q, log.ID, log.DeviceID, log.Action, log.Status, log.Details, log.ExecutedAt)
	return err
}

func (r *Repository) ListLogs(ctx context.Context, deviceID uuid.UUID, limit int) ([]DeviceLog, error) {
	const q = `
		SELECT id, device_id, action, status, details, executed_at
		FROM network_device_logs
		WHERE device_id = $1
		ORDER BY executed_at DESC
		LIMIT $2
	`
	rows, err := r.db.Query(ctx, q, deviceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []DeviceLog
	for rows.Next() {
		var l DeviceLog
		if err := rows.Scan(&l.ID, &l.DeviceID, &l.Action, &l.Status, &l.Details, &l.ExecutedAt); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, nil
}
