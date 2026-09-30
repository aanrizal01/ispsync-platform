package subscription

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
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		// Read routes
		r.With(authMW.RequirePermission("subscriptions:read")).Get("/", h.List)
		r.With(authMW.RequirePermission("subscriptions:read")).Get("/{id}", h.GetByID)

		// Write routes
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/", h.Create)
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/{id}/activate", h.Activate)
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/{id}/revert-pending", h.RevertPending)
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/{id}/suspend", h.Suspend)
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/{id}/reactivate", h.Reactivate)
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/{id}/change-plan", h.ChangePlan)
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/{id}/cancel", h.Cancel)
	})
}

func (h *Handler) AccessAccountRoutes(r chi.Router, authMW *auth.Middleware) {
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		r.With(authMW.RequirePermission("subscriptions:read")).Get("/", h.ListAccessAccounts)
		r.With(authMW.RequirePermission("subscriptions:write")).Post("/", h.CreateAccessAccount)
		r.With(authMW.RequirePermission("subscriptions:write")).Put("/{id}/status", h.UpdateAccessAccountStatus)
		r.With(authMW.RequirePermission("subscriptions:write")).Put("/{id}/ip", h.UpdateAccessAccountIP)
	})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateSubscriptionRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	sub, err := h.service.Create(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, sub)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	status := r.URL.Query().Get("status")
	custIDStr := r.URL.Query().Get("customer_id")
	search := r.URL.Query().Get("search")

	var custID *uuid.UUID
	if custIDStr != "" {
		if id, err := uuid.Parse(custIDStr); err == nil {
			custID = &id
		}
	}

	subs, meta, err := h.service.List(r.Context(), params, custID, status, search)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, subs, meta)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID langganan tidak valid"))
		return
	}

	sub, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, sub)
}

func (h *Handler) Activate(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID langganan tidak valid"))
		return
	}

	sub, err := h.service.Activate(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, sub)
}

func (h *Handler) RevertPending(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID langganan tidak valid"))
		return
	}

	sub, err := h.service.RevertToPending(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, sub)
}

func (h *Handler) Suspend(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID langganan tidak valid"))
		return
	}

	sub, err := h.service.Suspend(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, sub)
}

func (h *Handler) Reactivate(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID langganan tidak valid"))
		return
	}

	sub, err := h.service.Reactivate(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, sub)
}

func (h *Handler) ChangePlan(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID langganan tidak valid"))
		return
	}

	var req ChangePlanRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	sub, err := h.service.ChangePlan(r.Context(), id, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, sub)
}

func (h *Handler) Cancel(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID langganan tidak valid"))
		return
	}

	var req CancelSubscriptionRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	sub, err := h.service.Cancel(r.Context(), id, req.Reason)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, sub)
}

// Access Accounts Handlers

func (h *Handler) CreateAccessAccount(w http.ResponseWriter, r *http.Request) {
	var req CreateAccessAccountRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	acc, err := h.service.CreateAccessAccount(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, acc)
}

func (h *Handler) ListAccessAccounts(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	accessType := r.URL.Query().Get("type")
	custIDStr := r.URL.Query().Get("customer_id")

	var custID *uuid.UUID
	if custIDStr != "" {
		if id, err := uuid.Parse(custIDStr); err == nil {
			custID = &id
		}
	}

	accs, meta, err := h.service.ListAccessAccounts(r.Context(), params, custID, accessType)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, accs, meta)
}

func (h *Handler) UpdateAccessAccountStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID access account tidak valid"))
		return
	}

	var req UpdateAccessAccountStatusRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.UpdateAccessAccountStatus(r.Context(), id, req.Status); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Status access account berhasil diperbarui"})
}

func (h *Handler) UpdateAccessAccountIP(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID access account tidak valid"))
		return
	}

	var req UpdateAccessAccountIPRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	acc, err := h.service.UpdateAccessAccountIP(r.Context(), id, req.StaticIP, req.DisconnectSession)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, acc)
}
