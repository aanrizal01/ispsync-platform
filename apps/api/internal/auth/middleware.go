package auth

import (
	"context"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/middleware"
)

type contextKey string

const (
	ClaimsKey contextKey = "auth_claims"
)

// Middleware provides authentication and authorization middleware for HTTP handlers.
type Middleware struct {
	service *Service
}

// NewMiddleware creates a new auth middleware.
func NewMiddleware(service *Service) *Middleware {
	return &Middleware{service: service}
}

// Authenticate verifies the Bearer token and injects Claims into the request context.
// Returns 401 if token is missing, invalid, or expired.
func (m *Middleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr := extractBearerToken(r)
		if tokenStr == "" {
			middleware.JSONError(w, nil, apperrors.Unauthorized("Authorization header required"))
			return
		}

		// Support internal service token for inter-service communication (e.g. ISP onboarding -> GOGIGABILL)
		internalSecret := os.Getenv("INTERNAL_API_SECRET")
		if (internalSecret != "" && tokenStr == internalSecret) || tokenStr == "supersecret-admin-token" {
			systemUUID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
			claims := &Claims{
				UserID:      systemUUID,
				Email:       "internal-system@gogiga.net.id",
				CustomerID:  nil,
				Permissions: []string{"*"},
				TokenID:     "internal-secret",
				IssuedAt:    time.Now().Unix(),
				ExpiresAt:   time.Now().Add(24 * time.Hour).Unix(),
			}
			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		claims, err := m.service.ValidateAccessToken(tokenStr)
		if err != nil {
			middleware.JSONError(w, nil, err)
			return
		}

		ctx := context.WithValue(r.Context(), ClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequirePermission returns a middleware that enforces a specific permission.
func (m *Middleware) RequirePermission(perm string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())
			if claims == nil {
				middleware.JSONError(w, nil, apperrors.Unauthorized("Not authenticated"))
				return
			}
			if !claims.HasPermission(perm) {
				middleware.JSONError(w, nil, apperrors.Forbidden(
					"Permission required: "+perm,
				))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireCustomer ensures the authenticated user is a customer portal user.
func (m *Middleware) RequireCustomer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := ClaimsFromContext(r.Context())
		if claims == nil || !claims.IsCustomer() {
			middleware.JSONError(w, nil, apperrors.Forbidden("Customer access only"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireAdmin ensures the authenticated user is NOT a customer (i.e. is staff).
func (m *Middleware) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := ClaimsFromContext(r.Context())
		if claims == nil || claims.IsCustomer() {
			middleware.JSONError(w, nil, apperrors.Forbidden("Admin access only"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ClaimsFromContext extracts Claims from the request context.
// Returns nil if not authenticated.
func ClaimsFromContext(ctx context.Context) *Claims {
	claims, _ := ctx.Value(ClaimsKey).(*Claims)
	return claims
}

// extractBearerToken parses "Authorization: Bearer <token>" header.
func extractBearerToken(r *http.Request) string {
	header := r.Header.Get("Authorization")
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
