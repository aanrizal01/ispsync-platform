// Package fibergrid adalah klien HTTP Nexus -> FiberGrid (Engine 1) memakai X-Internal-Key terbatas.
package fibergrid

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// ErrNotConfigured dikembalikan bila FTTX_INTERNAL_KEY belum diisi.
var ErrNotConfigured = errors.New("integrasi FiberGrid belum dikonfigurasi (FTTX_INTERNAL_KEY)")

// ErrNotFound dikembalikan bila ONT/CPE tidak ada di FiberGrid.
var ErrNotFound = errors.New("perangkat tidak ditemukan di FiberGrid")

type Client struct {
	baseURL string
	key     string
	http    *http.Client
}

// NewFromEnv membaca FTTX_BASE_URL (default http://127.0.0.1:8082) dan FTTX_INTERNAL_KEY.
func NewFromEnv() *Client {
	base := strings.TrimRight(strings.TrimSpace(os.Getenv("FTTX_BASE_URL")), "/")
	if base == "" {
		base = "http://127.0.0.1:8082"
	}
	return &Client{
		baseURL: base,
		key:     strings.TrimSpace(os.Getenv("FTTX_INTERNAL_KEY")),
		http:    &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Configured() bool { return c != nil && c.key != "" }

// envelope bentuk respons FiberGrid: {success, message, data}.
type envelope struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Error   string          `json:"error"`
	Data    json.RawMessage `json:"data"`
}

func (c *Client) do(ctx context.Context, method, path string, body interface{}) (json.RawMessage, error) {
	if !c.Configured() {
		return nil, ErrNotConfigured
	}
	var rd io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		rd = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, rd)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Internal-Key", c.key)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("FiberGrid tidak dapat dihubungi: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	var env envelope
	_ = json.Unmarshal(raw, &env)
	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrNotFound
	}
	if resp.StatusCode >= 300 || (env.Data == nil && !env.Success) {
		msg := env.Message
		if msg == "" {
			msg = env.Error
		}
		if msg == "" {
			msg = resp.Status
		}
		return nil, fmt.Errorf("FiberGrid menolak permintaan (%d): %s", resp.StatusCode, msg)
	}
	return env.Data, nil
}

// ONT ringkasan telemetri hasil lookup persis.
type ONT struct {
	SerialNumber   string  `json:"serial_number"`
	RegistrationNo string  `json:"registration_no"`
	Brand          string  `json:"brand"`
	Model          string  `json:"model"`
	SignalRxDBM    float64 `json:"signal_rx_dbm"`
	Status         string  `json:"status"`
}

// LookupONT mencari ONT persis berdasarkan SN.
func (c *Client) LookupONT(ctx context.Context, sn string) (*ONT, error) {
	data, err := c.do(ctx, http.MethodGet, "/api/v1/internal/ont/lookup?sn="+url.QueryEscape(sn), nil)
	if err != nil {
		return nil, err
	}
	var o ONT
	if err := json.Unmarshal(data, &o); err != nil {
		return nil, err
	}
	return &o, nil
}

// RegisterONTRequest data minimum untuk mencatat ONT di FiberGrid.
type RegisterONTRequest struct {
	SerialNumber   string `json:"serial_number"`
	MACAddress     string `json:"mac_address,omitempty"`
	PONPort        string `json:"pon_port,omitempty"`
	RegistrationNo string `json:"registration_no"`
	CustomerName   string `json:"customer_name"`
}

// RegisterONT mencatat ONT di FiberGrid (idempotensi ditentukan FiberGrid).
func (c *Client) RegisterONT(ctx context.Context, r RegisterONTRequest) (json.RawMessage, error) {
	return c.do(ctx, http.MethodPost, "/api/v1/internal/ont/register", r)
}

// GetCPE membaca data CPE/TR-069 mentah untuk SN.
func (c *Client) GetCPE(ctx context.Context, sn string) (json.RawMessage, error) {
	return c.do(ctx, http.MethodGet, "/api/v1/internal/acs/cpe/"+url.PathEscape(sn), nil)
}

// GetWifi membaca konfigurasi Wi-Fi.
func (c *Client) GetWifi(ctx context.Context, sn string) (json.RawMessage, error) {
	return c.do(ctx, http.MethodGet, "/api/v1/internal/acs/cpe/"+url.PathEscape(sn)+"/wifi", nil)
}

// UpdateWifi meneruskan perubahan Wi-Fi (body apa adanya ke FiberGrid).
func (c *Client) UpdateWifi(ctx context.Context, sn string, body map[string]interface{}) (json.RawMessage, error) {
	return c.do(ctx, http.MethodPut, "/api/v1/internal/acs/cpe/"+url.PathEscape(sn)+"/wifi", body)
}

// Reboot memerintahkan reboot modem.
func (c *Client) Reboot(ctx context.Context, sn string) (json.RawMessage, error) {
	return c.do(ctx, http.MethodPost, "/api/v1/internal/acs/cpe/"+url.PathEscape(sn)+"/reboot", nil)
}
