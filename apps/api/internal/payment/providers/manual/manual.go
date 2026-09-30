package manual

import (
	"context"
	"errors"

	"github.com/gigabill/isp/internal/payment"
)

type Provider struct{}

func New() *Provider {
	return &Provider{}
}

func (p *Provider) Name() string {
	return "manual"
}

func (p *Provider) CreatePaymentRequest(ctx context.Context, req payment.OnlinePaymentRequest) (*payment.PaymentGatewayResponse, error) {
	return nil, errors.New("manual provider does not generate online gateway sessions")
}

func (p *Provider) VerifyWebhook(ctx context.Context, payload []byte, signature string) (*payment.WebhookEvent, error) {
	return nil, errors.New("manual provider does not accept external webhooks")
}

func (p *Provider) GetPaymentStatus(ctx context.Context, externalID string) (*payment.Status, error) {
	s := payment.StatusPending
	return &s, nil
}
