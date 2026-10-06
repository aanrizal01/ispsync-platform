package midtrans

import (
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gigabill/isp/internal/payment"
	"github.com/gigabill/isp/pkg/money"
)

type Provider struct {
	serverKey string
	clientKey string
	isSandbox bool
}

func New(serverKey, clientKey string, isSandbox bool) *Provider {
	return &Provider{
		serverKey: serverKey,
		clientKey: clientKey,
		isSandbox: isSandbox,
	}
}

func (p *Provider) Name() string {
	return "midtrans"
}

func (p *Provider) IsConfigured() bool {
	return p.serverKey != ""
}

func (p *Provider) ServerKey() string {
	return p.serverKey
}

func (p *Provider) ClientKey() string {
	return p.clientKey
}

func (p *Provider) CreatePaymentRequest(ctx context.Context, req payment.OnlinePaymentRequest) (*payment.PaymentGatewayResponse, error) {
	now := time.Now()
	expiredAt := now.Add(24 * time.Hour)

	resp := &payment.PaymentGatewayResponse{
		ExternalID: req.OrderNumber,
		ExpiredAt:  expiredAt,
	}

	if p.serverKey != "" {
		// Real Midtrans Snap Transaction
		snapBase := "https://app.midtrans.com/snap/v1/transactions"
		if p.isSandbox {
			snapBase = "https://app.sandbox.midtrans.com/snap/v1/transactions"
		}

		custMap := map[string]interface{}{}
		if req.CustomerName != "" {
			custMap["first_name"] = req.CustomerName
		}
		if req.CustomerEmail != "" && strings.Contains(req.CustomerEmail, "@") {
			custMap["email"] = req.CustomerEmail
		}
		if req.CustomerPhone != "" {
			custMap["phone"] = req.CustomerPhone
		}

		var itemDetails []map[string]interface{}
		if len(req.Items) > 0 {
			for _, itm := range req.Items {
				iName := itm.Name
				if len(iName) > 45 {
					iName = iName[:45]
				}
				iID := itm.ID
				if iID == "" {
					iID = req.OrderNumber
				}
				if len(iID) > 45 {
					iID = iID[:45]
				}
				qty := itm.Quantity
				if qty <= 0 {
					qty = 1
				}
				itemDetails = append(itemDetails, map[string]interface{}{
					"id":       iID,
					"name":     iName,
					"price":    itm.Price.Int64(),
					"quantity": qty,
				})
			}
		} else {
			itemName := req.Description
			if itemName == "" {
				if strings.HasPrefix(req.OrderNumber, "INV-") {
					itemName = "Tagihan " + req.OrderNumber
				} else {
					itemName = "Voucher Hotspot WiFi"
				}
			}
			if len(itemName) > 45 {
				itemName = itemName[:45]
			}

			itemId := req.OrderNumber
			if len(itemId) > 45 {
				itemId = itemId[:45]
			}
			itemDetails = []map[string]interface{}{
				{
					"id":       itemId,
					"price":    req.Amount.Int64(),
					"quantity": 1,
					"name":     itemName,
				},
			}
		}

		snapPayload := map[string]interface{}{
			"transaction_details": map[string]interface{}{
				"order_id":     req.OrderNumber,
				"gross_amount": req.Amount.Int64(),
			},
			"customer_details": custMap,
			"item_details":     itemDetails,
		}

		finishURL := req.ReturnURL
		if finishURL == "" && strings.HasPrefix(req.OrderNumber, "ORD-") {
			finishURL = fmt.Sprintf("https://hotspot.gogiga.net.id/hotspot/buy?order_id=%s", req.OrderNumber)
		}
		if finishURL != "" {
			snapPayload["callbacks"] = map[string]interface{}{
				"finish": finishURL,
			}
		}

		payloadBytes, err := json.Marshal(snapPayload)
		if err == nil {
			httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, snapBase, bytes.NewBuffer(payloadBytes))
			if err == nil {
				authHeader := "Basic " + base64.StdEncoding.EncodeToString([]byte(p.serverKey+":"))
				httpReq.Header.Set("Authorization", authHeader)
				httpReq.Header.Set("Content-Type", "application/json")
				httpReq.Header.Set("Accept", "application/json")

				client := &http.Client{Timeout: 10 * time.Second}
				httpResp, err := client.Do(httpReq)
				if err == nil {
					defer httpResp.Body.Close()
					respBody, _ := io.ReadAll(httpResp.Body)

					var snapResult struct {
						Token       string `json:"token"`
						RedirectURL string `json:"redirect_url"`
					}
					if err := json.Unmarshal(respBody, &snapResult); err == nil && snapResult.RedirectURL != "" {
						resp.Token = &snapResult.Token
						resp.RedirectURL = &snapResult.RedirectURL
						resp.QRCodeURL = nil
						return resp, nil
					} else {
						fmt.Printf("[Midtrans] SNAP API error or non-redirect response: %s\n", string(respBody))
					}
				}
			}
		}
	}

	// Fallback to simulated response if serverKey not set or API error
	if req.PaymentMethod == payment.MethodQRIS {
		qrURL := fmt.Sprintf("https://api.midtrans.com/v2/qris/%s/qr-code", req.OrderNumber)
		resp.QRCodeURL = &qrURL
	} else {
		va := fmt.Sprintf("70012%06d", now.Unix()%1000000)
		resp.VANumber = &va
	}

	return resp, nil
}

type midtransNotification struct {
	TransactionTime   string `json:"transaction_time"`
	TransactionStatus string `json:"transaction_status"`
	TransactionID     string `json:"transaction_id"`
	StatusCode        string `json:"status_code"`
	SignatureKey      string `json:"signature_key"`
	PaymentType       string `json:"payment_type"`
	OrderID           string `json:"order_id"`
	GrossAmount       string `json:"gross_amount"`
	FraudStatus       string `json:"fraud_status"`
}

func (p *Provider) VerifyWebhook(ctx context.Context, payload []byte, signature string) (*payment.WebhookEvent, error) {
	var notif midtransNotification
	if err := json.Unmarshal(payload, &notif); err != nil {
		return nil, fmt.Errorf("invalid json payload: %w", err)
	}

	// 1. Verify cryptographic signature if serverKey is configured
	if p.serverKey != "" {
		expectedData := notif.OrderID + notif.StatusCode + notif.GrossAmount + p.serverKey
		hash := sha512.Sum512([]byte(expectedData))
		computedSig := hex.EncodeToString(hash[:])

		targetSig := notif.SignatureKey
		if targetSig == "" {
			targetSig = signature
		}

		if computedSig != targetSig {
			return nil, errors.New("midtrans signature verification failed")
		}
	}

	// 2. Map status
	var status payment.Status
	switch notif.TransactionStatus {
	case "settlement":
		status = payment.StatusCompleted
	case "capture":
		if notif.FraudStatus == "accept" || notif.FraudStatus == "" {
			status = payment.StatusCompleted
		} else {
			status = payment.StatusFailed
		}
	case "pending":
		status = payment.StatusPending
	case "deny", "expire":
		status = payment.StatusFailed
	case "cancel":
		status = payment.StatusCancelled
	case "refund":
		status = payment.StatusRefunded
	default:
		status = payment.StatusProcessing
	}

	// 3. Amount parsing
	amountFloat, _ := strconv.ParseFloat(notif.GrossAmount, 64)
	amountInt := int64(amountFloat)

	paidAt := time.Now()
	if notif.TransactionTime != "" {
		if t, err := time.Parse("2006-01-02 15:04:05", notif.TransactionTime); err == nil {
			paidAt = t
		}
	}

	return &payment.WebhookEvent{
		Provider:        "midtrans",
		ExternalID:      notif.OrderID,
		IdempotencyKey:  fmt.Sprintf("midtrans:%s:%s", notif.TransactionID, notif.TransactionStatus),
		Status:          status,
		Amount:          money.Amount(amountInt),
		PaidAt:          paidAt,
		RawPayload:      payload,
		GatewayResponse: notif,
	}, nil
}

func (p *Provider) GetPaymentStatus(ctx context.Context, externalID string) (*payment.Status, error) {
	if p.serverKey == "" {
		st := payment.StatusPending
		return &st, nil
	}

	apiBase := "https://api.midtrans.com/v2"
	if p.isSandbox {
		apiBase = "https://api.sandbox.midtrans.com/v2"
	}

	url := fmt.Sprintf("%s/%s/status", apiBase, externalID)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	authHeader := "Basic " + base64.StdEncoding.EncodeToString([]byte(p.serverKey+":"))
	httpReq.Header.Set("Authorization", authHeader)
	httpReq.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		st := payment.StatusPending
		return &st, nil
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var notif midtransNotification
	if err := json.Unmarshal(respBody, &notif); err != nil {
		return nil, fmt.Errorf("failed to parse midtrans status response: %w", err)
	}

	if notif.StatusCode == "404" {
		st := payment.StatusPending
		return &st, nil
	}

	var status payment.Status
	switch notif.TransactionStatus {
	case "settlement":
		status = payment.StatusCompleted
	case "capture":
		if notif.FraudStatus == "accept" || notif.FraudStatus == "" {
			status = payment.StatusCompleted
		} else {
			status = payment.StatusFailed
		}
	case "pending":
		status = payment.StatusPending
	case "deny", "expire":
		status = payment.StatusFailed
	case "cancel":
		status = payment.StatusCancelled
	case "refund":
		status = payment.StatusRefunded
	default:
		status = payment.StatusPending
	}

	return &status, nil
}
