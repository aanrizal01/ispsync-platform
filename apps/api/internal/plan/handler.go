package plan

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

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
	// Public read routes for customer onboarding & portal catalog
	r.Get("/", h.List)
	r.Get("/{id}", h.GetByID)
	r.Get("/groups", h.ListGroups)
	r.Get("/groups/{id}", h.GetGroupByID)

	// Protected admin routes
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		// Groups management write routes
		r.With(authMW.RequirePermission("plans:write")).Post("/groups", h.CreateGroup)
		r.With(authMW.RequirePermission("plans:write")).Put("/groups/{id}", h.UpdateGroup)
		r.With(authMW.RequirePermission("plans:write")).Delete("/groups/{id}", h.DeleteGroup)

		// Write routes
		r.With(authMW.RequirePermission("plans:write")).Post("/", h.Create)
		r.With(authMW.RequirePermission("plans:write")).Put("/{id}", h.Update)
		r.With(authMW.RequirePermission("plans:write")).Patch("/{id}/visibility", h.ToggleVisibility)
		r.With(authMW.RequirePermission("plans:write")).Delete("/{id}", h.Delete)
		r.With(authMW.RequirePermission("plans:write")).Post("/{id}/prices", h.AddPriceVersion)
	})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreatePlanRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	claims := auth.ClaimsFromContext(r.Context())
	var userID *uuid.UUID
	if claims != nil {
		userID = &claims.UserID
	}

	p, err := h.service.Create(r.Context(), req, userID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, p)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	status := r.URL.Query().Get("status")
	planType := r.URL.Query().Get("type")
	group := r.URL.Query().Get("group")
	cluster := r.URL.Query().Get("cluster")

	var visibleOnly *bool
	visStr := r.URL.Query().Get("visible")
	if visStr == "" {
		visStr = r.URL.Query().Get("is_visible")
	}
	if visStr == "true" {
		v := true
		visibleOnly = &v
	} else if visStr == "false" {
		v := false
		visibleOnly = &v
	}

	plans, meta, err := h.service.List(r.Context(), params, status, planType, group, cluster, visibleOnly)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, plans, meta)
}

func (h *Handler) ToggleVisibility(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID paket tidak valid"))
		return
	}

	var req ToggleVisibilityRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	p, err := h.service.ToggleVisibility(r.Context(), id, req.IsVisible)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, p)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID paket tidak valid"))
		return
	}

	p, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, p)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID paket tidak valid"))
		return
	}

	var req UpdatePlanRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	p, err := h.service.Update(r.Context(), id, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, p)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID paket tidak valid"))
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Paket berhasil dihapus"})
}

func (h *Handler) AddPriceVersion(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID paket tidak valid"))
		return
	}

	var req CreatePriceVersionRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	claims := auth.ClaimsFromContext(r.Context())
	var userID *uuid.UUID
	if claims != nil {
		userID = &claims.UserID
	}

	price, err := h.service.AddPriceVersion(r.Context(), id, req, userID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, price)
}

// Plan Groups Handlers

func (h *Handler) ListGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := h.service.ListGroups(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, groups)
}

func (h *Handler) GetGroupByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID group paket tidak valid"))
		return
	}

	g, err := h.service.GetGroupByID(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, g)
}

func (h *Handler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	var req CreatePlanGroupRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	g, err := h.service.CreateGroup(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, g)
}

func (h *Handler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID group paket tidak valid"))
		return
	}

	var req UpdatePlanGroupRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	g, err := h.service.UpdateGroup(r.Context(), id, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, g)
}

func (h *Handler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID group paket tidak valid"))
		return
	}

	if err := h.service.DeleteGroup(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusNoContent, nil)
}
