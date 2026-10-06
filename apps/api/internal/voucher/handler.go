package voucher

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

		// Templates (Catalog readable by any authenticated user)
		r.Get("/templates", h.ListTemplates)
		r.With(authMW.RequirePermission("vouchers:write")).Post("/templates", h.CreateTemplate)
		r.With(authMW.RequirePermission("vouchers:write")).Put("/templates/{id}", h.UpdateTemplate)
		r.With(authMW.RequirePermission("vouchers:write")).Delete("/templates/{id}", h.DeleteTemplate)

		// Batches
		r.With(authMW.RequirePermission("vouchers:read")).Get("/batches", h.ListBatches)
		r.With(authMW.RequirePermission("vouchers:write")).Post("/generate", h.GenerateBatch)
		r.With(authMW.RequirePermission("vouchers:write")).Post("/generate-blank", h.GenerateBlankBatch)

		// Orders
		r.With(authMW.RequirePermission("vouchers:read")).Get("/orders", h.ListOrders)

		// Vouchers
		r.With(authMW.RequirePermission("vouchers:read")).Get("/", h.ListVouchers)
		r.With(authMW.RequirePermission("vouchers:read")).Get("/{id}", h.GetByID)
		r.With(authMW.RequirePermission("vouchers:write")).Post("/{id}/resend-wa", h.ResendWhatsApp)
		r.With(authMW.RequirePermission("vouchers:write")).Post("/{id}/reset-mac", h.ResetMAC)
		r.With(authMW.RequirePermission("vouchers:revoke")).Post("/{id}/revoke", h.Revoke)

		// Scratch Voucher Blanko Activation (by Agent)
		r.Route("/agent", func(r chi.Router) {
			r.Post("/activate-blank", h.ActivateBlankVoucher)
			r.Post("/activate-blank-range", h.ActivateBlankRange)
			r.Get("/check-sn", h.CheckSN)
			r.Post("/reissue-damaged", h.ReissueDamagedVoucher)
			r.Get("/history", h.ListAgentActivatedVouchers)
		})
	})
}

func (h *Handler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	var req CreateTemplateRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	t, err := h.service.CreateTemplate(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, t)
}

func (h *Handler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID template tidak valid"))
		return
	}

	var req UpdateTemplateRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	t, err := h.service.UpdateTemplate(r.Context(), id, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, t)
}

func (h *Handler) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID template tidak valid"))
		return
	}

	if err := h.service.DeleteTemplate(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Template voucher berhasil dihapus / dinonaktifkan"})
}

func (h *Handler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	templates, err := h.service.ListTemplates(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, templates)
}

func (h *Handler) GenerateBatch(w http.ResponseWriter, r *http.Request) {
	var req GenerateBatchRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	claims := auth.ClaimsFromContext(r.Context())
	var createdBy *uuid.UUID
	if claims != nil {
		createdBy = &claims.UserID
	}

	batch, vouchers, err := h.service.GenerateBatch(r.Context(), req, createdBy)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, map[string]interface{}{
		"batch":    batch,
		"vouchers": vouchers,
	})
}

func (h *Handler) ListBatches(w http.ResponseWriter, r *http.Request) {
	batches, err := h.service.ListBatches(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, batches)
}

func (h *Handler) ListVouchers(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	status := r.URL.Query().Get("status")
	batchIDStr := r.URL.Query().Get("batch_id")
	channel := r.URL.Query().Get("channel")
	agentID := r.URL.Query().Get("agent_id")
	search := r.URL.Query().Get("search")
	voucherType := r.URL.Query().Get("voucher_type")

	var batchID *uuid.UUID
	if batchIDStr != "" {
		if id, err := uuid.Parse(batchIDStr); err == nil {
			batchID = &id
		}
	}

	vouchers, meta, err := h.service.ListVouchers(r.Context(), params, batchID, status, channel, agentID, search, voucherType)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, vouchers, meta)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID voucher tidak valid"))
		return
	}

	v, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, v)
}

func (h *Handler) Revoke(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID voucher tidak valid"))
		return
	}

	var req RevokeVoucherRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.Revoke(r.Context(), id, req.Reason); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Voucher berhasil dibatalkan (REVOKED)"})
}

func (h *Handler) ResendWhatsApp(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID voucher tidak valid"))
		return
	}

	if err := h.service.ResendWhatsApp(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{
		"message": "Kode voucher berhasil dikirim ulang ke nomor WhatsApp pembeli",
	})
}

func (h *Handler) ResetMAC(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID voucher tidak valid"))
		return
	}

	if err := h.service.ResetMAC(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{
		"message": "Kuncian MAC perangkat berhasil direset",
	})
}

func (h *Handler) getAuthenticatedAgentID(r *http.Request) (uuid.UUID, error) {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		return uuid.Nil, apperrors.Unauthorized("Sesi login tidak valid")
	}

	agentID, _, _, _, err := h.service.GetAgentByUserID(r.Context(), claims.UserID)
	if err != nil {
		return uuid.Nil, apperrors.Forbidden("Akun Anda tidak terdaftar sebagai mitra agen aktif")
	}
	return agentID, nil
}

func (h *Handler) GenerateBlankBatch(w http.ResponseWriter, r *http.Request) {
	var req GenerateBlankBatchRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	claims := auth.ClaimsFromContext(r.Context())
	var createdBy *uuid.UUID
	if claims != nil {
		createdBy = &claims.UserID
	}

	batch, vouchers, err := h.service.GenerateBlankBatch(r.Context(), req, createdBy)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, map[string]interface{}{
		"batch":    batch,
		"vouchers": vouchers,
	})
}

func (h *Handler) ActivateBlankVoucher(w http.ResponseWriter, r *http.Request) {
	agentID, err := h.getAuthenticatedAgentID(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	var req ActivateBlankVoucherRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	voucher, err := h.service.ActivateBlankVoucher(r.Context(), agentID, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, voucher)
}

func (h *Handler) ActivateBlankRange(w http.ResponseWriter, r *http.Request) {
	agentID, err := h.getAuthenticatedAgentID(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	var req ActivateBlankRangeRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	res, err := h.service.ActivateBlankRange(r.Context(), agentID, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, res)
}

func (h *Handler) CheckSN(w http.ResponseWriter, r *http.Request) {
	sn := r.URL.Query().Get("sn")
	if sn == "" {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Nomor seri kartu (sn) wajib diisi"))
		return
	}

	inquiry, err := h.service.CheckSN(r.Context(), sn)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, inquiry)
}

func (h *Handler) ReissueDamagedVoucher(w http.ResponseWriter, r *http.Request) {
	agentID, err := h.getAuthenticatedAgentID(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	var req ReissueDamagedVoucherRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	voucher, err := h.service.ReissueDamagedVoucher(r.Context(), agentID, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, voucher)
}

func (h *Handler) ListAgentActivatedVouchers(w http.ResponseWriter, r *http.Request) {
	agentID, err := h.getAuthenticatedAgentID(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	params := pagination.FromRequest(r)
	search := r.URL.Query().Get("search")
	vouchers, meta, err := h.service.ListAgentActivatedVouchers(r.Context(), agentID, params, search)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, vouchers, meta)
}

func (h *Handler) ListOrders(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")

	res, err := h.service.ListHotspotOrders(r.Context(), ListHotspotOrdersFilter{
		Status: status,
		Search: search,
		Page:   params.Page,
		Limit:  params.Limit,
	})
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, res)
}

