package network

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"testing"
)

func TestJuniperAdapter(t *testing.T) {
	// Mock Junos REST API server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if !ok || user != "admin" || pass != "secret123" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		path := r.URL.Path
		switch path {
		case "/rpc/get-system-information":
			resp := map[string]any{
				"system-information": []map[string]any{
					{
						"hardware-model": []map[string]any{{"data": "MX204"}},
						"os-name":        []map[string]any{{"data": "Junos"}},
						"os-version":     []map[string]any{{"data": "21.4R3-S5.4"}},
						"host-name":      []map[string]any{{"data": "bng01-juniper-mx"}},
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(resp)

		case "/rpc/get-route-engine-information":
			resp := map[string]any{
				"route-engine-information": []map[string]any{
					{
						"route-engine": []map[string]any{
							{
								"cpu-idle":           []map[string]any{{"data": "84"}},
								"memory-buffer-util": []map[string]any{{"data": "35"}},
								"up-time":            []map[string]any{{"data": "145 days, 4 hours"}},
							},
						},
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(resp)

		case "/rpc/load-configuration":
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"output": "configuration loaded successfully"}`))

		case "/rpc/clear-subscribers-session":
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"output": "cleared session"}`))

		default:
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer mockServer.Close()

	u, err := url.Parse(mockServer.URL)
	if err != nil {
		t.Fatalf("failed to parse mock server url: %v", err)
	}
	port, _ := strconv.Atoi(u.Port())

	adapter := NewJuniperAdapter(u.Hostname(), port, "admin", "secret123", false)
	ctx := context.Background()

	// 1. Test Ping
	if err := adapter.Ping(ctx); err != nil {
		t.Errorf("expected ping to succeed, got: %v", err)
	}

	// 2. Test GetSystemInfo
	info, err := adapter.GetSystemInfo(ctx)
	if err != nil {
		t.Fatalf("expected get system info to succeed, got: %v", err)
	}
	if info.BoardName != "MX204" {
		t.Errorf("expected BoardName MX204, got %s", info.BoardName)
	}
	if info.Version != "21.4R3-S5.4" {
		t.Errorf("expected Version 21.4R3-S5.4, got %s", info.Version)
	}
	if info.CPULoad != 16 { // 100 - 84 = 16%
		t.Errorf("expected CPULoad 16%%, got %d%%", info.CPULoad)
	}

	// 3. Test SyncPPPoEProfile
	err = adapter.SyncPPPoEProfile(ctx, PPPoEProfile{
		Name:          "50M-FIBER",
		LocalAddress:  "10.200.0.1",
		RemoteAddress: "10.200.0.0/24",
		RateLimit:     "50M/50M",
		DNSServers:    []string{"1.1.1.1", "8.8.8.8"},
	})
	if err != nil {
		t.Errorf("SyncPPPoEProfile failed: %v", err)
	}

	// 4. Test ProvisionPPPoEUser
	err = adapter.ProvisionPPPoEUser(ctx, PPPoESecret{
		Username: "cust100@ispsync.id",
		Password: "password123",
		Profile:  "50M-FIBER",
		Service:  "pppoe",
	})
	if err != nil {
		t.Errorf("ProvisionPPPoEUser failed: %v", err)
	}

	// 5. Test Simple Queue / Policer
	err = adapter.SetSimpleQueue(ctx, SimpleQueue{
		Name:       "policer-cust100",
		Target:     "10.200.0.45/32",
		MaxLimit:   "50M/50M",
		Comment:    "VIP customer",
		BurstLimit: "60M/60M",
	})
	if err != nil {
		t.Errorf("SetSimpleQueue failed: %v", err)
	}

	// 6. Test Walled Garden
	err = adapter.AddWalledGarden(ctx, WalledGardenEntry{
		DstHost: "ispsync.id",
		DstPort: "80",
		Action:  "allow",
	})
	if err != nil {
		t.Errorf("AddWalledGarden failed: %v", err)
	}

	// 7. Test DisconnectActiveSession (REST API succeeds, CoA may warn/fail without listener, dual-mode succeeds)
	err = adapter.DisconnectActiveSession(ctx, "cust100@ispsync.id")
	if err != nil {
		t.Errorf("DisconnectActiveSession failed: %v", err)
	}
}
