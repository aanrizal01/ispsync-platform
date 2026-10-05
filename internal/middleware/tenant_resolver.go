package middleware

import (
	"context"
	"net"
	"net/http"
	"strings"

	"ispsync/internal/domain"
	"ispsync/internal/repository"
)

type contextKey string

const TenantCtxKey contextKey = "ispsync_tenant_ctx"

// TenantResolver mengurai Host header untuk menentukan Tenant dan App Type
// Format didukung:
// 1. {app}.{tenant}.ispsync.id (contoh: cms.ispku.ispsync.id)
// 2. {app}.{tenant}.localhost (untuk testing lokal)
// 3. Query param / Header fallback untuk dev: ?tenant=ispku&app=cms atau X-Tenant-Slug: ispku
// 4. Custom domain milik tenant (contoh: portal.myisp.com)
func TenantResolver(store repository.Storage, baseDomain string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			host := r.Host
			if h, _, err := net.SplitHostPort(host); err == nil {
				host = h
			}
			host = strings.ToLower(host)

			var appType domain.AppType = domain.AppCMS
			var tenantSlug string
			isMaster := false

			// 1. Cek query param dev override (misal ?tenant=ispku&app=portal)
			qTenant := r.URL.Query().Get("tenant")
			qApp := r.URL.Query().Get("app")
			hTenant := r.Header.Get("X-Tenant-Slug")

			if qTenant != "" {
				tenantSlug = qTenant
			} else if hTenant != "" {
				tenantSlug = hTenant
			}

			if qApp != "" {
				switch strings.ToLower(qApp) {
				case "portal", "nexus":
					appType = domain.AppPortal
				case "noc":
					appType = domain.AppNOC
				case "sales":
					appType = domain.AppSales
				case "teknisi":
					appType = domain.AppTeknisi
				case "wifi":
					appType = domain.AppWifi
				case "isolir":
					appType = domain.AppIsolir
				default:
					appType = domain.AppCMS
				}
			}

			// 2. Jika belum ditentukan dari query/header, parse subdomain dari host
			if tenantSlug == "" {
				parts := strings.Split(host, ".")
				// Format A: {app}.{tenant}.ispsync.id (contoh: cms.ispku.ispsync.id, nexus.ispku.ispsync.id)
				// Format A: {app}.{tenant}.ispsync.id (contoh: cms.ispku.ispsync.id, nexus.ispku.ispsync.id)
				// atau domain 4-bagian kustom: {app}.{tenant}.net.id (contoh: noc-fo.gogiga.net.id)
				if len(parts) >= 4 {
					appPart := parts[0]
					tenantPart := parts[1]

					matchedApp := true
					switch appPart {
					case "portal", "nexus":
						appType = domain.AppPortal
					case "noc", "noc-fo":
						appType = domain.AppNOC
					case "sales":
						appType = domain.AppSales
					case "teknisi", "technician":
						appType = domain.AppTeknisi
					case "wifi", "hotspot":
						appType = domain.AppWifi
					case "isolir":
						appType = domain.AppIsolir
					default:
						matchedApp = false
					}

					if matchedApp || strings.HasSuffix(host, baseDomain) {
						tenantSlug = tenantPart
					}
				} else if len(parts) == 3 && strings.HasSuffix(host, baseDomain) {
					// Format B (Cloudflare Universal SSL friendly): {app}-{tenant}.ispsync.id (contoh: cms-ispku.ispsync.id)
					sub := parts[0]
					if strings.Contains(sub, "-") {
						subParts := strings.SplitN(sub, "-", 2)
						p1, p2 := subParts[0], subParts[1]
						switch p1 {
						case "cms", "portal", "nexus", "noc", "sales", "teknisi", "wifi", "hotspot", "isolir":
							switch p1 {
							case "portal", "nexus":
								appType = domain.AppPortal
							case "noc":
								appType = domain.AppNOC
							case "sales":
								appType = domain.AppSales
							case "teknisi":
								appType = domain.AppTeknisi
							case "wifi", "hotspot":
								appType = domain.AppWifi
							case "isolir":
								appType = domain.AppIsolir
							default:
								appType = domain.AppCMS
							}
							tenantSlug = p2
						default:
							// Coba format {tenant}-{app}
							tenantSlug = p1
							switch p2 {
							case "portal", "nexus":
								appType = domain.AppPortal
							case "noc":
								appType = domain.AppNOC
							case "sales":
								appType = domain.AppSales
							case "teknisi":
								appType = domain.AppTeknisi
							case "wifi", "hotspot":
								appType = domain.AppWifi
							case "isolir":
								appType = domain.AppIsolir
							default:
								appType = domain.AppCMS
							}
						}
					} else {
						// Subdomain tunggal level 1 (contoh: nexus.ispsync.id, portal.ispsync.id, ispku.ispsync.id)
						if sub == "nexus" || sub == "portal" {
							tenantSlug = "ispku"
							appType = domain.AppPortal
						} else if sub == "sales" {
							tenantSlug = "ispku"
							appType = domain.AppSales
						} else if sub == "teknisi" {
							tenantSlug = "ispku"
							appType = domain.AppTeknisi
						} else {
							// Subdomain murni tenant: ispku.ispsync.id
							tenantSlug = sub
							appType = domain.AppPortal
						}
					}
				} else if len(parts) >= 3 && (parts[len(parts)-1] == "localhost" || parts[len(parts)-1] == "test") {
					// {app}.{tenant}.localhost
					appPart := parts[0]
					tenantPart := parts[1]
					switch appPart {
					case "portal", "nexus":
						appType = domain.AppPortal
					case "noc":
						appType = domain.AppNOC
					case "sales":
						appType = domain.AppSales
					case "teknisi":
						appType = domain.AppTeknisi
					case "wifi", "hotspot":
						appType = domain.AppWifi
					case "isolir":
						appType = domain.AppIsolir
					default:
						appType = domain.AppCMS
					}
					tenantSlug = tenantPart
				} else if host == baseDomain || host == "www."+baseDomain || host == "localhost" || host == "127.0.0.1" {
					tenantSlug = "ispku"
					if qApp == "" {
						appType = domain.AppCMS
					}
				}
			}

			// 3. Cari data Tenant dari database
			var tenant *domain.Tenant
			var err error

			if tenantSlug != "" {
				tenant, err = store.GetTenantBySlug(r.Context(), tenantSlug)
			} else {
				// Coba lookup custom domain
				tenant, err = store.GetTenantByCustomDomain(r.Context(), host)
			}

			if err != nil || tenant == nil {
				// Fallback coba ambil tenant 'ispku' agar halaman dev tetap dapat dibuka dengan lancar
				tenant, _ = store.GetTenantBySlug(r.Context(), "ispku")
			}

			if tenant == nil {
				http.Error(w, `{"error":"Tenant not found or inactive on ISPSYNC platform"}`, http.StatusNotFound)
				return
			}

			tCtx := &domain.TenantContext{
				Tenant:    tenant,
				AppType:   appType,
				Subdomain: tenantSlug,
				Host:      host,
				IsMaster:  isMaster,
			}

			ctx := context.WithValue(r.Context(), TenantCtxKey, tCtx)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetTenantContext mengambil konteks tenant dari request
func GetTenantContext(r *http.Request) *domain.TenantContext {
	val, ok := r.Context().Value(TenantCtxKey).(*domain.TenantContext)
	if !ok {
		return nil
	}
	return val
}

// GetTenant helper cepat mengambil entitas Tenant
func GetTenant(r *http.Request) *domain.Tenant {
	tCtx := GetTenantContext(r)
	if tCtx == nil {
		return nil
	}
	return tCtx.Tenant
}
