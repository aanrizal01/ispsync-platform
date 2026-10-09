package audit

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ActorType string

const (
	ActorUser    ActorType = "USER"
	ActorSystem  ActorType = "SYSTEM"
	ActorWebhook ActorType = "WEBHOOK"
	ActorWorker  ActorType = "WORKER"
)

type AuditLog struct {
	ID          uuid.UUID       `json:"id"`
	ActorID     *uuid.UUID      `json:"actor_id,omitempty"`
	ActorType   ActorType       `json:"actor_type"`
	ActorEmail  *string         `json:"actor_email,omitempty"`
	Action      string          `json:"action"`
	Description *string         `json:"description,omitempty"`
	EntityType  string          `json:"entity_type"`
	EntityID    string          `json:"entity_id"`
	OldValues   json.RawMessage `json:"old_values,omitempty"`
	NewValues   json.RawMessage `json:"new_values,omitempty"`
	IPAddress   *string         `json:"ip_address,omitempty"`
	UserAgent   *string         `json:"user_agent,omitempty"`
	RequestID   *string         `json:"request_id,omitempty"`
	Metadata    json.RawMessage `json:"metadata,omitempty"`
	TenantSlug  string          `json:"tenant_slug"`
	CreatedAt   time.Time       `json:"created_at"`
}

type RecordInput struct {
	ActorID     *uuid.UUID
	ActorType   ActorType
	ActorEmail  *string
	Action      string
	Description string
	EntityType  string
	EntityID    string
	OldValues   any
	NewValues   any
	IPAddress   *string
	UserAgent   *string
	RequestID   *string
	Metadata    any
	TenantSlug  string
}

type Filter struct {
	ActorID    *uuid.UUID
	ActorEmail *string
	EntityType *string
	EntityID   *string
	Action     *string
	Search     *string
	TenantSlug string
	DateFrom   *time.Time
	DateTo     *time.Time
}
