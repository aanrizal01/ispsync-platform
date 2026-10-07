package radius

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/gigabill/isp/internal/auth"
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

		// Sessions
		r.With(authMW.RequirePermission("radius:read")).Get("/sessions", h.ListActiveSessions)
		r.With(authMW.RequirePermission("radius:write")).Post("/sessions/disconnect", h.DisconnectSession)

		// NAS Routers
		r.With(authMW.RequirePermission("radius:read")).Get("/nas", h.ListNAS)
		r.With(authMW.RequirePermission("radius:write")).Post("/nas", h.CreateNAS)

		// Logs
		r.With(authMW.RequirePermission("radius:read")).Get("/auth-logs", h.ListAuthLogs)
	})
}

func (h *Handler) ListActiveSessions(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	search := r.URL.Query().Get("search")

	sessions, meta, err := h.service.ListActiveSessions(r.Context(), params, search)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, sessions, meta)
}

func (h *Handler) DisconnectSession(w http.ResponseWriter, r *http.Request) {
	var req DisconnectSessionRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.DisconnectSession(r.Context(), req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{
		"message": "Permintaan pemutusan sesi (CoA Disconnect) berhasil dikirim",
	})
}

func (h *Handler) ListNAS(w http.ResponseWriter, r *http.Request) {
	nasList, err := h.service.ListNAS(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, nasList)
}

func (h *Handler) CreateNAS(w http.ResponseWriter, r *http.Request) {
	var req CreateNASRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	nas, err := h.service.CreateNAS(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, nas)
}

func (h *Handler) ListAuthLogs(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	search := r.URL.Query().Get("search")

	logs, meta, err := h.service.ListAuthLogs(r.Context(), params, search)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, logs, meta)
}
