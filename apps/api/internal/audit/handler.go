package audit

import (
	"log/slog"
	"net/http"
	"strconv"

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
		r.Use(authMW.RequireAdmin)

		r.Get("/", h.List)
		r.Get("/entity/{type}/{id}", h.GetByEntity)
	})
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)

	filter := Filter{
		TenantSlug: auth.ExtractTenantSlug(r),
	}

	if search := r.URL.Query().Get("search"); search != "" {
		filter.Search = &search
	}
	if entityType := r.URL.Query().Get("entity_type"); entityType != "" {
		filter.EntityType = &entityType
	}
	if entityID := r.URL.Query().Get("entity_id"); entityID != "" {
		filter.EntityID = &entityID
	}
	if action := r.URL.Query().Get("action"); action != "" {
		filter.Action = &action
	}
	if actorEmail := r.URL.Query().Get("actor_email"); actorEmail != "" {
		filter.ActorEmail = &actorEmail
	}

	logs, meta, err := h.service.List(r.Context(), filter, params)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, logs, meta)
}

func (h *Handler) GetByEntity(w http.ResponseWriter, r *http.Request) {
	entityType := chi.URLParam(r, "type")
	entityID := chi.URLParam(r, "id")
	if entityType == "" || entityID == "" {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("entity_type dan entity_id wajib disertakan"))
		return
	}

	limit := 50
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	tenantSlug := auth.ExtractTenantSlug(r)
	logs, err := h.service.GetByEntity(r.Context(), tenantSlug, entityType, entityID, limit)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, logs)
}
