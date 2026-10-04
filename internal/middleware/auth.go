package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"ispsync/internal/auth"
)

type ctxKey string

const claimsKey ctxKey = "auth_claims"

// GetClaims mengambil klaim sesi yang sudah diverifikasi RequireRoles.
func GetClaims(r *http.Request) *auth.Claims {
	c, _ := r.Context().Value(claimsKey).(*auth.Claims)
	return c
}

func authFail(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": msg, "message": msg})
}

// RequireRoles menolak permintaan tanpa sesi sah. Sesi harus milik tenant yang sedang
// diakses (isolasi antar-tenant) dan perannya termasuk daftar roles (peran DB).
// platform=true hanya meloloskan OWNER pada tenant master.
func RequireRoles(secret []byte, platform bool, roles ...string) func(http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, r := range roles {
		allowed[strings.ToUpper(r)] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if !strings.HasPrefix(h, "Bearer ") {
				authFail(w, http.StatusUnauthorized, "Login diperlukan")
				return
			}
			claims, err := auth.Verify(secret, strings.TrimPrefix(h, "Bearer "))
			if err != nil {
				authFail(w, http.StatusUnauthorized, "Sesi tidak valid atau berakhir")
				return
			}
			t := GetTenant(r)
			if t == nil || claims.TenantID != t.ID {
				authFail(w, http.StatusForbidden, "Sesi bukan milik tenant ini")
				return
			}
			if !allowed[strings.ToUpper(claims.Role)] {
				authFail(w, http.StatusForbidden, "Peran Anda tidak berhak mengakses fitur ini")
				return
			}
			if platform {
				tc := GetTenantContext(r)
				if tc == nil || !tc.IsMaster || strings.ToUpper(claims.Role) != "OWNER" {
					authFail(w, http.StatusForbidden, "Khusus pemilik platform")
					return
				}
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), claimsKey, claims)))
		})
	}
}
