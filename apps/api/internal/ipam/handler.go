package ipam

import (
	"log/slog"
	"net/http"
	"strconv"

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

func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.service.GetSettings(r.Context())
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

	saved, err := h.service.SaveSettings(r.Context(), &req)
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

	result, err := h.service.TestConnection(r.Context(), &req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, result)
}

func (h *Handler) GetSubnets(w http.ResponseWriter, r *http.Request) {
	subnets, err := h.service.GetSubnets(r.Context())
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

	resp, err := h.service.GetFirstFreeIP(r.Context(), subnetID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, resp)
}
