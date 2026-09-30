package agent

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
	// Public validation endpoint for /hotspot/buy checkout
	r.Get("/hotspot/validate-promo", h.ValidatePromoCode)

	// Admin Agent Management
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		r.With(authMW.RequirePermission("agents:read")).Get("/agents", h.ListAgents)
		r.With(authMW.RequirePermission("agents:write")).Post("/agents", h.CreateAgent)
		r.With(authMW.RequirePermission("agents:read")).Get("/agents/mutations", h.ListAllMutations)
		r.With(authMW.RequirePermission("agents:read")).Get("/agents/{id}", h.GetAgent)
		r.With(authMW.RequirePermission("agents:write")).Put("/agents/{id}", h.UpdateAgent)
		r.With(authMW.RequirePermission("agents:write")).Post("/agents/{id}/topup", h.TopupManual)
		r.With(authMW.RequirePermission("agents:write")).Post("/agents/{id}/withdraw", h.WithdrawManual)
		r.With(authMW.RequirePermission("agents:read")).Get("/agents/{id}/mutations", h.ListAgentMutations)

		// Admin Topup Requests
		r.With(authMW.RequirePermission("agents:read")).Get("/agents/topup-requests", h.ListTopupRequests)
		r.With(authMW.RequirePermission("agents:write")).Post("/agents/topup-requests/{id}/process", h.ProcessTopupRequest)

		// Agent Self-Service Portal (Accessible by logged in agent)
		r.Route("/agent-portal", func(r chi.Router) {
			r.Get("/me", h.GetMyDashboard)
			r.Get("/promo-today", h.GetMyPromoCode)
			r.Post("/topup-requests", h.SubmitMyTopupRequest)
			r.Get("/topup-requests", h.ListMyTopupRequests)
			r.Get("/mutations", h.ListMyMutations)
			r.Post("/generate-batch", h.GenerateOfflineBatch)
			r.Get("/vouchers", h.ListMyVouchers)
			r.Post("/vouchers/mark-printed", h.MarkVouchersPrinted)
			r.Get("/templates", h.ListTemplates)
			r.Get("/invoices/inquiry", h.InquireInvoice)
			r.Post("/invoices/pay", h.PayInvoice)
			r.Put("/settings", h.UpdateMySettings)
		})
	})
}

// ──────────────────────────────────────────
// Admin Handlers
// ──────────────────────────────────────────

func getUserIDFromContext(r *http.Request) *uuid.UUID {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		return nil
	}
	return &claims.UserID
}

func (h *Handler) CreateAgent(w http.ResponseWriter, r *http.Request) {
	var req CreateAgentRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	adminID := getUserIDFromContext(r)
	a, err := h.service.CreateAgent(r.Context(), req, adminID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, a)
}

func (h *Handler) GetAgent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID agen tidak valid"))
		return
	}

	a, err := h.service.GetAgent(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, a)
}

func (h *Handler) ListAgents(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	search := r.URL.Query().Get("search")
	status := r.URL.Query().Get("status")

	agents, meta, err := h.service.ListAgents(r.Context(), params, search, status)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, agents, meta)
}

func (h *Handler) UpdateAgent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID agen tidak valid"))
		return
	}

	var req UpdateAgentRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	a, err := h.service.UpdateAgent(r.Context(), id, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, a)
}

func (h *Handler) TopupManual(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID agen tidak valid"))
		return
	}

	var req TopupManualRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	adminID := getUserIDFromContext(r)
	mutation, err := h.service.TopupManual(r.Context(), id, req, adminID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, mutation)
}

func (h *Handler) WithdrawManual(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID agen tidak valid"))
		return
	}

	var req WithdrawManualRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	adminID := getUserIDFromContext(r)
	mutation, err := h.service.WithdrawManual(r.Context(), id, req, adminID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, mutation)
}

func (h *Handler) ListAllMutations(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)

	var agentID *uuid.UUID
	if agentIDStr := r.URL.Query().Get("agent_id"); agentIDStr != "" {
		if id, err := uuid.Parse(agentIDStr); err == nil {
			agentID = &id
		}
	}

	var mutationType *string
	if mType := r.URL.Query().Get("mutation_type"); mType != "" {
		mutationType = &mType
	}

	mutations, meta, err := h.service.ListMutations(r.Context(), agentID, mutationType, params)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, mutations, meta)
}

func (h *Handler) ListAgentMutations(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID agen tidak valid"))
		return
	}

	params := pagination.FromRequest(r)
	var mutationType *string
	if mType := r.URL.Query().Get("mutation_type"); mType != "" {
		mutationType = &mType
	}

	mutations, meta, err := h.service.ListMutations(r.Context(), &id, mutationType, params)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, mutations, meta)
}

func (h *Handler) ListTopupRequests(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	status := r.URL.Query().Get("status")

	var agentID *uuid.UUID
	if agentIDStr := r.URL.Query().Get("agent_id"); agentIDStr != "" {
		if id, err := uuid.Parse(agentIDStr); err == nil {
			agentID = &id
		}
	}

	items, meta, err := h.service.ListTopupRequests(r.Context(), params, agentID, status)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, items, meta)
}

func (h *Handler) ProcessTopupRequest(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID permintaan top-up tidak valid"))
		return
	}

	var req ProcessTopupRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	adminID := getUserIDFromContext(r)
	processed, err := h.service.ProcessTopupRequest(r.Context(), id, req, adminID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, processed)
}

// ──────────────────────────────────────────
// Agent Self-Service Handlers
// ──────────────────────────────────────────

func (h *Handler) getAuthenticatedAgent(r *http.Request) (*Agent, error) {
	userID := getUserIDFromContext(r)
	if userID == nil {
		return nil, apperrors.Unauthorized("Sesi tidak valid")
	}

	return h.service.GetAgentByUserID(r.Context(), *userID)
}

func (h *Handler) GetMyDashboard(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	summary, err := h.service.GetAgentDashboard(r.Context(), agent.ID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, summary)
}

func (h *Handler) GetMyPromoCode(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	promo, err := h.service.GetTodayPromo(r.Context(), agent.ID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, promo)
}

func (h *Handler) SubmitMyTopupRequest(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	var req SubmitTopupRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	topup, err := h.service.SubmitTopupRequest(r.Context(), agent.ID, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, topup)
}

func (h *Handler) ListMyTopupRequests(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	params := pagination.FromRequest(r)
	status := r.URL.Query().Get("status")
	items, meta, err := h.service.ListTopupRequests(r.Context(), params, &agent.ID, status)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, items, meta)
}

func (h *Handler) ListMyMutations(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	params := pagination.FromRequest(r)
	var mutationType *string
	if mType := r.URL.Query().Get("mutation_type"); mType != "" {
		mutationType = &mType
	}

	mutations, meta, err := h.service.ListMutations(r.Context(), &agent.ID, mutationType, params)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, mutations, meta)
}

func (h *Handler) GenerateOfflineBatch(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	var req AgentGenerateBatchRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	userID := getUserIDFromContext(r)
	result, err := h.service.GenerateOfflineBatchForAgent(r.Context(), agent.ID, req, userID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, result)
}

func (h *Handler) ListMyVouchers(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	params := pagination.FromRequest(r)
	channel := r.URL.Query().Get("channel") // "OFFLINE" or "ONLINE"
	vouchers, meta, err := h.service.ListAgentVouchers(r.Context(), agent.ID, params, channel)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, vouchers, meta)
}

// ──────────────────────────────────────────
// Public Handler: Validate Promo Code
// ──────────────────────────────────────────

func (h *Handler) ValidatePromoCode(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Kode promo wajib diisi"))
		return
	}

	res, _, err := h.service.ValidatePromo(r.Context(), code)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, res)
}

func (h *Handler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	templates, err := h.service.ListTemplates(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, templates)
}

type MarkPrintedRequest struct {
	VoucherIDs []uuid.UUID `json:"voucher_ids"`
}

func (h *Handler) MarkVouchersPrinted(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	var req MarkPrintedRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.MarkVouchersPrinted(r.Context(), agent.ID, req.VoucherIDs); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Voucher berhasil ditandai sudah dicetak",
	})
}

// ──────────────────────────────────────────
// Loket Pembayaran Tagihan Internet & Settings
// ──────────────────────────────────────────

func (h *Handler) InquireInvoice(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	search := r.URL.Query().Get("search")
	if search == "" {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID Pelanggan, nomor invoice, atau nomor HP harus diisi"))
		return
	}

	res, err := h.service.InquireInvoice(r.Context(), agent.ID, search)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, res)
}

func (h *Handler) PayInvoice(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	var req PayInvoiceByAgentRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	receipt, err := h.service.PayInvoiceByAgent(r.Context(), agent.ID, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, receipt)
}

func (h *Handler) UpdateMySettings(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	var req UpdateAgentSettingsRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	updated, err := h.service.UpdateAgentSettings(r.Context(), agent.ID, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, updated)
}
