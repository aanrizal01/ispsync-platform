package nicepay

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gigabill/isp/internal/payment"
	"github.com/gigabill/isp/pkg/money"
)

type Provider struct {
	mu          sync.RWMutex
	imid        string
	merchantKey string
	isSandbox   bool
	callbackURL string
	returnURL   string
	httpClient  *http.Client
}

func New(imid, merchantKey string, isSandbox bool) *Provider {
	return &Provider{
		imid:        imid,
		merchantKey: merchantKey,
		isSandbox:   isSandbox,
		httpClient:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (p *Provider) Name() string {
	return "nicepay"
}

func (p *Provider) UpdateConfig(imid, merchantKey string, isSandbox bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.imid = imid
	p.merchantKey = merchantKey
	p.isSandbox = isSandbox
}

func (p *Provider) SetUrls(callbackURL, returnURL string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.callbackURL = callbackURL
	p.returnURL = returnURL
}

func (p *Provider) apiURL() string {
	if p.isSandbox {
		return "https://dev.nicepay.co.id/nicepay/api/v2/registration"
	}
	return "https://www.nicepay.co.id/nicepay/api/v2/registration"
}

type nicepayRegRequest struct {
	IMid          string `json:"iMid"`
	PayMethod     string `json:"payMethod"`
	Currency      string `json:"currency"`
	Amt           string `json:"amt"`
	ReferenceNo   string `json:"referenceNo"`
	GoodsNm       string `json:"goodsNm"`
	BillingNm     string `json:"billingNm"`
	BillingPhone  string `json:"billingPhone"`
	BillingEmail  string `json:"billingEmail"`
	CallBackURL   string `json:"callBackUrl,omitempty"`
	DBProcessURL  string `json:"dbProcessUrl,omitempty"`
	MerchantToken string `json:"merchantToken"`
	UserIP        string `json:"userIP"`
}

type nicepayRegResponse struct {
	ResultCd   string `json:"resultCd"`
	ResultMsg  string `json:"resultMsg"`
	TXid       string `json:"tXid"`
	RequestURL string `json:"requestURL"`
	QRContent  string `json:"qrContent"`
}

func (p *Provider) CreatePaymentRequest(ctx context.Context, req payment.OnlinePaymentRequest) (*payment.PaymentGatewayResponse, error) {
	p.mu.RLock()
	imid := p.imid
	merchantKey := p.merchantKey
	apiURL := p.apiURL()
	callbackURL := p.callbackURL
	returnURL := p.returnURL
	p.mu.RUnlock()

	now := time.Now()
	expiredAt := now.Add(24 * time.Hour)

	if imid == "" || merchantKey == "" {
		mockURL := fmt.Sprintf("https://dev.nicepay.co.id/nicepay/api/order/%s", req.OrderNumber)
		return &payment.PaymentGatewayResponse{
			ExternalID:  req.OrderNumber,
			RedirectURL: &mockURL,
			ExpiredAt:   expiredAt,
		}, nil
	}

	amtStr := strconv.FormatInt(req.Amount.Int64(), 10)
	rawToken := imid + req.OrderNumber + amtStr + merchantKey
	hasher := sha256.New()
	hasher.Write([]byte(rawToken))
	merchantToken := hex.EncodeToString(hasher.Sum(nil))

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

	regReq := nicepayRegRequest{
		IMid:          imid,
		PayMethod:     "08",
		Currency:      "IDR",
		Amt:           amtStr,
		ReferenceNo:   req.OrderNumber,
		GoodsNm:       req.Description,
		BillingNm:     custName,
		BillingPhone:  custPhone,
		BillingEmail:  custEmail,
		CallBackURL:   returnURL,
		DBProcessURL:  callbackURL,
		MerchantToken: merchantToken,
		UserIP:        "127.0.0.1",
	}

	bodyBytes, err := json.Marshal(regReq)
	if err != nil {
		return nil, fmt.Errorf("nicepay: failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("nicepay: failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("nicepay: request failed: %w", err)
	}
	defer resp.Body.Close()

	var npResp nicepayRegResponse
	if err := json.NewDecoder(resp.Body).Decode(&npResp); err != nil {
		return nil, fmt.Errorf("nicepay: failed to parse response: %w", err)
	}

	if npResp.ResultCd != "0000" && npResp.ResultCd != "" {
		return nil, fmt.Errorf("nicepay error (%s): %s", npResp.ResultCd, npResp.ResultMsg)
	}

	res := &payment.PaymentGatewayResponse{
		ExternalID: req.OrderNumber,
		ExpiredAt:  expiredAt,
	}

	if npResp.RequestURL != "" {
		res.RedirectURL = &npResp.RequestURL
	}
	if npResp.QRContent != "" {
		res.QRCodeURL = &npResp.QRContent
	}

	return res, nil
}

type nicepayCallback struct {
	TXid          string `json:"tXid"`
	ReferenceNo   string `json:"referenceNo"`
	Amt           string `json:"amt"`
	Status        string `json:"status"`
	ResultCd      string `json:"resultCd"`
	MerchantToken string `json:"merchantToken"`
}

func (p *Provider) VerifyWebhook(ctx context.Context, payload []byte, signature string) (*payment.WebhookEvent, error) {
	p.mu.RLock()
	imid := p.imid
	merchantKey := p.merchantKey
	p.mu.RUnlock()

	var cb nicepayCallback
	if err := json.Unmarshal(payload, &cb); err != nil {
		return nil, fmt.Errorf("nicepay: invalid json payload: %w", err)
	}

	// Verify merchantToken if configured
	if merchantKey != "" && cb.MerchantToken != "" {
		rawToken := imid + cb.ReferenceNo + cb.Amt + merchantKey
		hasher := sha256.New()
		hasher.Write([]byte(rawToken))
		expectedToken := hex.EncodeToString(hasher.Sum(nil))
		if cb.MerchantToken != expectedToken {
			return nil, errors.New("nicepay: merchant token signature mismatch")
		}
	}

	var status payment.Status
	if cb.Status == "0" || cb.ResultCd == "0000" {
		status = payment.StatusCompleted
	} else if cb.Status == "1" || cb.ResultCd != "" {
		status = payment.StatusFailed
	} else {
		status = payment.StatusPending
	}

	amtInt, _ := strconv.ParseInt(cb.Amt, 10, 64)

	return &payment.WebhookEvent{
		Provider:        "nicepay",
		ExternalID:      cb.ReferenceNo,
		IdempotencyKey:  fmt.Sprintf("nicepay:%s:%s", cb.TXid, cb.Status),
		Status:          status,
		Amount:          money.Amount(amtInt),
		PaidAt:          time.Now(),
		RawPayload:      payload,
		GatewayResponse: cb,
	}, nil
}

func (p *Provider) GetPaymentStatus(ctx context.Context, externalID string) (*payment.Status, error) {
	st := payment.StatusPending
	return &st, nil
}
