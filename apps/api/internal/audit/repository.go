package audit

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gigabill/isp/internal/shared/pagination"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Record(ctx context.Context, entry *AuditLog) error {
	if entry.ID == uuid.Nil {
		entry.ID = uuid.New()
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now()
	}

	var ipParam *string
	if entry.IPAddress != nil && *entry.IPAddress != "" {
		// Clean port if present, e.g. "127.0.0.1:51234" -> "127.0.0.1"
		cleanIP := *entry.IPAddress
		if idx := strings.LastIndex(cleanIP, ":"); idx != -1 && !strings.Contains(cleanIP, "]") {
			cleanIP = cleanIP[:idx]
		}
		cleanIP = strings.Trim(cleanIP, "[]")
		ipParam = &cleanIP
	}

	query := `
		INSERT INTO audit_logs (
			id, actor_id, actor_type, actor_email, action, description,
			entity_type, entity_id, old_values, new_values, ip_address,
			user_agent, request_id, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, NULLIF($11, '')::inet,
			$12, $13, $14, $15
		)`

	_, err := r.db.Exec(ctx, query,
		entry.ID,
		entry.ActorID,
		entry.ActorType,
		entry.ActorEmail,
		entry.Action,
		entry.Description,
		entry.EntityType,
		entry.EntityID,
		entry.OldValues,
		entry.NewValues,
		ipParam,
		entry.UserAgent,
		entry.RequestID,
		entry.Metadata,
		entry.CreatedAt,
	)
	return err
}

func (r *Repository) List(ctx context.Context, filter Filter, params pagination.Params) ([]AuditLog, pagination.Meta, error) {
	where := []string{"1=1"}
	args := []any{}
	idx := 1

	if filter.ActorID != nil {
		where = append(where, fmt.Sprintf("actor_id = $%d", idx))
		args = append(args, *filter.ActorID)
		idx++
	}

	if filter.ActorEmail != nil && *filter.ActorEmail != "" {
		where = append(where, fmt.Sprintf("actor_email ILIKE $%d", idx))
		args = append(args, "%"+*filter.ActorEmail+"%")
		idx++
	}

	if filter.EntityType != nil && *filter.EntityType != "" {
		where = append(where, fmt.Sprintf("entity_type = $%d", idx))
		args = append(args, *filter.EntityType)
		idx++
	}

	if filter.EntityID != nil && *filter.EntityID != "" {
		where = append(where, fmt.Sprintf("entity_id = $%d", idx))
		args = append(args, *filter.EntityID)
		idx++
	}

	if filter.Action != nil && *filter.Action != "" {
		where = append(where, fmt.Sprintf("action ILIKE $%d", idx))
		args = append(args, "%"+*filter.Action+"%")
		idx++
	}

	if filter.Search != nil && *filter.Search != "" {
		where = append(where, fmt.Sprintf("(description ILIKE $%d OR action ILIKE $%d OR entity_id ILIKE $%d OR actor_email ILIKE $%d)", idx, idx, idx, idx))
		args = append(args, "%"+*filter.Search+"%")
		idx++
	}

	if filter.DateFrom != nil {
		where = append(where, fmt.Sprintf("created_at >= $%d", idx))
		args = append(args, *filter.DateFrom)
		idx++
	}

	if filter.DateTo != nil {
		where = append(where, fmt.Sprintf("created_at <= $%d", idx))
		args = append(args, *filter.DateTo)
		idx++
	}

	whereClause := strings.Join(where, " AND ")

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM audit_logs WHERE %s", whereClause)
	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, fmt.Errorf("count audit logs: %w", err)
	}

	offset := (params.Page - 1) * params.Limit
	selectQuery := fmt.Sprintf(`
		SELECT id, actor_id, actor_type, actor_email, action, description,
		       entity_type, entity_id, old_values, new_values, host(ip_address),
		       user_agent, request_id, metadata, created_at
		FROM audit_logs
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, idx, idx+1)

	args = append(args, params.Limit, offset)

	rows, err := r.db.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, pagination.Meta{}, fmt.Errorf("list audit logs: %w", err)
	}
	defer rows.Close()

	var logs []AuditLog
	for rows.Next() {
		var l AuditLog
		var oldVal, newVal, meta []byte
		var ipAddr sqlNullStringHelper
		err := rows.Scan(
			&l.ID,
			&l.ActorID,
			&l.ActorType,
			&l.ActorEmail,
			&l.Action,
			&l.Description,
			&l.EntityType,
			&l.EntityID,
			&oldVal,
			&newVal,
			&ipAddr.String,
			&l.UserAgent,
			&l.RequestID,
			&meta,
			&l.CreatedAt,
		)
		if err != nil {
			return nil, pagination.Meta{}, fmt.Errorf("scan audit log: %w", err)
		}
		if len(oldVal) > 0 {
			l.OldValues = json.RawMessage(oldVal)
		}
		if len(newVal) > 0 {
			l.NewValues = json.RawMessage(newVal)
		}
		if len(meta) > 0 {
			l.Metadata = json.RawMessage(meta)
		}
		if ipAddr.String != nil && *ipAddr.String != "" {
			l.IPAddress = ipAddr.String
		}
		logs = append(logs, l)
	}

	totalPages := int(total) / params.Limit
	if int(total)%params.Limit != 0 || totalPages == 0 {
		totalPages++
	}

	metaData := pagination.Meta{
		Page:       params.Page,
		Limit:      params.Limit,
		Total:      int(total),
		TotalPages: totalPages,
	}

	return logs, metaData, nil
}

func (r *Repository) GetByEntity(ctx context.Context, entityType, entityID string, limit int) ([]AuditLog, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, actor_id, actor_type, actor_email, action, description,
		       entity_type, entity_id, old_values, new_values, host(ip_address),
		       user_agent, request_id, metadata, created_at
		FROM audit_logs
		WHERE entity_type = $1 AND entity_id = $2
		ORDER BY created_at DESC
		LIMIT $3`

	rows, err := r.db.Query(ctx, query, entityType, entityID, limit)
	if err != nil {
		return nil, fmt.Errorf("get audit logs by entity: %w", err)
	}
	defer rows.Close()

	var logs []AuditLog
	for rows.Next() {
		var l AuditLog
		var oldVal, newVal, meta []byte
		var ipAddr sqlNullStringHelper
		err := rows.Scan(
			&l.ID,
			&l.ActorID,
			&l.ActorType,
			&l.ActorEmail,
			&l.Action,
			&l.Description,
			&l.EntityType,
			&l.EntityID,
			&oldVal,
			&newVal,
			&ipAddr.String,
			&l.UserAgent,
			&l.RequestID,
			&meta,
			&l.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan entity audit log: %w", err)
		}
		if len(oldVal) > 0 {
			l.OldValues = json.RawMessage(oldVal)
		}
		if len(newVal) > 0 {
			l.NewValues = json.RawMessage(newVal)
		}
		if len(meta) > 0 {
			l.Metadata = json.RawMessage(meta)
		}
		if ipAddr.String != nil && *ipAddr.String != "" {
			l.IPAddress = ipAddr.String
		}
		logs = append(logs, l)
	}

	return logs, nil
}

type sqlNullStringHelper struct {
	String *string
}

func (s *sqlNullStringHelper) Scan(value any) error {
	if value == nil {
		s.String = nil
		return nil
	}
	switch v := value.(type) {
	case string:
		s.String = &v
	case []byte:
		str := string(v)
		s.String = &str
	default:
		str := fmt.Sprint(v)
		s.String = &str
	}
	return nil
}
