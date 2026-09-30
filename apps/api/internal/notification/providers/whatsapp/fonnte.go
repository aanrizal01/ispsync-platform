package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Provider implements notification.Sender for WhatsApp using Fonnte API.
type Provider struct {
	apiToken   string
	httpClient *http.Client
}

func NewProvider(apiToken string) *Provider {
	return &Provider{
		apiToken: apiToken,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (p *Provider) Send(ctx context.Context, recipient string, subject string, body string) error {
	if p.apiToken == "" {
		// Simulation mode when token is not configured
		return nil
	}

	const url = "https://api.fonnte.com/send"

	messageText := body
	if subject != "" {
		messageText = fmt.Sprintf("*%s*\n\n%s", subject, body)
	}

	payload := map[string]any{
		"target":  recipient,
		"message": messageText,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(jsonBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", p.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("whatsapp send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("whatsapp API error (%d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}
