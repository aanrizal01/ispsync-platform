package xendit

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gigabill/isp/internal/payment"
	"github.com/gigabill/isp/pkg/money"
)

type Provider struct {
	mu           sync.RWMutex
	secretKey    string
	webhookToken string
	httpClient   *http.Client
}

func New(secretKey, webhookToken string) *Provider {
	return &Provider{
		secretKey:    secretKey,
		webhookToken: webhookToken,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
	}
}

func (p *Provider) UpdateConfig(secretKey, webhookToken string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.secretKey = secretKey
	p.webhookToken = webhookToken
}

func (p *Provider) Name() string {
	return "xendit"
}

type xenditItem struct {
	Name     string `json:"name"`
	Quantity int    `json:"quantity"`
	Price    int64  `json:"price"`
	Category string `json:"category,omitempty"`
}

type createInvoiceRequest struct {
	ExternalID      string          `json:"external_id"`
	Amount          int64           `json:"amount"`
	Description     string          `json:"description,omitempty"`
	PayerEmail      string          `json:"payer_email,omitempty"`
	InvoiceDuration int             `json:"invoice_duration"`
	Customer        *xenditCustomer `json:"customer,omitempty"`
	Items           []xenditItem    `json:"items,omitempty"`
}

type xenditCustomer struct {
	GivenNames   string `json:"given_names,omitempty"`
	Email        string `json:"email,omitempty"`
	MobileNumber string `json:"mobile_number,omitempty"`
}

type createInvoiceResponse struct {
	ID         string `json:"id"`
	ExternalID string `json:"external_id"`
	InvoiceURL string `json:"invoice_url"`
	Status     string `json:"status"`
	ExpiryDate string `json:"expiry_date"`
	Message    string `json:"message,omitempty"`
}

func (p *Provider) CreatePaymentRequest(ctx context.Context, req payment.OnlinePaymentRequest) (*payment.PaymentGatewayResponse, error) {
	p.mu.RLock()
	secretKey := p.secretKey
	p.mu.RUnlock()

	now := time.Now()
	expiredAt := now.Add(24 * time.Hour)

	// If no secret key is set yet, provide mock checkout URL
	if secretKey == "" {
		invURL := fmt.Sprintf("https://checkout.xendit.co/web/%s", req.OrderNumber)
		return &payment.PaymentGatewayResponse{
			ExternalID:  req.OrderNumber,
			RedirectURL: &invURL,
			ExpiredAt:   expiredAt,
		}, nil
	}

	var xenditItems []xenditItem
	if len(req.Items) > 0 {
		for _, itm := range req.Items {
			qty := itm.Quantity
			if qty <= 0 {
				qty = 1
			}
			xenditItems = append(xenditItems, xenditItem{
				Name:     itm.Name,
				Quantity: qty,
				Price:    itm.Price.Int64(),
				Category: itm.Category,
			})
		}
	} else if req.Description != "" {
		xenditItems = []xenditItem{
			{
				Name:     req.Description,
				Quantity: 1,
				Price:    req.Amount.Int64(),
				Category: "WiFi",
			},
		}
	}

	body := createInvoiceRequest{
		ExternalID:      req.OrderNumber,
		Amount:          req.Amount.Int64(),
		Description:     req.Description,
		PayerEmail:      req.CustomerEmail,
		InvoiceDuration: 86400,
		Items:           xenditItems,
	}

	if req.CustomerName != "" || req.CustomerPhone != "" || req.CustomerEmail != "" {
		body.Customer = &xenditCustomer{
			GivenNames:   req.CustomerName,
			Email:        req.CustomerEmail,
			MobileNumber: req.CustomerPhone,
		}
	}

	jsonBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("xendit: failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.xendit.co/v2/invoices", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, fmt.Errorf("xendit: failed to create http request: %w", err)
	}

	httpReq.SetBasicAuth(secretKey, "")
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("xendit: request error: %w", err)
	}
	defer resp.Body.Close()

	var invResp createInvoiceResponse
	if err := json.NewDecoder(resp.Body).Decode(&invResp); err != nil {
		return nil, fmt.Errorf("xendit: failed to decode response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("xendit error (HTTP %d): %s", resp.StatusCode, invResp.Message)
	}

	if invResp.ExpiryDate != "" {
		if t, err := time.Parse(time.RFC3339, invResp.ExpiryDate); err == nil {
			expiredAt = t
		}
	}

	return &payment.PaymentGatewayResponse{
		ExternalID:  invResp.ExternalID,
		RedirectURL: &invResp.InvoiceURL,
		ExpiredAt:   expiredAt,
	}, nil
}

type xenditCallback struct {
	ID                     string `json:"id"`
	ExternalID             string `json:"external_id"`
	Status                 string `json:"status"`
	Amount                 int64  `json:"amount"`
	PaymentMethod          string `json:"payment_method"`
	PaidAt                 string `json:"paid_at"`
	CallbackVirtualAccount string `json:"callback_virtual_account_id"`
}

func (p *Provider) VerifyWebhook(ctx context.Context, payload []byte, token string) (*payment.WebhookEvent, error) {
	p.mu.RLock()
	webhookToken := p.webhookToken
	p.mu.RUnlock()

	// Verify Xendit webhook verification token
	if webhookToken != "" && token != webhookToken {
		return nil, errors.New("xendit callback token mismatch")
	}

	var cb xenditCallback
	if err := json.Unmarshal(payload, &cb); err != nil {
		return nil, fmt.Errorf("invalid json payload: %w", err)
	}

	var status payment.Status
	switch cb.Status {
	case "PAID", "SETTLED", "COMPLETED":
		status = payment.StatusCompleted
	case "PENDING":
		status = payment.StatusPending
	case "EXPIRED":
		status = payment.StatusFailed
	default:
		status = payment.StatusProcessing
	}

	paidAt := time.Now()
	if cb.PaidAt != "" {
		if t, err := time.Parse(time.RFC3339, cb.PaidAt); err == nil {
			paidAt = t
		}
	}

	return &payment.WebhookEvent{
		Provider:        "xendit",
		ExternalID:      cb.ExternalID,
		IdempotencyKey:  fmt.Sprintf("xendit:%s:%s", cb.ID, cb.Status),
		Status:          status,
		Amount:          money.Amount(cb.Amount),
		PaidAt:          paidAt,
		RawPayload:      payload,
		GatewayResponse: cb,
	}, nil
}

func (p *Provider) GetPaymentStatus(ctx context.Context, externalID string) (*payment.Status, error) {
	st := payment.StatusPending
	return &st, nil
}
