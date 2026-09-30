package xendit

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/gigabill/isp/internal/payment"
	"github.com/gigabill/isp/pkg/money"
)

func TestXenditProvider(t *testing.T) {
	p := New("", "test_webhook_token")
	if p.Name() != "xendit" {
		t.Fatalf("expected name xendit, got %s", p.Name())
	}

	// Test mock payment creation
	res, err := p.CreatePaymentRequest(context.Background(), payment.OnlinePaymentRequest{
		OrderNumber: "ORD-XND-001",
		Amount:      money.Amount(100000),
		Description: "Test PPPoE Invoice",
	})
	if err != nil {
		t.Fatalf("CreatePaymentRequest error: %v", err)
	}
	if res.RedirectURL == nil {
		t.Fatalf("expected redirect URL, got nil")
	}

	// Test Webhook Verification
	cb := xenditCallback{
		ID:         "xnd_inv_12345",
		ExternalID: "INV-2026-0001",
		Status:     "PAID",
		Amount:     100000,
	}
	raw, _ := json.Marshal(cb)

	event, err := p.VerifyWebhook(context.Background(), raw, "test_webhook_token")
	if err != nil {
		t.Fatalf("VerifyWebhook error: %v", err)
	}

	if event.Status != payment.StatusCompleted {
		t.Fatalf("expected status completed, got %v", event.Status)
	}
	if event.ExternalID != "INV-2026-0001" {
		t.Fatalf("expected external ID INV-2026-0001, got %s", event.ExternalID)
	}
}
