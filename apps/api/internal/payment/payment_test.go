package payment

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gigabill/isp/pkg/money"
)

type mockProvider struct{}

func (m *mockProvider) Name() string { return "mock" }
func (m *mockProvider) CreatePaymentRequest(ctx context.Context, req OnlinePaymentRequest) (*PaymentGatewayResponse, error) {
	url := "https://pay.example.com"
	return &PaymentGatewayResponse{
		PaymentID:   uuid.New(),
		ExternalID:  "EXT-123",
		RedirectURL: &url,
		ExpiredAt:   time.Now().Add(24 * time.Hour),
	}, nil
}
func (m *mockProvider) VerifyWebhook(ctx context.Context, payload []byte, signature string) (*WebhookEvent, error) {
	return &WebhookEvent{
		ExternalID:     "INV-2026-04-00001",
		Status:         StatusCompleted,
		Amount:         money.Amount(150000),
		PaidAt:         time.Now(),
		IdempotencyKey: "idem-key-01",
	}, nil
}
func (m *mockProvider) GetPaymentStatus(ctx context.Context, externalID string) (*Status, error) {
	st := StatusCompleted
	return &st, nil
}

func TestPaymentRegistry(t *testing.T) {
	registry := NewRegistry()
	mock := &mockProvider{}
	registry.Register(mock)

	p, err := registry.Get("mock")
	if err != nil {
		t.Fatalf("expected provider to be found, got error: %v", err)
	}
	if p.Name() != "mock" {
		t.Fatalf("expected mock, got %s", p.Name())
	}

	_, err = registry.Get("unknown")
	if err == nil {
		t.Fatal("expected error for unknown provider, got nil")
	}
}
