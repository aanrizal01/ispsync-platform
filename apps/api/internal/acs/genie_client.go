package acs

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// ErrNoAdminKey is returned when the FTTX Engine is targeted but no admin key is configured.
var ErrNoAdminKey = errors.New("FTTX_ADMIN_KEY belum dikonfigurasi")

type GenieClient struct {
	baseURL    string
	adminKey   string
	httpClient *http.Client
	logger     *slog.Logger
}

func NewGenieClient(baseURL, adminKey string, logger *slog.Logger) *GenieClient {
	if baseURL == "" {
		baseURL = "http://localhost:8082"
	}
	if logger == nil {
		logger = slog.Default()
	}
	c := &GenieClient{
		baseURL:  strings.TrimRight(baseURL, "/"),
		adminKey: strings.TrimSpace(adminKey),
		httpClient: &http.Client{
			// OLT-side actions (reboot via CLI) can take a while on the FTTX Engine.
			Timeout: 60 * time.Second,
		},
		logger: logger,
	}
	if c.isFTTX() && c.adminKey == "" {
		logger.Warn("FTTX_ADMIN_KEY kosong: panggilan ke FTTX Engine akan ditolak", "base_url", c.baseURL)
	}
	return c
}

// isFTTX reports whether the base URL points to the FTTX Engine (vs legacy GenieACS NBI).
func (c *GenieClient) isFTTX() bool {
	return strings.Contains(c.baseURL, "8082") || strings.Contains(c.baseURL, "fttx")
}

// doFTTX performs an authenticated JSON request against the FTTX Engine and
// returns an error for transport failures and any HTTP status >= 400.
func (c *GenieClient) doFTTX(ctx context.Context, method, path string, payload any) error {
	if c.adminKey == "" {
		return ErrNoAdminKey
	}
	var body io.Reader
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		body = bytes.NewReader(b)
	}
	targetURL := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, method, targetURL, body)
	if err != nil {
		return err
	}
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("X-Admin-Key", c.adminKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("FTTX Engine tidak dapat dihubungi (%s): %w", targetURL, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("FTTX Engine %s %s gagal: status %d: %s", method, path, resp.StatusCode, readErrorMessage(resp.Body))
	}
	return nil
}

// doGenie posts a task to the legacy GenieACS NBI and propagates errors.
func (c *GenieClient) doGenie(ctx context.Context, serialNumber string, task map[string]interface{}) error {
	deviceQuery := url.QueryEscape(fmt.Sprintf(`{"_id":"%s"}`, serialNumber))
	targetURL := fmt.Sprintf("%s/devices/%s/tasks?connection_request", c.baseURL, deviceQuery)

	body, err := json.Marshal(task)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, targetURL, bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("GenieACS NBI tidak dapat dihubungi (%s): %w", c.baseURL, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("GenieACS NBI task %v gagal: status %d: %s", task["name"], resp.StatusCode, readErrorMessage(resp.Body))
	}
	return nil
}

// readErrorMessage extracts a short error message from a JSON or text body.
func readErrorMessage(r io.Reader) string {
	raw, _ := io.ReadAll(io.LimitReader(r, 4096))
	var env struct {
		Error   any    `json:"error"`
		Message string `json:"message"`
	}
	if json.Unmarshal(raw, &env) == nil {
		if env.Message != "" {
			return env.Message
		}
		switch e := env.Error.(type) {
		case string:
			if e != "" {
				return e
			}
		case map[string]any:
			if m, ok := e["message"].(string); ok && m != "" {
				return m
			}
		}
	}
	msg := strings.TrimSpace(string(raw))
	if len(msg) > 300 {
		msg = msg[:300]
	}
	return msg
}

// PushWiFiConfiguration sends WiFi update task via FTTX Engine or GenieACS NBI
func (c *GenieClient) PushWiFiConfiguration(ctx context.Context, serialNumber string, vendor VendorType, ssid, password string) error {
	// If pointing to FTTX Engine (Port 8082 or domain fttx)
	if c.isFTTX() {
		// Contract: FTTX domain.UpdateWifiRequest (PUT /api/v1/fttx/acs/cpe/{sn}/wifi)
		payload := map[string]string{
			"ssid_2g":     ssid,
			"password_2g": password,
		}
		return c.doFTTX(ctx, http.MethodPut, "/api/v1/fttx/acs/cpe/"+url.PathEscape(serialNumber)+"/wifi", payload)
	}

	// Legacy GenieACS NBI
	var paramValues [][]interface{}
	switch vendor {
	case VendorHuawei, VendorZTE:
		paramValues = [][]interface{}{
			{"InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", ssid, "xsd:string"},
			{"InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase", password, "xsd:string"},
		}
	default:
		paramValues = [][]interface{}{
			{"InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", ssid, "xsd:string"},
			{"InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase", password, "xsd:string"},
		}
	}

	return c.doGenie(ctx, serialNumber, map[string]interface{}{
		"name":            "setParameterValues",
		"parameterValues": paramValues,
	})
}

// RebootONT sends RPC Reboot to ONT via FTTX Engine or GenieACS
func (c *GenieClient) RebootONT(ctx context.Context, serialNumber string) error {
	// If pointing to FTTX Engine: reboot is executed via OLT CLI remote action.
	// The FTTX handler accepts either the ONT ID or its serial number.
	if c.isFTTX() {
		return c.doFTTX(ctx, http.MethodPost, "/api/v1/fttx/ont/"+url.PathEscape(serialNumber)+"/action",
			map[string]string{"action": "reboot"})
	}

	// Legacy GenieACS
	return c.doGenie(ctx, serialNumber, map[string]interface{}{"name": "reboot"})
}

// Ping checks whether the FTTX Engine or GenieACS endpoint is reachable
func (c *GenieClient) Ping(ctx context.Context) error {
	// 1. If pointing to FTTX Engine (Port 8082 or domain fttx)
	if c.isFTTX() {
		if err := c.doFTTX(ctx, http.MethodGet, "/api/v1/fttx/monitoring/dashboard", nil); err != nil {
			return fmt.Errorf("gagal terhubung ke FTTX Engine (%s): %w", c.baseURL, err)
		}
		return nil
	}

	// 2. Fallback to GenieACS NBI check
	pingURL := fmt.Sprintf("%s/devices?limit=1", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pingURL, nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("gagal terhubung ke GenieACS NBI (%s): %w", c.baseURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("GenieACS NBI merespon status error %d", resp.StatusCode)
	}
	return nil
}

// GetBaseURL returns the configured base URL
func (c *GenieClient) GetBaseURL() string {
	return c.baseURL
}
