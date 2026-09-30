package acs

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/auth"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/middleware"
)

type Handler struct {
	svc    *Service
	logger *slog.Logger
}

func NewHandler(svc *Service, logger *slog.Logger) *Handler {
	return &Handler{svc: svc, logger: logger}
}

func (h *Handler) Routes(r chi.Router, authMW *auth.Middleware) {
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		// Admin ACS & TR-069 Management
		r.With(authMW.RequirePermission("network:read")).Get("/status", h.CheckStatus)
		r.With(authMW.RequirePermission("network:read")).Get("/onts", h.ListONTs)
		r.With(authMW.RequirePermission("network:write")).Post("/onts", h.RegisterONT)
		r.With(authMW.RequirePermission("network:read")).Get("/onts/{id}", h.GetONT)
		r.With(authMW.RequirePermission("network:write")).Put("/onts/{id}/wifi", h.UpdateWiFi)
		r.With(authMW.RequirePermission("network:write")).Post("/onts/{id}/reboot", h.RebootONT)
		r.With(authMW.RequirePermission("network:read")).Get("/customer/{customerId}", h.GetONTByCustomerID)
	})
}

func (h *Handler) PublicRoutes(r chi.Router) {
	// Customer Self-Service WiFi & Fiber Telemetry
	r.Route("/ont", func(r chi.Router) {
		r.Get("/customer/{customerId}", h.GetONTByCustomerID)
		r.Put("/{id}/wifi", h.UpdateWiFi)
		r.Post("/{id}/reboot", h.RebootONT)
	})
}

func (h *Handler) ListONTs(w http.ResponseWriter, r *http.Request) {
	onts, err := h.svc.ListONTs(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, onts)
}

func (h *Handler) GetONT(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID ONT tidak valid"))
		return
	}

	ont, err := h.svc.GetONT(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, ont)
}

func (h *Handler) GetONTByCustomerID(w http.ResponseWriter, r *http.Request) {
	custIDStr := chi.URLParam(r, "customerId")
	custID, err := uuid.Parse(custIDStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID Pelanggan tidak valid"))
		return
	}

	ont, err := h.svc.GetONTByCustomerID(r.Context(), custID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, ont)
}

func (h *Handler) UpdateWiFi(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID ONT tidak valid"))
		return
	}

	var req UpdateWiFiRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.svc.UpdateWiFi(r.Context(), id, req.SSID, req.Password); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Konfigurasi WiFi berhasil dikirim ke modem ONT (TR-069 SetParameterValues diproses).",
	})
}

func (h *Handler) RebootONT(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID ONT tidak valid"))
		return
	}

	if err := h.svc.RebootONT(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Perintah restart modem berhasil dikirimkan via TR-069.",
	})
}

func (h *Handler) RegisterONT(w http.ResponseWriter, r *http.Request) {
	var req RegisterONTRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	ont, err := h.svc.RegisterONT(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, ont)
}

func (h *Handler) CheckStatus(w http.ResponseWriter, r *http.Request) {
	status, err := h.svc.CheckStatus(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, status)
}
