package partner

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

		// Partners Management (Admin)
		r.With(authMW.RequirePermission("partners:read")).Get("/", h.ListPartners)
		r.With(authMW.RequirePermission("partners:write")).Post("/", h.CreatePartner)
		r.With(authMW.RequirePermission("partners:read")).Get("/{id}", h.GetPartner)
		r.With(authMW.RequirePermission("partners:read")).Get("/{id}/shares", h.ListRevenueShares)

		// Settlements
		r.With(authMW.RequirePermission("partners:read")).Get("/settlements", h.ListSettlements)
		r.With(authMW.RequirePermission("partners:write")).Post("/settlements", h.CreateSettlement)
		r.With(authMW.RequirePermission("partners:write")).Post("/settlements/{id}/process", h.ProcessSettlement)
	})
}

func (h *Handler) CreatePartner(w http.ResponseWriter, r *http.Request) {
	var req CreatePartnerRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	p, err := h.service.CreatePartner(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, p)
}

func (h *Handler) GetPartner(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID mitra tidak valid"))
		return
	}

	p, err := h.service.GetPartner(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, p)
}

func (h *Handler) ListPartners(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	search := r.URL.Query().Get("search")
	status := r.URL.Query().Get("status")

	partners, meta, err := h.service.ListPartners(r.Context(), params, search, status)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, partners, meta)
}

func (h *Handler) ListRevenueShares(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID mitra tidak valid"))
		return
	}

	shares, err := h.service.ListRevenueShares(r.Context(), id, 50, 0)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, shares)
}

func (h *Handler) CreateSettlement(w http.ResponseWriter, r *http.Request) {
	var req CreateSettlementRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	s, err := h.service.CreateSettlement(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, s)
}

func (h *Handler) ListSettlements(w http.ResponseWriter, r *http.Request) {
	partnerIDStr := r.URL.Query().Get("partner_id")
	var partnerID *uuid.UUID
	if partnerIDStr != "" {
		if id, err := uuid.Parse(partnerIDStr); err == nil {
			partnerID = &id
		}
	}

	settlements, err := h.service.ListSettlements(r.Context(), partnerID, 50, 0)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, settlements)
}

func (h *Handler) ProcessSettlement(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID settlement tidak valid"))
		return
	}

	var req ProcessSettlementRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	claims := auth.ClaimsFromContext(r.Context())
	var processedBy *uuid.UUID
	if claims != nil {
		processedBy = &claims.UserID
	}

	if err := h.service.ProcessSettlement(r.Context(), id, req, processedBy); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Status penarikan dana berhasil diperbarui"})
}
