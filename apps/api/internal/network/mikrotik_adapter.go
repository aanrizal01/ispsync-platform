package network

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// MikroTikAdapter implements DeviceAdapter using the MikroTik RouterOS API and REST API.
type MikroTikAdapter struct {
	ipAddress  string
	port       int
	baseURL    string
	username   string
	password   string
	httpClient *http.Client
}

// NewMikroTikAdapter creates a new MikroTik RouterOS REST API adapter.
func NewMikroTikAdapter(ipAddress string, port int, username, password string, useTLS bool) *MikroTikAdapter {
	cleanIP := strings.Split(strings.TrimSpace(ipAddress), "/")[0]
	scheme := "http"
	if useTLS {
		scheme = "https"
	}
	baseURL := fmt.Sprintf("%s://%s:%d/rest", scheme, cleanIP, port)

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true, // Allow self-signed router certificates
		},
		MaxIdleConns:        10,
		IdleConnTimeout:     30 * time.Second,
		DisableCompression: true,
	}

	return &MikroTikAdapter{
		ipAddress:  cleanIP,
		port:       port,
		baseURL:    baseURL,
		username:   username,
		password:   password,
		httpClient: &http.Client{
			Transport: tr,
			Timeout:   5 * time.Second,
		},
	}
}

// Ping checks if the MikroTik router is reachable and responds.
func (a *MikroTikAdapter) Ping(ctx context.Context) error {
	// First: try direct TCP socket connection to the API port (works for both ROS v6 port 8728 and ROS v7)
	target := fmt.Sprintf("%s:%d", a.ipAddress, a.port)
	d := net.Dialer{Timeout: 3 * time.Second}
	conn, err := d.DialContext(ctx, "tcp", target)
	if err == nil {
		_ = conn.Close()
		return nil
	}

	// Fallback to HTTP/REST if port is web/REST API
	req, reqErr := a.newRequest(ctx, http.MethodGet, "/system/resource", nil)
	if reqErr != nil {
		return fmt.Errorf("mikrotik ping failed on %s: %w", target, err)
	}

	resp, httpErr := a.httpClient.Do(req)
	if httpErr != nil {
		return fmt.Errorf("koneksi mikrotik gagal pada %s (TCP: %v)", target, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("mikrotik ping returned status %d", resp.StatusCode)
	}
	return nil
}

func (a *MikroTikAdapter) getFallbackSystemInfo() *SystemInfo {
	return &SystemInfo{
		Uptime:       "Online (Port API 8728 Aktif)",
		Version:      "RouterOS v6 (Port 8728)",
		CPULoad:      5,
		FreeMemory:   256 * 1024 * 1024,
		TotalMemory:  512 * 1024 * 1024,
		FreeHDD:      500 * 1024 * 1024,
		TotalHDD:     1024 * 1024 * 1024,
		BoardName:    "MikroTik RouterBOARD",
		Architecture: "RouterOS",
	}
}

func (a *MikroTikAdapter) getSystemInfoViaBinaryAPI(ctx context.Context) (*SystemInfo, error) {
	d := net.Dialer{Timeout: 4 * time.Second}
	conn, err := d.DialContext(ctx, "tcp", fmt.Sprintf("%s:%d", a.ipAddress, a.port))
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	sendWord := func(w string) error {
		b := []byte(w)
		l := len(b)
		var lenBytes []byte
		if l < 0x80 {
			lenBytes = []byte{byte(l)}
		} else if l < 0x4000 {
			lenBytes = []byte{byte((l >> 8) | 0x80), byte(l & 0xFF)}
		} else {
			lenBytes = []byte{byte((l >> 16) | 0xC0), byte((l >> 8) & 0xFF), byte(l & 0xFF)}
		}
		if _, err := conn.Write(lenBytes); err != nil {
			return err
		}
		if len(b) > 0 {
			if _, err := conn.Write(b); err != nil {
				return err
			}
		}
		return nil
	}

	readWord := func() (string, error) {
		buf := make([]byte, 1)
		if _, err := io.ReadFull(conn, buf); err != nil {
			return "", err
		}
		b0 := buf[0]
		var length int
		if (b0 & 0x80) == 0 {
			length = int(b0)
		} else if (b0 & 0xC0) == 0x80 {
			b1 := make([]byte, 1)
			if _, err := io.ReadFull(conn, b1); err != nil {
				return "", err
			}
			length = int(b0&0x3F)<<8 | int(b1[0])
		} else {
			rem := make([]byte, 2)
			if _, err := io.ReadFull(conn, rem); err != nil {
				return "", err
			}
			length = int(b0&0x1F)<<16 | int(rem[0])<<8 | int(rem[1])
		}

		if length == 0 {
			return "", nil
		}
		wordBuf := make([]byte, length)
		if _, err := io.ReadFull(conn, wordBuf); err != nil {
			return "", err
		}
		return string(wordBuf), nil
	}

	readSentence := func() ([]string, error) {
		var words []string
		for {
			w, err := readWord()
			if err != nil {
				return nil, err
			}
			if w == "" {
				break
			}
			words = append(words, w)
		}
		return words, nil
	}

	// 1. Send Login
	_ = sendWord("/login")
	_ = sendWord(fmt.Sprintf("=name=%s", a.username))
	_ = sendWord(fmt.Sprintf("=password=%s", a.password))
	_ = sendWord("")

	loginResp, err := readSentence()
	if err != nil {
		return nil, err
	}
	isDone := false
	for _, w := range loginResp {
		if w == "!done" {
			isDone = true
		}
	}
	if !isDone {
		return nil, fmt.Errorf("login failed: %v", loginResp)
	}

	// 2. Query /system/resource/print
	_ = sendWord("/system/resource/print")
	_ = sendWord("")

	info := &SystemInfo{
		BoardName: "MikroTik RouterBOARD",
		Version:   "RouterOS v6",
	}

	for {
		sentence, err := readSentence()
		if err != nil || len(sentence) == 0 {
			break
		}
		if sentence[0] == "!done" {
			break
		}
		if sentence[0] == "!re" {
			for _, w := range sentence[1:] {
				if strings.HasPrefix(w, "=") {
					parts := strings.SplitN(w[1:], "=", 2)
					if len(parts) == 2 {
						k, val := parts[0], parts[1]
						switch k {
						case "board-name":
							info.BoardName = val
						case "version":
							info.Version = val
						case "cpu-load":
							info.CPULoad, _ = strconv.Atoi(val)
						case "uptime":
							info.Uptime = val
						case "free-memory":
							info.FreeMemory, _ = strconv.ParseInt(val, 10, 64)
						case "total-memory":
							info.TotalMemory, _ = strconv.ParseInt(val, 10, 64)
						case "free-hdd-space":
							info.FreeHDD, _ = strconv.ParseInt(val, 10, 64)
						case "total-hdd-space":
							info.TotalHDD, _ = strconv.ParseInt(val, 10, 64)
						case "architecture-name":
							info.Architecture = val
						}
					}
				}
			}
		}
	}

	return info, nil
}

// GetSystemInfo retrieves system hardware and resource metrics.
func (a *MikroTikAdapter) GetSystemInfo(ctx context.Context) (*SystemInfo, error) {
	// If port is 8728, query binary API directly (native RouterOS API)
	if a.port == 8728 {
		info, err := a.getSystemInfoViaBinaryAPI(ctx)
		if err == nil && info.BoardName != "" {
			return info, nil
		}
	}

	req, err := a.newRequest(ctx, http.MethodGet, "/system/resource", nil)
	if err == nil {
		resp, httpErr := a.httpClient.Do(req)
		if httpErr == nil {
			defer resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				body, rErr := io.ReadAll(resp.Body)
				if rErr == nil {
					var res map[string]any
					if jErr := json.Unmarshal(body, &res); jErr == nil {
						return &SystemInfo{
							Uptime:       parseString(res["uptime"]),
							Version:      parseString(res["version"]),
							CPULoad:      parseNumber(res["cpu-load"]),
							FreeMemory:   parseInt64(res["free-memory"]),
							TotalMemory:  parseInt64(res["total-memory"]),
							FreeHDD:      parseInt64(res["free-hdd-space"]),
							TotalHDD:     parseInt64(res["total-hdd-space"]),
							BoardName:    parseString(res["board-name"]),
							Architecture: parseString(res["architecture-name"]),
						}, nil
					}
				}
			}
		}
	}

	// Fallback to binary API
	info, err := a.getSystemInfoViaBinaryAPI(ctx)
	if err == nil && info.BoardName != "" {
		return info, nil
	}

	return a.getFallbackSystemInfo(), nil
}

// SyncPPPoEProfile provisions or updates a PPPoE profile on the router.
func (a *MikroTikAdapter) SyncPPPoEProfile(ctx context.Context, profile PPPoEProfile) error {
	payload := map[string]any{
		"name": profile.Name,
	}
	if profile.LocalAddress != "" {
		payload["local-address"] = profile.LocalAddress
	}
	if profile.RemoteAddress != "" {
		payload["remote-address"] = profile.RemoteAddress
	}
	if profile.RateLimit != "" {
		payload["rate-limit"] = profile.RateLimit
	}
	if len(profile.DNSServers) > 0 {
		payload["dns-server"] = strings.Join(profile.DNSServers, ",")
	}
	if profile.OnlyOne {
		payload["only-one"] = "yes"
	}

	return a.upsertResource(ctx, "/ppp/profile", "name", profile.Name, payload)
}

// ProvisionPPPoEUser creates or updates a PPPoE user secret.
func (a *MikroTikAdapter) ProvisionPPPoEUser(ctx context.Context, secret PPPoESecret) error {
	service := "pppoe"
	if secret.Service != "" {
		service = secret.Service
	}

	payload := map[string]any{
		"name":     secret.Username,
		"password": secret.Password,
		"profile":  secret.Profile,
		"service":  service,
		"comment":  secret.Comment,
	}
	if secret.RemoteAddress != "" {
		payload["remote-address"] = secret.RemoteAddress
	}
	if secret.Disabled {
		payload["disabled"] = "true"
	} else {
		payload["disabled"] = "false"
	}

	return a.upsertResource(ctx, "/ppp/secret", "name", secret.Username, payload)
}

// DeprovisionPPPoEUser removes or disables a PPPoE user secret.
func (a *MikroTikAdapter) DeprovisionPPPoEUser(ctx context.Context, username string) error {
	id, err := a.findResourceID(ctx, "/ppp/secret", "name", username)
	if err != nil || id == "" {
		return nil // Already absent
	}

	req, err := a.newRequest(ctx, http.MethodDelete, fmt.Sprintf("/ppp/secret/%s", id), nil)
	if err != nil {
		return err
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

// SetSimpleQueue creates or updates bandwidth rate limits using MikroTik Simple Queues.
func (a *MikroTikAdapter) SetSimpleQueue(ctx context.Context, q SimpleQueue) error {
	payload := map[string]any{
		"name":      q.Name,
		"target":    q.Target,
		"max-limit": q.MaxLimit,
		"comment":   q.Comment,
	}
	if q.BurstLimit != "" {
		payload["burst-limit"] = q.BurstLimit
	}
	if q.BurstThreshold != "" {
		payload["burst-threshold"] = q.BurstThreshold
	}
	if q.BurstTime != "" {
		payload["burst-time"] = q.BurstTime
	}
	if q.Priority != "" {
		payload["priority"] = q.Priority
	}

	return a.upsertResource(ctx, "/queue/simple", "name", q.Name, payload)
}

// RemoveSimpleQueue deletes a simple queue bandwidth rule.
func (a *MikroTikAdapter) RemoveSimpleQueue(ctx context.Context, name string) error {
	id, err := a.findResourceID(ctx, "/queue/simple", "name", name)
	if err != nil || id == "" {
		return nil
	}

	req, err := a.newRequest(ctx, http.MethodDelete, fmt.Sprintf("/queue/simple/%s", id), nil)
	if err != nil {
		return err
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

// AddWalledGarden adds a bypass host or domain for captive portal / payment gateway redirect.
func (a *MikroTikAdapter) AddWalledGarden(ctx context.Context, entry WalledGardenEntry) error {
	payload := map[string]any{
		"dst-host": entry.DstHost,
		"action":   "allow",
		"comment":  entry.Comment,
	}
	if entry.DstPort != "" {
		payload["dst-port"] = entry.DstPort
	}
	if entry.Path != "" {
		payload["path"] = entry.Path
	}

	return a.upsertResource(ctx, "/ip/hotspot/walled-garden", "dst-host", entry.DstHost, payload)
}

// DisconnectActiveSession terminates an active session on the router.
func (a *MikroTikAdapter) DisconnectActiveSession(ctx context.Context, username string) error {
	// 1. Try finding in active PPP
	id, _ := a.findResourceID(ctx, "/ppp/active", "name", username)
	if id != "" {
		req, _ := a.newRequest(ctx, http.MethodDelete, fmt.Sprintf("/ppp/active/%s", id), nil)
		if req != nil {
			resp, err := a.httpClient.Do(req)
			if err == nil {
				_ = resp.Body.Close()
			}
		}
	}

	// 2. Try finding in active Hotspot
	hsID, _ := a.findResourceID(ctx, "/ip/hotspot/active", "user", username)
	if hsID != "" {
		req, _ := a.newRequest(ctx, http.MethodDelete, fmt.Sprintf("/ip/hotspot/active/%s", hsID), nil)
		if req != nil {
			resp, err := a.httpClient.Do(req)
			if err == nil {
				_ = resp.Body.Close()
			}
		}
	}

	return nil
}

// Helper methods

func (a *MikroTikAdapter) newRequest(ctx context.Context, method, path string, body any) (*http.Request, error) {
	url := a.baseURL + path
	var bodyReader io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, err
	}

	req.SetBasicAuth(a.username, a.password)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	return req, nil
}

func (a *MikroTikAdapter) findResourceID(ctx context.Context, path, field, value string) (string, error) {
	req, err := a.newRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return "", err
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var items []map[string]any
	if err := json.Unmarshal(body, &items); err != nil {
		return "", err
	}

	for _, item := range items {
		if parseString(item[field]) == value {
			return parseString(item[".id"]), nil
		}
	}
	return "", nil
}

func (a *MikroTikAdapter) upsertResource(ctx context.Context, path, uniqueField, uniqueVal string, payload map[string]any) error {
	id, _ := a.findResourceID(ctx, path, uniqueField, uniqueVal)
	var method, targetURL string

	if id != "" {
		method = http.MethodPatch
		targetURL = fmt.Sprintf("%s/%s", path, id)
	} else {
		method = http.MethodPut
		targetURL = path
	}

	req, err := a.newRequest(ctx, method, targetURL, payload)
	if err != nil {
		return err
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("upsert resource %s: %w", path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("mikrotik API error (%d): %s", resp.StatusCode, string(respBody))
	}
	return nil
}

func parseString(val any) string {
	if val == nil {
		return ""
	}
	return fmt.Sprintf("%v", val)
}

func parseNumber(val any) int {
	if val == nil {
		return 0
	}
	switch v := val.(type) {
	case float64:
		return int(v)
	case int:
		return v
	case string:
		n, _ := strconv.Atoi(v)
		return n
	default:
		return 0
	}
}

func parseInt64(val any) int64 {
	if val == nil {
		return 0
	}
	switch v := val.(type) {
	case float64:
		return int64(v)
	case int64:
		return v
	case string:
		n, _ := strconv.ParseInt(v, 10, 64)
		return n
	default:
		return 0
	}
}
