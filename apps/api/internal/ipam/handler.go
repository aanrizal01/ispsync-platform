package ipam

import (
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/gigabill/isp/internal/auth"
	"github.com/gigabill/isp/internal/shared/middleware"
)

type Handler struct {
	service *Service
	logger  *slog.Logger
}

func NewHandler(service *Service, logger *slog.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

func (h *Handler) Routes(r chi.Router, authMW *auth.Middleware) {
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		r.Get("/settings", h.GetSettings)
		r.Put("/settings", h.SaveSettings)
		r.Post("/test", h.TestConnection)
		r.Get("/subnets", h.GetSubnets)
		r.Get("/first-free", h.GetFirstFreeIP)
	})
}

func extractTenantSlug(r *http.Request) string {
	if q := r.URL.Query().Get("tenant"); q != "" {
		return strings.ToLower(strings.TrimSpace(q))
	}
	if q := r.URL.Query().Get("tenant_slug"); q != "" {
		return strings.ToLower(strings.TrimSpace(q))
	}
	if q := r.URL.Query().Get("slug"); q != "" {
		return strings.ToLower(strings.TrimSpace(q))
	}
	return auth.ExtractTenantSlug(r)
}

func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	tenantSlug := extractTenantSlug(r)
	settings, err := h.service.GetSettings(r.Context(), tenantSlug)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, settings)
}

func (h *Handler) SaveSettings(w http.ResponseWriter, r *http.Request) {
	var req IPAMSettings
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	tenantSlug := extractTenantSlug(r)
	saved, err := h.service.SaveSettings(r.Context(), tenantSlug, &req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Pengaturan integrasi phpIPAM berhasil disimpan",
		"data":    saved,
	})
}

func (h *Handler) TestConnection(w http.ResponseWriter, r *http.Request) {
	var req IPAMSettings
	_ = middleware.DecodeJSON(r, &req)

	tenantSlug := extractTenantSlug(r)
	result, err := h.service.TestConnection(r.Context(), tenantSlug, &req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, result)
}

func (h *Handler) GetSubnets(w http.ResponseWriter, r *http.Request) {
	tenantSlug := extractTenantSlug(r)
	subnets, err := h.service.GetSubnets(r.Context(), tenantSlug)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"subnets": subnets,
	})
}

func (h *Handler) GetFirstFreeIP(w http.ResponseWriter, r *http.Request) {
	subnetIDStr := r.URL.Query().Get("subnet_id")
	subnetID := 0
	if subnetIDStr != "" {
		subnetID, _ = strconv.Atoi(subnetIDStr)
	}

	tenantSlug := extractTenantSlug(r)
	resp, err := h.service.GetFirstFreeIP(r.Context(), subnetID, tenantSlug)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, resp)
}
