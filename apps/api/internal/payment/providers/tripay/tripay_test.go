package tripay

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"testing"

	"github.com/gigabill/isp/internal/payment"
	"github.com/gigabill/isp/pkg/money"
)

func TestTripayProvider(t *testing.T) {
	p := New("", "test_private_key", "T12345", true)
	if p.Name() != "tripay" {
		t.Fatalf("expected name tripay, got %s", p.Name())
	}

	// Test mock payment creation
	res, err := p.CreatePaymentRequest(context.Background(), payment.OnlinePaymentRequest{
		OrderNumber: "ORD-TEST-001",
		Amount:      money.Amount(50000),
		Description: "Test voucher",
	})
	if err != nil {
		t.Fatalf("CreatePaymentRequest error: %v", err)
	}
	if res.RedirectURL == nil {
		t.Fatalf("expected redirect URL, got nil")
	}

	// Test Webhook Verification
	cb := tripayCallback{
		Reference:     "TRIPAY-REF-999",
		MerchantRef:   "ORD-TEST-001",
		TotalAmount:   50000,
		Status:        "PAID",
		PaymentMethod: "QRIS",
	}
	raw, _ := json.Marshal(cb)

	mac := hmac.New(sha256.New, []byte("test_private_key"))
	mac.Write(raw)
	sig := hex.EncodeToString(mac.Sum(nil))

	event, err := p.VerifyWebhook(context.Background(), raw, sig)
	if err != nil {
		t.Fatalf("VerifyWebhook error: %v", err)
	}

	if event.Status != payment.StatusCompleted {
		t.Fatalf("expected status completed, got %v", event.Status)
	}
	if event.ExternalID != "ORD-TEST-001" {
		t.Fatalf("expected external ID ORD-TEST-001, got %s", event.ExternalID)
	}
}
