package duitku

import (
	"bytes"
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gigabill/isp/internal/payment"
	"github.com/gigabill/isp/pkg/money"
)

type Provider struct {
	merchantCode string
	apiKey       string
	isSandbox    bool
	callbackURL  string
	returnURL    string
	httpClient   *http.Client
}

func New(merchantCode, apiKey string, isSandbox bool) *Provider {
	return &Provider{
		merchantCode: merchantCode,
		apiKey:       apiKey,
		isSandbox:    isSandbox,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (p *Provider) Name() string {
	return "duitku"
}

func (p *Provider) IsConfigured() bool {
	return p.merchantCode != "" && p.apiKey != ""
}

func (p *Provider) MerchantCode() string {
	return p.merchantCode
}

func (p *Provider) SetUrls(callbackURL, returnURL string) {
	p.callbackURL = callbackURL
	p.returnURL = returnURL
}

func (p *Provider) UpdateConfig(merchantCode, apiKey string, isSandbox bool) {
	p.merchantCode = merchantCode
	p.apiKey = apiKey
	p.isSandbox = isSandbox
}

func (p *Provider) generateSignature(merchantOrderId string, amount int64) string {
	data := fmt.Sprintf("%s%s%d%s", p.merchantCode, merchantOrderId, amount, p.apiKey)
	hash := md5.Sum([]byte(data))
	return hex.EncodeToString(hash[:])
}

func (p *Provider) generateCallbackSignature(amountStr, merchantOrderId string) string {
	data := fmt.Sprintf("%s%s%s%s", p.merchantCode, amountStr, merchantOrderId, p.apiKey)
	hash := md5.Sum([]byte(data))
	return hex.EncodeToString(hash[:])
}

type duitkuItemDetail struct {
	Name     string `json:"name"`
	Price    int64  `json:"price"`
	Quantity int    `json:"quantity"`
}

type inquiryRequest struct {
	MerchantCode     string             `json:"merchantCode"`
	PaymentAmount    int64              `json:"paymentAmount"`
	PaymentMethod    string             `json:"paymentMethod,omitempty"`
	MerchantOrderId  string             `json:"merchantOrderId"`
	ProductDetails   string             `json:"productDetails"`
	Email            string             `json:"email,omitempty"`
	PhoneNumber      string             `json:"phoneNumber,omitempty"`
	AdditionalParam  string             `json:"additionalParam,omitempty"`
	MerchantUserInfo string             `json:"merchantUserInfo,omitempty"`
	CustomerVaName   string             `json:"customerVaName,omitempty"`
	CallbackUrl      string             `json:"callbackUrl,omitempty"`
	ReturnUrl        string             `json:"returnUrl,omitempty"`
	Signature        string             `json:"signature"`
	ExpiryPeriod     int                `json:"expiryPeriod"` // in minutes
	ItemDetails      []duitkuItemDetail `json:"itemDetails,omitempty"`
}

type inquiryResponse struct {
	MerchantCode  string `json:"merchantCode"`
	Reference     string `json:"reference"`
	PaymentURL    string `json:"paymentUrl"`
	VaNumber      string `json:"vaNumber,omitempty"`
	Amount        string `json:"amount"`
	StatusCode    string `json:"statusCode"`
	StatusMessage string `json:"statusMessage"`
	QrString      string `json:"qrString,omitempty"`
}

func (p *Provider) CreatePaymentRequest(ctx context.Context, req payment.OnlinePaymentRequest) (*payment.PaymentGatewayResponse, error) {
	now := time.Now()
	expiredAt := now.Add(24 * time.Hour)

	amountInt := req.Amount.Int64()
	if amountInt <= 0 {
		return nil, errors.New("invalid payment amount for duitku")
	}

	resp := &payment.PaymentGatewayResponse{
		ExternalID: req.OrderNumber,
		ExpiredAt:  expiredAt,
	}

	// Fallback mock session if Duitku credentials are not configured yet
	if !p.IsConfigured() {
		mockURL := fmt.Sprintf("https://checkout.duitku.com/sandbox/pay?order=%s", req.OrderNumber)
		mockQR := fmt.Sprintf("00020101021226600016ID.DUITKU.WWW0118936009990000000000520458125303360540%d5802ID5912GIGABILL-ISP6007JAKARTA6304ABCD", amountInt)
		mockQRImg := fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=%s", url.QueryEscape(mockQR))
		resp.RedirectURL = &mockURL
		resp.QRCodeURL = &mockQRImg
		return resp, nil
	}

	apiBase := "https://passport.duitku.com/webapi/api/merchant/v2/inquiry"
	if p.isSandbox {
		apiBase = "https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry"
	}

	custName := req.CustomerName
	if custName == "" {
		custName = "Pelanggan ISPSYNC"
	}
	email := req.CustomerEmail
	if email == "" || !strings.Contains(email, "@") {
		email = "info@ispsync.id"
	}

	desc := req.Description
	if desc == "" {
		desc = "Layanan Akses Internet GigaBill - " + req.OrderNumber
	}
	if len(desc) > 255 {
		desc = desc[:255]
	}

	// Default to SP (ShopeePay / QRIS) if payment method is QRIS, or empty for full checkout
	duitkuMethod := ""
	if req.PaymentMethod == payment.MethodQRIS {
		duitkuMethod = "SP"
	}

	var duitkuItems []duitkuItemDetail
	if len(req.Items) > 0 {
		for _, itm := range req.Items {
			iName := itm.Name
			if len(iName) > 50 {
				iName = iName[:50]
			}
			qty := itm.Quantity
			if qty <= 0 {
				qty = 1
			}
			duitkuItems = append(duitkuItems, duitkuItemDetail{
				Name:     iName,
				Price:    itm.Price.Int64(),
				Quantity: qty,
			})
		}
	} else {
		duitkuItems = []duitkuItemDetail{
			{
				Name:     desc,
				Price:    amountInt,
				Quantity: 1,
			},
		}
	}

	sig := p.generateSignature(req.OrderNumber, amountInt)

	inqReq := inquiryRequest{
		MerchantCode:     p.merchantCode,
		PaymentAmount:    amountInt,
		PaymentMethod:    duitkuMethod,
		MerchantOrderId:  req.OrderNumber,
		ProductDetails:   desc,
		Email:            email,
		PhoneNumber:      req.CustomerPhone,
		CustomerVaName:   custName,
		CallbackUrl:      p.callbackURL,
		ReturnUrl:        p.returnURL,
		Signature:        sig,
		ExpiryPeriod:     1440, // 24 hours in minutes
		ItemDetails:      duitkuItems,
	}

	bodyBytes, err := json.Marshal(inqReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal duitku request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, apiBase, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	httpResp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("duitku request failed: %w", err)
	}
	defer httpResp.Body.Close()

	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read duitku response: %w", err)
	}

	if httpResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("duitku api error (%d): %s", httpResp.StatusCode, string(respBody))
	}

	var inqResp inquiryResponse
	if err := json.Unmarshal(respBody, &inqResp); err != nil {
		return nil, fmt.Errorf("failed to parse duitku response: %w", err)
	}

	if inqResp.StatusCode != "00" {
		return nil, fmt.Errorf("duitku inquiry rejected: [%s] %s", inqResp.StatusCode, inqResp.StatusMessage)
	}

	if inqResp.PaymentURL != "" {
		resp.RedirectURL = &inqResp.PaymentURL
	}
	if inqResp.VaNumber != "" {
		resp.VANumber = &inqResp.VaNumber
	}
	if inqResp.QrString != "" {
		qrImg := fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=%s", url.QueryEscape(inqResp.QrString))
		resp.QRCodeURL = &qrImg
	}
	if inqResp.Reference != "" {
		resp.Token = &inqResp.Reference
	}

	return resp, nil
}

type duitkuCallbackPayload struct {
	MerchantCode    string `json:"merchantCode"`
	Amount          string `json:"amount"`
	MerchantOrderId string `json:"merchantOrderId"`
	ProductDetail   string `json:"productDetail"`
	AdditionalParam string `json:"additionalParam"`
	PaymentCode     string `json:"paymentCode"`
	ResultCode      string `json:"resultCode"`
	MerchantUserId  string `json:"merchantUserId"`
	Reference       string `json:"reference"`
	Signature       string `json:"signature"`
	PublisherRef    string `json:"publisherRef"`
	SettlementDate  string `json:"settlementDate"`
	IssuerCode      string `json:"issuerCode"`
}

func (p *Provider) VerifyWebhook(ctx context.Context, payload []byte, headerSignature string) (*payment.WebhookEvent, error) {
	var cb duitkuCallbackPayload

	// Duitku may send JSON or form-url-encoded
	if strings.HasPrefix(strings.TrimSpace(string(payload)), "{") {
		if err := json.Unmarshal(payload, &cb); err != nil {
			return nil, fmt.Errorf("invalid duitku json payload: %w", err)
		}
	} else {
		vals, err := url.ParseQuery(string(payload))
		if err != nil {
			return nil, fmt.Errorf("failed to parse duitku form-urlencoded payload: %w", err)
		}
		cb.MerchantCode = vals.Get("merchantCode")
		cb.Amount = vals.Get("amount")
		cb.MerchantOrderId = vals.Get("merchantOrderId")
		cb.ProductDetail = vals.Get("productDetail")
		cb.AdditionalParam = vals.Get("additionalParam")
		cb.PaymentCode = vals.Get("paymentCode")
		cb.ResultCode = vals.Get("resultCode")
		cb.MerchantUserId = vals.Get("merchantUserId")
		cb.Reference = vals.Get("reference")
		cb.Signature = vals.Get("signature")
	}

	if cb.MerchantOrderId == "" {
		return nil, errors.New("missing merchantOrderId in duitku callback")
	}

	// Verify Signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
	if p.apiKey != "" {
		expectedSig := p.generateCallbackSignature(cb.Amount, cb.MerchantOrderId)
		if !strings.EqualFold(cb.Signature, expectedSig) {
			return nil, fmt.Errorf("duitku signature mismatch: got %s, expected %s", cb.Signature, expectedSig)
		}
	}

	amountParsed, _ := strconv.ParseInt(cb.Amount, 10, 64)
	if amountParsed == 0 {
		// Try float parse in case amount is "10000.00"
		if flt, err := strconv.ParseFloat(cb.Amount, 64); err == nil {
			amountParsed = int64(flt)
		}
	}

	status := payment.StatusProcessing
	if cb.ResultCode == "00" {
		status = payment.StatusCompleted
	} else if cb.ResultCode == "01" {
		status = payment.StatusPending
	} else {
		status = payment.StatusFailed
	}

	return &payment.WebhookEvent{
		Provider:        "duitku",
		ExternalID:      cb.MerchantOrderId,
		IdempotencyKey:  fmt.Sprintf("duitku:%s:%s", cb.Reference, cb.ResultCode),
		Status:          status,
		Amount:          money.Amount(amountParsed),
		PaidAt:          time.Now(),
		RawPayload:      payload,
		GatewayResponse: cb,
	}, nil
}

func (p *Provider) GetPaymentStatus(ctx context.Context, externalID string) (*payment.Status, error) {
	st := payment.StatusPending
	return &st, nil
}
