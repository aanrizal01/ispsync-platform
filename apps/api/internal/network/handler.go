package network

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/auth"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/middleware"
)

type Handler struct {
	service *Service
	logger  *slog.Logger
}

func NewHandler(service *Service, logger *slog.Logger) *Handler {
	return &Handler{service: service, logger: logger}
}

func (h *Handler) Routes(r chi.Router, authMW *auth.Middleware) {
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		r.With(authMW.RequirePermission("network:read")).Get("/devices", h.ListDevices)
		r.With(authMW.RequirePermission("network:write")).Post("/devices", h.CreateDevice)
		r.With(authMW.RequirePermission("network:read")).Get("/devices/{id}", h.GetDevice)
		r.With(authMW.RequirePermission("network:write")).Put("/devices/{id}", h.UpdateDevice)
		r.With(authMW.RequirePermission("network:write")).Delete("/devices/{id}", h.DeleteDevice)

		r.With(authMW.RequirePermission("network:read")).Post("/devices/{id}/test-connection", h.TestConnection)
		r.With(authMW.RequirePermission("network:read")).Get("/devices/{id}/logs", h.ListLogs)
		r.With(authMW.RequirePermission("network:write")).Post("/devices/{id}/sync-profile", h.SyncPPPoEProfile)
		r.With(authMW.RequirePermission("network:write")).Post("/devices/{id}/simple-queue", h.SetSimpleQueue)
	})
}

func (h *Handler) ListDevices(w http.ResponseWriter, r *http.Request) {
	var vendorPtr *Vendor
	if v := r.URL.Query().Get("vendor"); v != "" {
		ven := Vendor(v)
		vendorPtr = &ven
	}

	var activePtr *bool
	if a := r.URL.Query().Get("is_active"); a != "" {
		b := a == "true" || a == "1"
		activePtr = &b
	}

	devices, err := h.service.ListDevices(r.Context(), vendorPtr, activePtr)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]any{"data": devices})
}

func (h *Handler) CreateDevice(w http.ResponseWriter, r *http.Request) {
	var req CreateDeviceRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	dev, err := h.service.CreateDevice(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, dev)
}

func (h *Handler) GetDevice(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid device ID"))
		return
	}

	dev, err := h.service.GetDevice(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, dev)
}

func (h *Handler) UpdateDevice(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid device ID"))
		return
	}

	var req UpdateDeviceRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	dev, err := h.service.UpdateDevice(r.Context(), id, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, dev)
}

func (h *Handler) DeleteDevice(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid device ID"))
		return
	}

	if err := h.service.DeleteDevice(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Perangkat berhasil dihapus"})
}

func (h *Handler) TestConnection(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid device ID"))
		return
	}

	res, err := h.service.TestConnection(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, res)
}

func (h *Handler) ListLogs(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid device ID"))
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	logs, err := h.service.ListLogs(r.Context(), id, limit)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]any{"data": logs})
}

func (h *Handler) SyncPPPoEProfile(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid device ID"))
		return
	}

	var req PPPoEProfile
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.SyncPPPoEProfile(r.Context(), id, req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Profil PPPoE berhasil disinkronkan ke router"})
}

func (h *Handler) SetSimpleQueue(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid device ID"))
		return
	}

	var req SimpleQueue
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.SetSimpleQueue(r.Context(), id, req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Simple Queue berhasil dikonfigurasi pada router"})
}
