package customer

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
		r.With(authMW.RequirePermission("customers:read")).Get("/", h.List)
		r.With(authMW.RequireAnyPermission("customers:read", "payments:read", "payments:write")).Get("/{id}", h.GetByID)
		r.With(authMW.RequirePermission("customers:read")).Get("/{id}/devices", h.GetDevices)
		r.With(authMW.RequirePermission("customers:read")).Get("/{id}/documents", h.GetDocuments)

		// Write routes
		r.With(authMW.RequirePermission("customers:write")).Post("/", h.Create)
		r.With(authMW.RequirePermission("customers:write")).Put("/{id}", h.Update)
		r.With(authMW.RequirePermission("customers:write")).Post("/{id}/addresses", h.AddAddress)
		r.With(authMW.RequirePermission("customers:write")).Post("/{id}/devices", h.RegisterDevice)

		// Delete route
		r.With(authMW.RequirePermission("customers:delete")).Delete("/{id}", h.Delete)
	})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateCustomerRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	cust, err := h.service.Create(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, cust)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	search := r.URL.Query().Get("search")
	status := r.URL.Query().Get("status")

	customers, meta, err := h.service.List(r.Context(), params, search, status)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, customers, meta)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID pelanggan tidak valid"))
		return
	}

	cust, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, cust)
}

func (h *Handler) GetDocuments(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID pelanggan tidak valid"))
		return
	}

	docs, err := h.service.GetDocuments(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, docs)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID pelanggan tidak valid"))
		return
	}

	var req UpdateCustomerRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	cust, err := h.service.Update(r.Context(), id, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, cust)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID pelanggan tidak valid"))
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Pelanggan berhasil dihapus"})
}

func (h *Handler) AddAddress(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID pelanggan tidak valid"))
		return
	}

	var req AddAddressRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	addr, err := h.service.AddAddress(r.Context(), id, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, addr)
}

func (h *Handler) RegisterDevice(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID pelanggan tidak valid"))
		return
	}

	var req RegisterDeviceRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	dev, err := h.service.RegisterDevice(r.Context(), id, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, dev)
}

func (h *Handler) GetDevices(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID pelanggan tidak valid"))
		return
	}

	devices, err := h.service.GetDevices(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, devices)
}
