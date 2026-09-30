package acs

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

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
	if adminKey == "" {
		adminKey = "ispsync-noc-admin-99a8f27c3d14"
	}
	return &GenieClient{
		baseURL:  strings.TrimRight(baseURL, "/"),
		adminKey: adminKey,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		logger: logger,
	}
}

// PushWiFiConfiguration sends WiFi update task via FTTX Engine or GenieACS NBI
func (c *GenieClient) PushWiFiConfiguration(ctx context.Context, serialNumber string, vendor VendorType, ssid, password string) error {
	// If pointing to FTTX Engine (Port 8082 or domain fttx)
	if strings.Contains(c.baseURL, "8082") || strings.Contains(c.baseURL, "fttx") {
		targetURL := fmt.Sprintf("%s/api/v1/wholesale/me/onts/%s/wifi", c.baseURL, url.PathEscape(serialNumber))
		payload := map[string]string{
			"ssid":     ssid,
			"password": password,
		}
		body, err := json.Marshal(payload)
		if err != nil {
			return err
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPut, targetURL, bytes.NewBuffer(body))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		if c.adminKey != "" {
			req.Header.Set("X-Admin-Key", c.adminKey)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			c.logger.Warn("FTTX Engine WiFi update unreachable", "url", targetURL, "error", err)
			return nil
		}
		defer resp.Body.Close()
		return nil
	}

	// Legacy GenieACS NBI
	deviceQuery := url.QueryEscape(fmt.Sprintf(`{"_id":"%s"}`, serialNumber))
	targetURL := fmt.Sprintf("%s/devices/%s/tasks?connection_request", c.baseURL, deviceQuery)

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

	taskPayload := map[string]interface{}{
		"name":            "setParameterValues",
		"parameterValues": paramValues,
	}

	body, err := json.Marshal(taskPayload)
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
		c.logger.Warn("GenieACS NBI connection unreachable (running offline fallback)", "url", targetURL, "error", err)
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		c.logger.Warn("GenieACS returned error response", "status", resp.StatusCode)
	}

	return nil
}

// RebootONT sends RPC Reboot to ONT via FTTX Engine or GenieACS
func (c *GenieClient) RebootONT(ctx context.Context, serialNumber string) error {
	// If pointing to FTTX Engine
	if strings.Contains(c.baseURL, "8082") || strings.Contains(c.baseURL, "fttx") {
		targetURL := fmt.Sprintf("%s/api/v1/fttx/ont/%s/reboot", c.baseURL, url.PathEscape(serialNumber))
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, targetURL, nil)
		if err != nil {
			return err
		}
		if c.adminKey != "" {
			req.Header.Set("X-Admin-Key", c.adminKey)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			c.logger.Warn("FTTX Engine reboot unreachable", "error", err)
			return nil
		}
		defer resp.Body.Close()
		return nil
	}

	// Legacy GenieACS
	deviceQuery := url.QueryEscape(fmt.Sprintf(`{"_id":"%s"}`, serialNumber))
	targetURL := fmt.Sprintf("%s/devices/%s/tasks?connection_request", c.baseURL, deviceQuery)

	taskPayload := map[string]interface{}{
		"name": "reboot",
	}

	body, err := json.Marshal(taskPayload)
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
		c.logger.Warn("GenieACS NBI reboot unreachable (running offline fallback)", "error", err)
		return nil
	}
	defer resp.Body.Close()

	return nil
}

// Ping checks whether the FTTX Engine or GenieACS endpoint is reachable
func (c *GenieClient) Ping(ctx context.Context) error {
	// 1. If pointing to FTTX Engine (Port 8082 or domain fttx)
	if strings.Contains(c.baseURL, "8082") || strings.Contains(c.baseURL, "fttx") {
		pingURL := fmt.Sprintf("%s/api/v1/fttx/monitoring/dashboard", c.baseURL)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, pingURL, nil)
		if err != nil {
			return err
		}
		if c.adminKey != "" {
			req.Header.Set("X-Admin-Key", c.adminKey)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return fmt.Errorf("gagal terhubung ke FTTX Engine (%s): %w", c.baseURL, err)
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			return fmt.Errorf("FTTX Engine merespon status error %d", resp.StatusCode)
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
