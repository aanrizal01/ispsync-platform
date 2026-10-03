package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// WablasProvider implements notification.Sender for WhatsApp using Wablas API.
type WablasProvider struct {
	apiToken   string
	serverURL  string
	httpClient *http.Client
}

func NewWablasProvider(apiToken, serverURL string) *WablasProvider {
	if serverURL == "" {
		serverURL = "https://api.wablas.com"
	}
	serverURL = strings.TrimRight(strings.TrimSpace(serverURL), "/")
	if !strings.HasPrefix(serverURL, "http://") && !strings.HasPrefix(serverURL, "https://") {
		serverURL = "https://" + serverURL
	}

	return &WablasProvider{
		apiToken:  strings.TrimSpace(apiToken),
		serverURL: serverURL,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// NormalizePhone converts phone numbers to 628xxx format suitable for WhatsApp gateways.
func NormalizePhone(phone string) string {
	phone = strings.TrimSpace(phone)
	// Remove punctuation and non-digit characters
	cleaned := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	if strings.HasPrefix(cleaned, "0") {
		return "62" + cleaned[1:]
	}
	if strings.HasPrefix(cleaned, "8") {
		return "62" + cleaned
	}
	return cleaned
}

func (p *WablasProvider) Send(ctx context.Context, recipient string, subject string, body string) error {
	if p.apiToken == "" {
		return fmt.Errorf("token API Wablas belum dikonfigurasi")
	}

	targetPhone := NormalizePhone(recipient)
	if targetPhone == "" {
		return fmt.Errorf("nomor tujuan WhatsApp tidak valid")
	}

	messageText := body
	if subject != "" {
		messageText = fmt.Sprintf("*%s*\n\n%s", subject, body)
	}

	endpoint := fmt.Sprintf("%s/api/send-message", p.serverURL)

	payload := map[string]any{
		"phone":   targetPhone,
		"message": messageText,
		"token":   p.apiToken,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal wablas payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(jsonBytes))
	if err != nil {
		return fmt.Errorf("create wablas request: %w", err)
	}

	req.Header.Set("Authorization", p.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("wablas request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read wablas response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("wablas API error (%d): %s", resp.StatusCode, string(respBody))
	}

	// Parse JSON to verify status flag from Wablas
	var resObj struct {
		Status  any    `json:"status"`
		Message string `json:"message"`
		Reason  string `json:"reason"`
	}
	if err := json.Unmarshal(respBody, &resObj); err == nil {
		switch v := resObj.Status.(type) {
		case bool:
			if !v {
				errMsg := resObj.Message
				if errMsg == "" {
					errMsg = resObj.Reason
				}
				if errMsg == "" {
					errMsg = "status false from wablas"
				}
				return fmt.Errorf("wablas gateway returned error: %s", errMsg)
			}
		case string:
			if strings.EqualFold(v, "false") || strings.EqualFold(v, "error") {
				errMsg := resObj.Message
				if errMsg == "" {
					errMsg = resObj.Reason
				}
				if errMsg == "" {
					errMsg = "status false from wablas"
				}
				return fmt.Errorf("wablas gateway returned error: %s", errMsg)
			}
		}
	}

	return nil
}
