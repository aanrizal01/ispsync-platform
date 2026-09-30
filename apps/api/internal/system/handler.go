package system

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/gigabill/isp/internal/auth"
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
		r.Get("/status", h.GetStatus)
	})
}

func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	res, err := h.service.CheckAll(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, res)
}
