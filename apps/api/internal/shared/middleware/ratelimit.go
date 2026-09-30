package middleware

import (
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	apperrors "github.com/gigabill/isp/internal/shared/errors"
)

// RateLimiter returns an HTTP middleware that limits incoming requests using Redis.
func RateLimiter(rdb *redis.Client, limit int, window time.Duration, keyPrefix string, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if rdb == nil || limit <= 0 {
				next.ServeHTTP(w, r)
				return
			}

			// Extract client IP address
			ip := getClientIP(r)
			key := fmt.Sprintf("ratelimit:%s:%s", keyPrefix, ip)
			ctx := r.Context()

			count, err := rdb.Incr(ctx, key).Result()
			if err != nil {
				// In case of redis failure, allow request through but log warning
				if logger != nil {
					logger.Warn("redis rate limiter failed, allowing request", "error", err)
				}
				next.ServeHTTP(w, r)
				return
			}

			if count == 1 {
				_ = rdb.Expire(ctx, key, window).Err()
			}

			ttl, _ := rdb.TTL(ctx, key).Result()
			resetSeconds := int(ttl.Seconds())
			if resetSeconds < 0 {
				resetSeconds = int(window.Seconds())
			}

			remaining := limit - int(count)
			if remaining < 0 {
				remaining = 0
			}

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			w.Header().Set("X-RateLimit-Reset", strconv.Itoa(resetSeconds))

			if int(count) > limit {
				w.Header().Set("Retry-After", strconv.Itoa(resetSeconds))
				JSONError(w, logger, apperrors.New(
					"RATE_LIMIT_EXCEEDED",
					"Terlalu banyak permintaan. Silakan coba beberapa saat lagi.",
					http.StatusTooManyRequests,
				))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func getClientIP(r *http.Request) string {
	// 1. Check X-Forwarded-For header
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		clientIP := strings.TrimSpace(parts[0])
		if clientIP != "" {
			return clientIP
		}
	}

	// 2. Check X-Real-IP header
	if xrip := r.Header.Get("X-Real-IP"); xrip != "" {
		return strings.TrimSpace(xrip)
	}

	// 3. Fallback to RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	return r.RemoteAddr
}
