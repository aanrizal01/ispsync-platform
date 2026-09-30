package payment

import (
	"context"
	"fmt"

	"github.com/gigabill/isp/pkg/money"
)

type ItemDetail struct {
	ID       string       `json:"id,omitempty"`
	Name     string       `json:"name"`
	Price    money.Amount `json:"price"`
	Quantity int          `json:"quantity"`
	Category string       `json:"category,omitempty"`
}

type OnlinePaymentRequest struct {
	PaymentID     string
	OrderNumber   string
	CustomerName  string
	CustomerEmail string
	CustomerPhone string
	Amount        money.Amount
	PaymentMethod Method
	Description   string
	ReturnURL     string
	Items         []ItemDetail
}

// PaymentProvider abstraction to keep billing core vendor-neutral.
type PaymentProvider interface {
	Name() string
	CreatePaymentRequest(ctx context.Context, req OnlinePaymentRequest) (*PaymentGatewayResponse, error)
	VerifyWebhook(ctx context.Context, payload []byte, signature string) (*WebhookEvent, error)
	GetPaymentStatus(ctx context.Context, externalID string) (*Status, error)
}

// Registry manages payment providers by name.
type Registry struct {
	providers map[string]PaymentProvider
}

func NewRegistry() *Registry {
	return &Registry{
		providers: make(map[string]PaymentProvider),
	}
}

func (r *Registry) Register(p PaymentProvider) {
	r.providers[p.Name()] = p
}

func (r *Registry) Get(name string) (PaymentProvider, error) {
	p, ok := r.providers[name]
	if !ok {
		return nil, fmt.Errorf("payment provider %q not registered", name)
	}
	return p, nil
}
