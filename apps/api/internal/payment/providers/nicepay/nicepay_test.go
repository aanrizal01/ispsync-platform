package nicepay

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"testing"

	"github.com/gigabill/isp/internal/payment"
	"github.com/gigabill/isp/pkg/money"
)

func TestNicepayProvider(t *testing.T) {
	p := New("", "33F84525CD360F7081D0169642A80961", true)
	if p.Name() != "nicepay" {
		t.Fatalf("expected name nicepay, got %s", p.Name())
	}

	// Test mock payment creation
	res, err := p.CreatePaymentRequest(context.Background(), payment.OnlinePaymentRequest{
		OrderNumber: "ORD-NP-001",
		Amount:      money.Amount(75000),
		Description: "Test Passpoint",
	})
	if err != nil {
		t.Fatalf("CreatePaymentRequest error: %v", err)
	}
	if res.RedirectURL == nil {
		t.Fatalf("expected redirect URL, got nil")
	}

	// Test Webhook Verification
	rawToken := "" + "ORD-NP-001" + "75000" + "33F84525CD360F7081D0169642A80961"
	hasher := sha256.New()
	hasher.Write([]byte(rawToken))
	token := hex.EncodeToString(hasher.Sum(nil))

	cb := nicepayCallback{
		TXid:          "NICEPAYTX12345",
		ReferenceNo:   "ORD-NP-001",
		Amt:           "75000",
		Status:        "0",
		ResultCd:      "0000",
		MerchantToken: token,
	}
	raw, _ := json.Marshal(cb)

	event, err := p.VerifyWebhook(context.Background(), raw, "")
	if err != nil {
		t.Fatalf("VerifyWebhook error: %v", err)
	}

	if event.Status != payment.StatusCompleted {
		t.Fatalf("expected status completed, got %v", event.Status)
	}
	if event.ExternalID != "ORD-NP-001" {
		t.Fatalf("expected external ID ORD-NP-001, got %s", event.ExternalID)
	}
}
