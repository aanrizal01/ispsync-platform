package duitku

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"testing"

	"github.com/gigabill/isp/internal/payment"
	"github.com/gigabill/isp/pkg/money"
)

func TestDuitkuProvider(t *testing.T) {
	merchantCode := "D1234"
	apiKey := "mysecretapikey"
	p := New(merchantCode, apiKey, true)

	if p.Name() != "duitku" {
		t.Fatalf("expected provider name duitku, got %s", p.Name())
	}

	if !p.IsConfigured() {
		t.Fatal("expected provider to be configured")
	}

	// Test Signature generation
	orderID := "ORD-TEST-123"
	amount := int64(50000)
	expectedSig := hex.EncodeToString(func() []byte {
		h := md5.Sum([]byte(fmt.Sprintf("%s%s%d%s", merchantCode, orderID, amount, apiKey)))
		return h[:]
	}())

	sig := p.generateSignature(orderID, amount)
	if sig != expectedSig {
		t.Fatalf("signature mismatch: expected %s, got %s", expectedSig, sig)
	}

	// Test Webhook Verification
	callbackSig := p.generateCallbackSignature("50000", orderID)
	jsonPayload := fmt.Sprintf(`{
		"merchantCode": "%s",
		"amount": "50000",
		"merchantOrderId": "%s",
		"productDetail": "Test Product",
		"resultCode": "00",
		"reference": "REF12345",
		"signature": "%s"
	}`, merchantCode, orderID, callbackSig)

	event, err := p.VerifyWebhook(context.Background(), []byte(jsonPayload), "")
	if err != nil {
		t.Fatalf("expected webhook verification to succeed, got error: %v", err)
	}

	if event.Status != payment.StatusCompleted {
		t.Fatalf("expected status COMPLETED, got %s", event.Status)
	}

	if event.ExternalID != orderID {
		t.Fatalf("expected orderID %s, got %s", orderID, event.ExternalID)
	}

	if event.Amount != money.Amount(50000) {
		t.Fatalf("expected amount 50000, got %v", event.Amount)
	}
}
