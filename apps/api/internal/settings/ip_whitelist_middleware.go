package settings

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"
)

// IPWhitelistMiddleware filters incoming requests to admin/management endpoints
// according to the configured AllowedNOCSubnets when EnableIPWhitelist is true.
func (s *Service) IPWhitelistMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sec, err := s.GetSecuritySettings(r.Context())
		if err != nil || sec == nil || !sec.EnableIPWhitelist {
			// Whitelist disabled or failed to fetch -> allow traffic
			next.ServeHTTP(w, r)
			return
		}

		path := r.URL.Path
		// Skip public routes from IP restriction
		if strings.Contains(path, "/public") ||
			strings.Contains(path, "/webhook") ||
			strings.Contains(path, "/health") ||
			strings.Contains(path, "/ready") ||
			strings.Contains(path, "/walled-garden") ||
			strings.Contains(path, "/client-ip") ||
			strings.Contains(path, "/hotspot") ||
			strings.Contains(path, "/passpoint") {
			next.ServeHTTP(w, r)
			return
		}

		clientIPStr := ExtractClientIP(r)
		clientIP := net.ParseIP(clientIPStr)

		// Loopback / localhost is always allowed (anti-lockout for internal calls)
		if clientIP != nil && (clientIP.IsLoopback() || clientIPStr == "127.0.0.1" || clientIPStr == "::1") {
			next.ServeHTTP(w, r)
			return
		}

		if clientIP == nil {
			forbiddenResponse(w, "Alamat IP klien tidak valid: "+clientIPStr)
			return
		}

		// Check against allowed subnets
		subnets := strings.Split(sec.AllowedNOCSubnets, ",")
		allowed := false

		for _, sub := range subnets {
			sub = strings.TrimSpace(sub)
			if sub == "" {
				continue
			}

			// Check if single IP
			if !strings.Contains(sub, "/") {
				if parsedTarget := net.ParseIP(sub); parsedTarget != nil && parsedTarget.Equal(clientIP) {
					allowed = true
					break
				}
				// Append /32 for IPv4 or /128 for IPv6
				if strings.Contains(sub, ":") {
					sub += "/128"
				} else {
					sub += "/32"
				}
			}

			_, ipNet, parseErr := net.ParseCIDR(sub)
			if parseErr == nil && ipNet.Contains(clientIP) {
				allowed = true
				break
			}
		}

		if !allowed {
			forbiddenResponse(w, "Akses ditolak: Alamat IP Anda ("+clientIPStr+") tidak terdaftar dalam Subnet Terpercaya NOC.")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ExtractClientIP extracts real client IP handling reverse proxies
func ExtractClientIP(r *http.Request) string {
	// 1. X-Forwarded-For
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[0])
		if ip != "" {
			return ip
		}
	}

	// 2. X-Real-IP
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		return strings.TrimSpace(xri)
	}

	// 3. RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

func forbiddenResponse(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   msg,
	})
}
