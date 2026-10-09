package audit

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/auth"
	"github.com/gigabill/isp/internal/shared/pagination"
)

type Service struct {
	repo   *Repository
	logger *slog.Logger
}

func NewService(repo *Repository, logger *slog.Logger) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

func (s *Service) Log(ctx context.Context, in RecordInput) error {
	var oldBytes, newBytes, metaBytes []byte
	var err error

	if in.OldValues != nil {
		oldBytes, err = json.Marshal(in.OldValues)
		if err != nil {
			s.logger.Warn("failed to marshal audit old values", "error", err)
		}
	}
	if in.NewValues != nil {
		newBytes, err = json.Marshal(in.NewValues)
		if err != nil {
			s.logger.Warn("failed to marshal audit new values", "error", err)
		}
	}
	if in.Metadata != nil {
		metaBytes, err = json.Marshal(in.Metadata)
		if err != nil {
			s.logger.Warn("failed to marshal audit metadata", "error", err)
		}
	}

	tenantSlug := in.TenantSlug
	if tenantSlug == "" {
		if claims := auth.ClaimsFromContext(ctx); claims != nil {
			tenantSlug = claims.TenantSlug
		}
	}
	if tenantSlug == "" {
		tenantSlug = "dev"
	}

	entry := &AuditLog{
		ID:          uuid.New(),
		ActorID:     in.ActorID,
		ActorType:   in.ActorType,
		ActorEmail:  in.ActorEmail,
		Action:      in.Action,
		Description: &in.Description,
		EntityType:  in.EntityType,
		EntityID:    in.EntityID,
		OldValues:   json.RawMessage(oldBytes),
		NewValues:   json.RawMessage(newBytes),
		IPAddress:   in.IPAddress,
		UserAgent:   in.UserAgent,
		RequestID:   in.RequestID,
		Metadata:    json.RawMessage(metaBytes),
		TenantSlug:  tenantSlug,
		CreatedAt:   time.Now(),
	}

	if err := s.repo.Record(ctx, entry); err != nil {
		s.logger.Error("failed to write audit log", "error", err, "action", in.Action, "entity_type", in.EntityType, "entity_id", in.EntityID)
		return err
	}
	return nil
}

func (s *Service) LogFromRequest(r *http.Request, action, entityType, entityID, description string, oldValues, newValues any) {
	ctx := r.Context()
	claims := auth.ClaimsFromContext(ctx)

	var actorID *uuid.UUID
	actorType := ActorSystem
	var actorEmail *string
	tenantSlug := ""

	if claims != nil {
		actorID = &claims.UserID
		actorType = ActorUser
		actorEmail = &claims.Email
		tenantSlug = claims.TenantSlug
	}
	if tenantSlug == "" {
		tenantSlug = auth.ExtractTenantSlug(r)
	}

	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-IP")
	}
	if ip == "" {
		ip = r.RemoteAddr
	}
	if comma := strings.Index(ip, ","); comma != -1 {
		ip = strings.TrimSpace(ip[:comma])
	}

	ua := r.UserAgent()
	reqID := r.Header.Get("X-Request-ID")

	_ = s.Log(ctx, RecordInput{
		ActorID:     actorID,
		ActorType:   actorType,
		ActorEmail:  actorEmail,
		Action:      action,
		Description: description,
		EntityType:  entityType,
		EntityID:    entityID,
		OldValues:   oldValues,
		NewValues:   newValues,
		IPAddress:   &ip,
		UserAgent:   &ua,
		RequestID:   &reqID,
		TenantSlug:  tenantSlug,
	})
}

func (s *Service) List(ctx context.Context, filter Filter, params pagination.Params) ([]AuditLog, pagination.Meta, error) {
	return s.repo.List(ctx, filter, params)
}

func (s *Service) GetByEntity(ctx context.Context, tenantSlug, entityType, entityID string, limit int) ([]AuditLog, error) {
	return s.repo.GetByEntity(ctx, tenantSlug, entityType, entityID, limit)
}
