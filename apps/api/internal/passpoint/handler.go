package passpoint

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/auth"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/middleware"
	"github.com/gigabill/isp/internal/shared/pagination"
)

func extractTenantSlug(r *http.Request) string {
	return auth.ExtractTenantSlug(r)
}

type Handler struct {
	service *Service
	logger  *slog.Logger
}

func NewHandler(service *Service, logger *slog.Logger) *Handler {
	return &Handler{service: service, logger: logger}
}

func (h *Handler) Routes(r chi.Router, authMW *auth.Middleware) {
	// Public endpoint: Download Apple .mobileconfig (accessed from iOS Safari / QR code)
	r.Get("/credentials/{id}/apple-profile", h.DownloadAppleProfile)

	// Public self-service purchase & lookup endpoints
	r.Get("/packages", h.GetPackages)
	r.Post("/purchase", h.Purchase)
	r.Post("/check-purchase", h.CheckPurchase)
	r.Post("/renew", h.Renew)
	r.Post("/check-renew", h.CheckRenew)
	r.Get("/public/credentials/{id}", h.GetPublicCredential)
	r.Get("/my-status", h.CheckCustomerStatus)
	r.Post("/my-status", h.CheckCustomerStatus)

	// Authenticated routes
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		// Passpoint Profiles
		r.With(authMW.RequirePermission("subscriptions:read")).Get("/profiles", h.ListProfiles)
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/profiles", h.CreateProfile)
		r.With(authMW.RequirePermission("subscriptions:read")).Get("/profiles/{id}", h.GetProfile)

		// Passpoint Credentials
		r.With(authMW.RequirePermission("subscriptions:read")).Get("/credentials", h.ListCredentials)
		r.With(authMW.RequirePermission("subscriptions:read")).Get("/credentials/{id}", h.GetCredential)
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/customers/{customer_id}/credentials", h.IssueCredential)
		r.With(authMW.RequirePermission("subscriptions:read")).Get("/customers/{customer_id}/credentials", h.ListCustomerCredentials)
		r.With(authMW.RequirePermission("subscriptions:write")).Patch("/credentials/{id}/revoke", h.RevokeCredential)

		// Passpoint Packages Management (Admin)
		r.With(authMW.RequirePermission("subscriptions:read")).Get("/admin/packages", h.ListAdminPackages)
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/admin/packages", h.CreatePackage)
		r.With(authMW.RequirePermission("subscriptions:write")).Put("/admin/packages/{id}", h.UpdatePackage)
		r.With(authMW.RequirePermission("subscriptions:write")).Delete("/admin/packages/{id}", h.DeletePackage)

		// Live Sessions & Analytics (Admin)
		r.With(authMW.RequirePermission("subscriptions:read")).Get("/admin/sessions", h.ListActiveSessions)
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/admin/sessions/disconnect", h.DisconnectActiveSession)
		r.With(authMW.RequirePermission("subscriptions:read")).Get("/admin/analytics", h.GetFinancialAnalytics)
		r.With(authMW.RequirePermission("subscriptions:read")).Get("/admin/orders/export", h.ExportOrdersCSV)
	})
}

func (h *Handler) ListProfiles(w http.ResponseWriter, r *http.Request) {
	profiles, err := h.service.ListProfiles(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, map[string]any{"data": profiles})
}

func (h *Handler) CreateProfile(w http.ResponseWriter, r *http.Request) {
	var req CreateProfileRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	p, err := h.service.CreateProfile(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusCreated, p)
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid profile ID"))
		return
	}

	p, err := h.service.GetProfile(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, p)
}

func (h *Handler) ListCredentials(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	tenantSlug := extractTenantSlug(r)
	creds, total, err := h.service.ListCredentials(r.Context(), tenantSlug, params.Limit, params.Offset)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	meta := pagination.NewMeta(params, int(total))
	middleware.JSONList(w, creds, meta)
}

func (h *Handler) GetCredential(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid credential ID"))
		return
	}

	cred, err := h.service.GetCredential(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, cred)
}

func (h *Handler) IssueCredential(w http.ResponseWriter, r *http.Request) {
	customerID, err := uuid.Parse(chi.URLParam(r, "customer_id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid customer ID"))
		return
	}

	var req IssueCredentialRequest
	_ = middleware.DecodeJSON(r, &req)

	cred, err := h.service.IssueCredential(r.Context(), customerID, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusCreated, cred)
}

func (h *Handler) ListCustomerCredentials(w http.ResponseWriter, r *http.Request) {
	customerID, err := uuid.Parse(chi.URLParam(r, "customer_id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid customer ID"))
		return
	}

	creds, err := h.service.ListCustomerCredentials(r.Context(), customerID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, map[string]any{"data": creds})
}

func (h *Handler) RevokeCredential(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid credential ID"))
		return
	}

	if err := h.service.RevokeCredential(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Kredensial Passpoint berhasil dicabut"})
}

func (h *Handler) DownloadAppleProfile(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid credential ID"))
		return
	}

	xmlData, filename, err := h.service.GenerateAppleProfile(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	w.Header().Set("Content-Type", "application/x-apple-aspen-config")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(xmlData)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(xmlData)
}

func (h *Handler) GetPackages(w http.ResponseWriter, r *http.Request) {
	pkgs, err := h.service.GetPackages(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, pkgs)
}

func (h *Handler) Purchase(w http.ResponseWriter, r *http.Request) {
	var req PasspointPurchaseRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	tenantSlug := extractTenantSlug(r)
	resp, err := h.service.Purchase(r.Context(), tenantSlug, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, resp)
}

func (h *Handler) CheckPurchase(w http.ResponseWriter, r *http.Request) {
	var req PasspointCheckRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	resp, err := h.service.CheckPurchase(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, resp)
}

func (h *Handler) GetPublicCredential(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID Kredensial tidak valid"))
		return
	}

	cred, err := h.service.GetCredential(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, cred)
}

func (h *Handler) Renew(w http.ResponseWriter, r *http.Request) {
	var req PasspointRenewRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	tenantSlug := extractTenantSlug(r)
	resp, err := h.service.Renew(r.Context(), tenantSlug, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, resp)
}

func (h *Handler) CheckRenew(w http.ResponseWriter, r *http.Request) {
	var req PasspointCheckRenewRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	resp, err := h.service.CheckRenew(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, resp)
}

func (h *Handler) ListAdminPackages(w http.ResponseWriter, r *http.Request) {
	pkgs, err := h.service.ListAdminPackages(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, map[string]any{"data": pkgs})
}

func (h *Handler) CreatePackage(w http.ResponseWriter, r *http.Request) {
	var req CreatePasspointPackageRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	pkg, err := h.service.CreatePackage(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusCreated, pkg)
}

func (h *Handler) UpdatePackage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID paket diperlukan"))
		return
	}

	var req UpdatePasspointPackageRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	pkg, err := h.service.UpdatePackage(r.Context(), id, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, pkg)
}

func (h *Handler) DeletePackage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID paket diperlukan"))
		return
	}

	if err := h.service.DeletePackage(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, map[string]any{"message": "Paket berhasil dihapus"})
}

func (h *Handler) CheckCustomerStatus(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("query")
	if query == "" && r.Method == http.MethodPost {
		var body CheckCustomerStatusRequest
		_ = middleware.DecodeJSON(r, &body)
		query = body.Query
	}
	if query == "" {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Nomor HP atau Username harus diisi"))
		return
	}

	st, err := h.service.CheckCustomerStatus(r.Context(), query)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, st)
}

func (h *Handler) ListActiveSessions(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	tenantSlug := extractTenantSlug(r)
	sessions, total, err := h.service.GetActiveSessions(r.Context(), tenantSlug, params.Limit, params.Offset)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	meta := pagination.NewMeta(params, int(total))
	middleware.JSONList(w, sessions, meta)
}

func (h *Handler) DisconnectActiveSession(w http.ResponseWriter, r *http.Request) {
	var req DisconnectSessionRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.DisconnectSession(r.Context(), req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, map[string]any{"message": "Sesi berhasil diputus via CoA disconnect"})
}

func (h *Handler) GetFinancialAnalytics(w http.ResponseWriter, r *http.Request) {
	tenantSlug := extractTenantSlug(r)
	a, err := h.service.GetAnalytics(r.Context(), tenantSlug)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, a)
}

func (h *Handler) ExportOrdersCSV(w http.ResponseWriter, r *http.Request) {
	tenantSlug := extractTenantSlug(r)
	csvBytes, err := h.service.ExportOrdersCSV(r.Context(), tenantSlug)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=passpoint_orders.csv")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(csvBytes)
}


