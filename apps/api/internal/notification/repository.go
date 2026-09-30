package notification

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

func (r *Repository) GetTemplateByCode(ctx context.Context, code string) (*Template, error) {
	const q = `
		SELECT id, code, channel, subject, body, variables, is_active, created_at, updated_at
		FROM notification_templates
		WHERE code = $1 AND is_active = TRUE
	`
	var t Template
	var varsJSON []byte
	err := r.db.QueryRow(ctx, q, code).Scan(
		&t.ID, &t.Code, &t.Channel, &t.Subject, &t.Body, &varsJSON, &t.IsActive, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get notification template: %w", err)
	}

	if len(varsJSON) > 0 {
		_ = json.Unmarshal(varsJSON, &t.Variables)
	}
	return &t, nil
}

func (r *Repository) ListTemplates(ctx context.Context) ([]Template, error) {
	const q = `
		SELECT id, code, channel, subject, body, variables, is_active, created_at, updated_at
		FROM notification_templates
		ORDER BY channel ASC, code ASC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list notification templates: %w", err)
	}
	defer rows.Close()

	var templates []Template
	for rows.Next() {
		var t Template
		var varsJSON []byte
		if err := rows.Scan(
			&t.ID, &t.Code, &t.Channel, &t.Subject, &t.Body, &varsJSON, &t.IsActive, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan template: %w", err)
		}
		if len(varsJSON) > 0 {
			_ = json.Unmarshal(varsJSON, &t.Variables)
		}
		templates = append(templates, t)
	}
	return templates, nil
}

func (r *Repository) UpdateTemplate(ctx context.Context, code string, subject *string, body string, isActive bool) error {
	const q = `
		UPDATE notification_templates
		SET subject = $1, body = $2, is_active = $3, updated_at = NOW()
		WHERE code = $4
	`
	_, err := r.db.Exec(ctx, q, subject, body, isActive, code)
	return err
}

func (r *Repository) CreateNotification(ctx context.Context, n *Notification) error {
	const q = `
		INSERT INTO notifications (
			id, customer_id, channel, recipient, subject, body, status, error_message, sent_at, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)
	`
	_, err := r.db.Exec(ctx, q,
		n.ID, n.CustomerID, n.Channel, n.Recipient, n.Subject, n.Body,
		n.Status, n.ErrorMessage, n.SentAt, n.CreatedAt,
	)
	return err
}

func (r *Repository) UpdateNotificationStatus(ctx context.Context, id uuid.UUID, status Status, sentAt *time.Time, errorMsg *string) error {
	const q = `
		UPDATE notifications
		SET status = $1, sent_at = $2, error_message = $3
		WHERE id = $4
	`
	_, err := r.db.Exec(ctx, q, status, sentAt, errorMsg, id)
	return err
}

func (r *Repository) ListNotifications(ctx context.Context, limit, offset int, channel *Channel, status *Status) ([]Notification, int64, error) {
	where := "WHERE 1=1"
	args := []any{}
	argIdx := 1

	if channel != nil && *channel != "" {
		where += fmt.Sprintf(" AND n.channel = $%d", argIdx)
		args = append(args, *channel)
		argIdx++
	}

	if status != nil && *status != "" {
		where += fmt.Sprintf(" AND n.status = $%d", argIdx)
		args = append(args, *status)
		argIdx++
	}

	countQ := fmt.Sprintf("SELECT COUNT(*) FROM notifications n %s", where)
	var total int64
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count notifications: %w", err)
	}

	q := fmt.Sprintf(`
		SELECT n.id, n.customer_id, c.full_name, n.channel, n.recipient,
		       n.subject, n.body, n.status, n.error_message, n.sent_at, n.created_at
		FROM notifications n
		LEFT JOIN customers c ON c.id = n.customer_id
		%s
		ORDER BY n.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list notifications: %w", err)
	}
	defer rows.Close()

	var notifs []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(
			&n.ID, &n.CustomerID, &n.CustomerName, &n.Channel, &n.Recipient,
			&n.Subject, &n.Body, &n.Status, &n.ErrorMessage, &n.SentAt, &n.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan notification: %w", err)
		}
		notifs = append(notifs, n)
	}
	return notifs, total, nil
}
