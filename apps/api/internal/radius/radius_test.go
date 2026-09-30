package radius

import (
	"fmt"
	"testing"
)

func TestRateLimitFormatting(t *testing.T) {
	downKbps := int64(50000)
	upKbps := int64(20000)
	rateLimitStr := fmt.Sprintf("%dk/%dk", upKbps, downKbps)

	expected := "20000k/50000k"
	if rateLimitStr != expected {
		t.Fatalf("expected rate limit %s, got %s", expected, rateLimitStr)
	}
}

func TestDisconnectSessionRequestValidation(t *testing.T) {
	req := DisconnectSessionRequest{
		NasIPAddress:  "192.168.88.1",
		Username:      "user01@ispsync.id",
		AcctSessionID: "81a00001",
	}

	if req.NasIPAddress == "" {
		t.Fatal("nas ip should not be empty")
	}
	if req.Username == "" {
		t.Fatal("username should not be empty")
	}
	if req.AcctSessionID == "" {
		t.Fatal("session id should not be empty")
	}
}
