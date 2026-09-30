package tripay

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
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
	apiKey       string
	privateKey   string
	merchantCode string
	isSandbox    bool
	callbackURL  string
	returnURL    string
	httpClient   *http.Client
}

func New(apiKey, privateKey, merchantCode string, isSandbox bool) *Provider {
	return &Provider{
		apiKey:       apiKey,
		privateKey:   privateKey,
		merchantCode: merchantCode,
		isSandbox:    isSandbox,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
	}
}

func (p *Provider) Name() string {
	return "tripay"
}

func (p *Provider) UpdateConfig(apiKey, privateKey, merchantCode string, isSandbox bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.apiKey = apiKey
	p.privateKey = privateKey
	p.merchantCode = merchantCode
	p.isSandbox = isSandbox
}

func (p *Provider) SetUrls(callbackURL, returnURL string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.callbackURL = callbackURL
	p.returnURL = returnURL
}

func (p *Provider) baseURL() string {
	if p.isSandbox {
		return "https://tripay.co.id/api-sandbox"
	}
	return "https://tripay.co.id/api"
}

type orderItem struct {
	SKU      string `json:"sku"`
	Name     string `json:"name"`
	Price    int64  `json:"price"`
	Quantity int    `json:"quantity"`
}

type tripayCreateRequest struct {
	Method        string      `json:"method"`
	MerchantRef   string      `json:"merchant_ref"`
	Amount        int64       `json:"amount"`
	CustomerName  string      `json:"customer_name"`
	CustomerEmail string      `json:"customer_email"`
	CustomerPhone string      `json:"customer_phone"`
	OrderItems    []orderItem `json:"order_items"`
	CallbackURL   string      `json:"callback_url,omitempty"`
	ReturnURL     string      `json:"return_url,omitempty"`
	ExpiredTime   int64       `json:"expired_time"`
	Signature     string      `json:"signature"`
}

type tripayCreateResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    struct {
		Reference     string `json:"reference"`
		MerchantRef   string `json:"merchant_ref"`
		PaymentMethod string `json:"payment_method"`
		PaymentName   string `json:"payment_name"`
		CheckoutURL   string `json:"checkout_url"`
		QRURL         string `json:"qr_url"`
		PayCode       string `json:"pay_code"`
		ExpiredTime   int64  `json:"expired_time"`
	} `json:"data"`
}

func (p *Provider) CreatePaymentRequest(ctx context.Context, req payment.OnlinePaymentRequest) (*payment.PaymentGatewayResponse, error) {
	p.mu.RLock()
	apiKey := p.apiKey
	privateKey := p.privateKey
	merchantCode := p.merchantCode
	baseURL := p.baseURL()
	callbackURL := p.callbackURL
	returnURL := p.returnURL
	p.mu.RUnlock()

	now := time.Now()
	expiredAt := now.Add(24 * time.Hour)

	if apiKey == "" || privateKey == "" || merchantCode == "" {
		mockURL := fmt.Sprintf("https://tripay.co.id/checkout/%s", req.OrderNumber)
		return &payment.PaymentGatewayResponse{
			ExternalID:  req.OrderNumber,
			RedirectURL: &mockURL,
			ExpiredAt:   expiredAt,
		}, nil
	}

	custName := req.CustomerName
	if custName == "" {
		custName = "Pelanggan GoGiga"
	}
	custEmail := req.CustomerEmail
	if custEmail == "" {
		custEmail = "customer@gogiga.net.id"
	}
	custPhone := req.CustomerPhone
	if custPhone == "" {
		custPhone = "081100000000"
	}

	// Signature: HMAC-SHA256(merchantCode + merchantRef + amount, privateKey)
	sigPayload := fmt.Sprintf("%s%s%d", merchantCode, req.OrderNumber, req.Amount.Int64())
	mac := hmac.New(sha256.New, []byte(privateKey))
	mac.Write([]byte(sigPayload))
	signature := hex.EncodeToString(mac.Sum(nil))

	var orderItems []orderItem
	if len(req.Items) > 0 {
		for _, itm := range req.Items {
			sku := itm.ID
			if sku == "" {
				sku = req.OrderNumber
			}
			qty := itm.Quantity
			if qty <= 0 {
				qty = 1
			}
			orderItems = append(orderItems, orderItem{
				SKU:      sku,
				Name:     itm.Name,
				Price:    itm.Price.Int64(),
				Quantity: qty,
			})
		}
	} else {
		orderItems = []orderItem{
			{
				SKU:      req.OrderNumber,
				Name:     req.Description,
				Price:    req.Amount.Int64(),
				Quantity: 1,
			},
		}
	}

	tripayReq := tripayCreateRequest{
		Method:        "QRIS", // Default channel, user can also open checkout_url
		MerchantRef:   req.OrderNumber,
		Amount:        req.Amount.Int64(),
		CustomerName:  custName,
		CustomerEmail: custEmail,
		CustomerPhone: custPhone,
		OrderItems:    orderItems,
		CallbackURL:   callbackURL,
		ReturnURL:     returnURL,
		ExpiredTime:   expiredAt.Unix(),
		Signature:     signature,
	}

	bodyBytes, err := json.Marshal(tripayReq)
	if err != nil {
		return nil, fmt.Errorf("tripay: failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/transaction/create", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("tripay: failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("tripay: request failed: %w", err)
	}
	defer resp.Body.Close()

	var tripayResp tripayCreateResponse
	if err := json.NewDecoder(resp.Body).Decode(&tripayResp); err != nil {
		return nil, fmt.Errorf("tripay: failed to parse response: %w", err)
	}

	if !tripayResp.Success {
		return nil, fmt.Errorf("tripay error: %s", tripayResp.Message)
	}

	res := &payment.PaymentGatewayResponse{
		ExternalID: req.OrderNumber,
		ExpiredAt:  time.Unix(tripayResp.Data.ExpiredTime, 0),
	}

	if tripayResp.Data.CheckoutURL != "" {
		res.RedirectURL = &tripayResp.Data.CheckoutURL
	}
	if tripayResp.Data.QRURL != "" {
		res.QRCodeURL = &tripayResp.Data.QRURL
	}
	if tripayResp.Data.PayCode != "" {
		res.VANumber = &tripayResp.Data.PayCode
	}

	return res, nil
}

type tripayCallback struct {
	Reference         string `json:"reference"`
	MerchantRef       string `json:"merchant_ref"`
	PaymentMethod     string `json:"payment_method"`
	PaymentMethodCode string `json:"payment_method_code"`
	TotalAmount       int64  `json:"total_amount"`
	Status            string `json:"status"`
	PaidAt            int64  `json:"paid_at"`
}

func (p *Provider) VerifyWebhook(ctx context.Context, payload []byte, signature string) (*payment.WebhookEvent, error) {
	p.mu.RLock()
	privateKey := p.privateKey
	p.mu.RUnlock()

	// Verify HMAC signature if privateKey is configured
	if privateKey != "" && signature != "" {
		mac := hmac.New(sha256.New, []byte(privateKey))
		mac.Write(payload)
		expectedSig := hex.EncodeToString(mac.Sum(nil))
		if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
			return nil, errors.New("tripay: webhook signature mismatch")
		}
	}

	var cb tripayCallback
	if err := json.Unmarshal(payload, &cb); err != nil {
		return nil, fmt.Errorf("tripay: invalid json payload: %w", err)
	}

	var status payment.Status
	switch cb.Status {
	case "PAID":
		status = payment.StatusCompleted
	case "EXPIRED", "FAILED":
		status = payment.StatusFailed
	case "REFUND":
		status = payment.StatusRefunded
	default:
		status = payment.StatusPending
	}

	paidAt := time.Now()
	if cb.PaidAt > 0 {
		paidAt = time.Unix(cb.PaidAt, 0)
	}

	return &payment.WebhookEvent{
		Provider:        "tripay",
		ExternalID:      cb.MerchantRef,
		IdempotencyKey:  fmt.Sprintf("tripay:%s:%s", cb.Reference, cb.Status),
		Status:          status,
		Amount:          money.Amount(cb.TotalAmount),
		PaidAt:          paidAt,
		RawPayload:      payload,
		GatewayResponse: cb,
	}, nil
}

func (p *Provider) GetPaymentStatus(ctx context.Context, externalID string) (*payment.Status, error) {
	st := payment.StatusPending
	return &st, nil
}
