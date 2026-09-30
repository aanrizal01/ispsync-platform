package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Provider implements notification.Sender for the Telegram Bot API.
type Provider struct {
	botToken   string
	httpClient *http.Client
}

func NewProvider(botToken string) *Provider {
	return &Provider{
		botToken: botToken,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (p *Provider) Send(ctx context.Context, recipient string, subject string, body string) error {
	if p.botToken == "" {
		// Simulation mode when token is not configured
		return nil
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", p.botToken)

	messageText := body
	if subject != "" {
		messageText = fmt.Sprintf("<b>%s</b>\n\n%s", subject, body)
	}

	payload := map[string]any{
		"chat_id":    recipient,
		"text":       messageText,
		"parse_mode": "HTML",
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(jsonBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("telegram send message request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram API error (%d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}
