package ipam

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type APIResponse struct {
	Code    int             `json:"code"`
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

type Client struct {
	baseURL    string
	appID      string
	appCode    string
	httpClient *http.Client
	logger     *slog.Logger
}

func NewClient(serverURL, appID, appCode string, logger *slog.Logger) *Client {
	serverURL = strings.TrimRight(serverURL, "/")
	if strings.HasPrefix(strings.ToLower(serverURL), "http://") &&
		!strings.Contains(serverURL, "localhost") &&
		!strings.Contains(serverURL, "127.0.0.1") {
		serverURL = "https://" + serverURL[7:]
	}
	appID = strings.TrimSpace(appID)

	// Transport supporting both HTTP and HTTPS (allowing internal self-signed TLS)
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	appCode = strings.TrimSpace(appCode)

	return &Client{
		baseURL: serverURL,
		appID:   appID,
		appCode: appCode,
		httpClient: &http.Client{
			Transport: tr,
			Timeout:   12 * time.Second,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 10 {
					return errors.New("stopped after 10 redirects")
				}
				// Copy token headers across redirect
				if appCode != "" {
					req.Header.Set("token", appCode)
					req.Header.Set("phpipam-token", appCode)
				}
				return nil
			},
		},
		logger: logger,
	}
}

func (c *Client) buildURL(endpoint string) string {
	endpoint = strings.TrimPrefix(endpoint, "/")
	return fmt.Sprintf("%s/api/%s/%s", c.baseURL, c.appID, endpoint)
}

func (c *Client) doRequest(ctx context.Context, method, endpoint string, body interface{}) (*APIResponse, error) {
	fullURL := c.buildURL(endpoint)

	var bodyReader io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequestWithContext(ctx, method, fullURL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	// Send auth token in multiple standard phpIPAM headers
	if c.appCode != "" {
		req.Header.Set("token", c.appCode)
		req.Header.Set("phpipam-token", c.appCode)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("phpipam connection failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read phpipam response: %w", err)
	}

	var apiResp APIResponse
	if err := json.Unmarshal(respBytes, &apiResp); err != nil {
		return nil, fmt.Errorf("invalid json from phpipam (status %d): %s", resp.StatusCode, string(respBytes))
	}

	return &apiResp, nil
}

// TestConnection checks if phpIPAM is reachable and credentials are valid
func (c *Client) TestConnection(ctx context.Context) (*TestResult, error) {
	resp, err := c.doRequest(ctx, http.MethodGet, "sections/", nil)
	if err != nil {
		return &TestResult{Success: false, Message: err.Error()}, nil
	}

	if !resp.Success && resp.Code >= 400 {
		msg := resp.Message
		if msg == "" {
			msg = fmt.Sprintf("phpIPAM returned error code %d", resp.Code)
		}
		return &TestResult{Success: false, Message: msg, Code: resp.Code}, nil
	}

	return &TestResult{
		Success: true,
		Message: "Koneksi ke server phpIPAM REST API berhasil diverifikasi!",
		Code:    resp.Code,
	}, nil
}

// GetSubnets retrieves all configured subnets
func (c *Client) GetSubnets(ctx context.Context) ([]Subnet, error) {
	resp, err := c.doRequest(ctx, http.MethodGet, "subnets/", nil)
	if err != nil {
		return nil, err
	}

	if !resp.Success {
		return nil, fmt.Errorf("phpipam error: %s", resp.Message)
	}

	type rawSubnet struct {
		ID          interface{} `json:"id"`
		Subnet      string      `json:"subnet"`
		Mask        interface{} `json:"mask"`
		Description string      `json:"description"`
		SectionID   interface{} `json:"sectionId"`
		VLANID      interface{} `json:"vlanId"`
	}

	var rawList []rawSubnet
	if err := json.Unmarshal(resp.Data, &rawList); err != nil {
		return nil, fmt.Errorf("parse subnets: %w", err)
	}

	subnets := make([]Subnet, 0, len(rawList))
	for _, r := range rawList {
		idInt := toInt(r.ID)
		maskStr := fmt.Sprintf("%v", r.Mask)
		cidr := fmt.Sprintf("%s/%s", r.Subnet, maskStr)

		subnets = append(subnets, Subnet{
			ID:          idInt,
			Subnet:      r.Subnet,
			Mask:        maskStr,
			Description: r.Description,
			SectionID:   toInt(r.SectionID),
			VLANID:      toInt(r.VLANID),
			CIDR:        cidr,
		})
	}

	return subnets, nil
}

// GetFirstFreeIP queries the next available IP in the given subnet
func (c *Client) GetFirstFreeIP(ctx context.Context, subnetID int) (string, error) {
	endpoint := fmt.Sprintf("subnets/%d/first_free/", subnetID)
	resp, err := c.doRequest(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", err
	}

	if !resp.Success {
		return "", fmt.Errorf("phpipam error: %s", resp.Message)
	}

	var ipStr string
	if err := json.Unmarshal(resp.Data, &ipStr); err != nil {
		return "", fmt.Errorf("parse first_free ip: %w", err)
	}

	return strings.TrimSpace(ipStr), nil
}

// AssignAddress records the IP as active in phpIPAM
func (c *Client) AssignAddress(ctx context.Context, subnetID int, ip, hostname, description string) error {
	payload := map[string]interface{}{
		"ip":          ip,
		"subnetId":    subnetID,
		"hostname":    hostname,
		"description": description,
		"tag":         2, // 2 = Active in phpIPAM
	}

	resp, err := c.doRequest(ctx, http.MethodPost, "addresses/", payload)
	if err != nil {
		return err
	}

	// If already exists or 409, try updating via PATCH
	if !resp.Success && (resp.Code == 409 || strings.Contains(strings.ToLower(resp.Message), "exists")) {
		patchEndpoint := fmt.Sprintf("addresses/%s/%d/", ip, subnetID)
		patchResp, patchErr := c.doRequest(ctx, http.MethodPatch, patchEndpoint, payload)
		if patchErr != nil {
			return patchErr
		}
		if !patchResp.Success {
			return fmt.Errorf("update ipam address: %s", patchResp.Message)
		}
		return nil
	}

	if !resp.Success {
		return fmt.Errorf("assign ipam address: %s", resp.Message)
	}

	return nil
}

// ReleaseAddress removes or releases the IP record from phpIPAM
func (c *Client) ReleaseAddress(ctx context.Context, ip string, subnetID int) error {
	var endpoint string
	if subnetID > 0 {
		endpoint = fmt.Sprintf("addresses/%s/%d/", ip, subnetID)
	} else {
		// Search address by IP first
		searchResp, err := c.doRequest(ctx, http.MethodGet, fmt.Sprintf("addresses/search/%s/", ip), nil)
		if err != nil {
			return err
		}
		if !searchResp.Success {
			return nil // IP not in phpIPAM, nothing to release
		}

		type addrObj struct {
			ID interface{} `json:"id"`
		}
		var addrs []addrObj
		if err := json.Unmarshal(searchResp.Data, &addrs); err == nil && len(addrs) > 0 {
			addrID := toInt(addrs[0].ID)
			endpoint = fmt.Sprintf("addresses/%d/", addrID)
		} else {
			return nil
		}
	}

	resp, err := c.doRequest(ctx, http.MethodDelete, endpoint, nil)
	if err != nil {
		return err
	}

	if !resp.Success && resp.Code != 404 {
		return fmt.Errorf("release ipam address: %s", resp.Message)
	}

	return nil
}

func toInt(v interface{}) int {
	switch val := v.(type) {
	case float64:
		return int(val)
	case int:
		return val
	case string:
		i, _ := strconv.Atoi(val)
		return i
	default:
		return 0
	}
}
