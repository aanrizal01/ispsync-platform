package notification

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Channel string

const (
	ChannelWhatsApp Channel = "WHATSAPP"
	ChannelTelegram Channel = "TELEGRAM"
	ChannelEmail    Channel = "EMAIL"
	ChannelWebhook  Channel = "WEBHOOK"
)

type Status string

const (
	StatusPending Status = "PENDING"
	StatusSent    Status = "SENT"
	StatusFailed  Status = "FAILED"
)

type Template struct {
	ID        uuid.UUID `json:"id"`
	Code      string    `json:"code"`
	Channel   Channel   `json:"channel"`
	Subject   *string   `json:"subject,omitempty"`
	Body      string    `json:"body"`
	Variables []string  `json:"variables"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Notification struct {
	ID           uuid.UUID  `json:"id"`
	CustomerID   *uuid.UUID `json:"customer_id,omitempty"`
	CustomerName *string    `json:"customer_name,omitempty"`
	Channel      Channel    `json:"channel"`
	Recipient    string     `json:"recipient"`
	Subject      *string    `json:"subject,omitempty"`
	Body         string     `json:"body"`
	Status       Status     `json:"status"`
	ErrorMessage *string    `json:"error_message,omitempty"`
	SentAt       *time.Time `json:"sent_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// Sender is the channel provider interface for dispatching notifications.
type Sender interface {
	Send(ctx context.Context, recipient string, subject string, body string) error
}

// Request / Response DTOs

type SendNotificationRequest struct {
	CustomerID *uuid.UUID `json:"customer_id,omitempty"`
	Channel    Channel    `json:"channel" validate:"required,oneof=WHATSAPP TELEGRAM EMAIL WEBHOOK"`
	Recipient  string     `json:"recipient" validate:"required"`
	Subject    string     `json:"subject,omitempty"`
	Body       string     `json:"body" validate:"required"`
}

type DispatchTemplateRequest struct {
	TemplateCode string            `json:"template_code" validate:"required"`
	Recipient    string            `json:"recipient" validate:"required"`
	CustomerID   *uuid.UUID        `json:"customer_id,omitempty"`
	Data         map[string]string `json:"data"`
}

type UpdateTemplateRequest struct {
	Subject  *string `json:"subject,omitempty"`
	Body     string  `json:"body" validate:"required"`
	IsActive bool    `json:"is_active"`
}
