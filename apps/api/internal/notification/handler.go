package notification

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/gigabill/isp/internal/auth"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/middleware"
	"github.com/gigabill/isp/internal/shared/pagination"
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

		r.With(authMW.RequirePermission("notifications:read")).Get("/", h.ListNotifications)
		r.With(authMW.RequirePermission("notifications:write")).Post("/send", h.SendNotification)
		r.With(authMW.RequirePermission("notifications:write")).Post("/dispatch-template", h.DispatchTemplate)
		r.With(authMW.RequirePermission("notifications:read")).Get("/templates", h.ListTemplates)
		r.With(authMW.RequirePermission("notifications:write")).Put("/templates/{code}", h.UpdateTemplate)
	})
}

func (h *Handler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)

	var channelPtr *Channel
	if c := r.URL.Query().Get("channel"); c != "" {
		ch := Channel(c)
		channelPtr = &ch
	}

	var statusPtr *Status
	if s := r.URL.Query().Get("status"); s != "" {
		st := Status(s)
		statusPtr = &st
	}

	notifs, total, err := h.service.ListNotifications(r.Context(), params.Limit, params.Offset, channelPtr, statusPtr)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	meta := pagination.NewMeta(params, int(total))
	middleware.JSONList(w, notifs, meta)
}

func (h *Handler) SendNotification(w http.ResponseWriter, r *http.Request) {
	var req SendNotificationRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	notif, err := h.service.SendNotification(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, notif)
}

func (h *Handler) DispatchTemplate(w http.ResponseWriter, r *http.Request) {
	var req DispatchTemplateRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	notif, err := h.service.DispatchTemplate(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, notif)
}

func (h *Handler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	templates, err := h.service.ListTemplates(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]any{"data": templates})
}

func (h *Handler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	if code == "" {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Kode template wajib diisi"))
		return
	}

	var req UpdateTemplateRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.UpdateTemplate(r.Context(), code, req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Template berhasil diperbarui"})
}
