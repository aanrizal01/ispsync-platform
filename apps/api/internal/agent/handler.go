package agent

import (
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/auth"
	"github.com/gigabill/isp/internal/passpoint"
	"github.com/gigabill/isp/internal/settings"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/middleware"
	"github.com/gigabill/isp/internal/shared/pagination"
)

var (
	regRateLimitMu sync.Mutex
	regRateLimits  = make(map[string][]time.Time)
)

func checkRegistrationRateLimit(ip string) bool {
	if ip == "" || ip == "127.0.0.1" || ip == "::1" {
		return true
	}
	regRateLimitMu.Lock()
	defer regRateLimitMu.Unlock()

	now := time.Now()
	cutoff := now.Add(-10 * time.Minute)

	validTimes := make([]time.Time, 0, len(regRateLimits[ip]))
	for _, t := range regRateLimits[ip] {
		if t.After(cutoff) {
			validTimes = append(validTimes, t)
		}
	}

	// Max 5 registration submissions per IP per 10 minutes
	if len(validTimes) >= 5 {
		regRateLimits[ip] = validTimes
		return false
	}

	validTimes = append(validTimes, now)
	regRateLimits[ip] = validTimes
	return true
}

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
	// Public agent self-registration endpoint
	r.Post("/agents/register", h.RegisterAgent)

	// Admin Agent Management
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		r.With(authMW.RequirePermission("agents:read")).Get("/agents", h.ListAgents)
		r.With(authMW.RequirePermission("agents:write")).Post("/agents", h.CreateAgent)
		r.With(authMW.RequirePermission("agents:read")).Get("/agents/mutations", h.ListAllMutations)
		r.With(authMW.RequirePermission("agents:read")).Get("/agents/{id}", h.GetAgent)
		r.With(authMW.RequirePermission("agents:write")).Put("/agents/{id}", h.UpdateAgent)
		r.With(authMW.RequirePermission("agents:write")).Post("/agents/{id}/approve", h.ApproveAgent)
		r.With(authMW.RequirePermission("agents:write")).Post("/agents/{id}/reject", h.RejectAgent)
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
			r.Get("/passpoint/inquiry", h.InquirePasspoint)
			r.Post("/passpoint/pay", h.PayPasspoint)
			r.Post("/passpoint/issue-manual", h.IssueManualPasspoint)
			r.Put("/settings", h.UpdateMySettings)
		})
	})
}

// ──────────────────────────────────────────
// Admin Handlers
// ──────────────────────────────────────────

func extractTenantSlug(r *http.Request) string {
	return auth.ExtractTenantSlug(r)
}

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
	tenantSlug := extractTenantSlug(r)
	a, err := h.service.CreateAgent(r.Context(), tenantSlug, req, adminID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, a)
}

func (h *Handler) RegisterAgent(w http.ResponseWriter, r *http.Request) {
	clientIP := settings.ExtractClientIP(r)
	if !checkRegistrationRateLimit(clientIP) {
		middleware.JSONError(w, h.logger, apperrors.New("RATE_LIMITED", "Terlalu banyak permintaan pendaftaran dari IP ini. Silakan coba kembali dalam 10 menit.", http.StatusTooManyRequests))
		return
	}

	var req RegisterAgentRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	tenantSlug := extractTenantSlug(r)
	a, err := h.service.RegisterAgent(r.Context(), tenantSlug, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, a)
}

func (h *Handler) ApproveAgent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID agen tidak valid"))
		return
	}

	adminID := getUserIDFromContext(r)
	a, err := h.service.ApproveAgentRegistration(r.Context(), id, adminID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, a)
}

func (h *Handler) RejectAgent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID agen tidak valid"))
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	_ = middleware.DecodeJSON(r, &req)

	adminID := getUserIDFromContext(r)
	a, err := h.service.RejectAgentRegistration(r.Context(), id, req.Reason, adminID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, a)
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

	agents, meta, err := h.service.ListAgents(r.Context(), extractTenantSlug(r), params, search, status)
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

	var startDate *time.Time
	if sDateStr := r.URL.Query().Get("start_date"); sDateStr != "" {
		if t, err := time.Parse("2006-01-02", sDateStr); err == nil {
			startDate = &t
		} else if t, err := time.Parse(time.RFC3339, sDateStr); err == nil {
			startDate = &t
		}
	}

	var endDate *time.Time
	if eDateStr := r.URL.Query().Get("end_date"); eDateStr != "" {
		if t, err := time.Parse("2006-01-02", eDateStr); err == nil {
			tEnd := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, t.Location())
			endDate = &tEnd
		} else if t, err := time.Parse(time.RFC3339, eDateStr); err == nil {
			endDate = &t
		}
	}

	mutations, meta, err := h.service.ListMutations(r.Context(), extractTenantSlug(r), agentID, mutationType, startDate, endDate, params)
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

	var startDate *time.Time
	if sDateStr := r.URL.Query().Get("start_date"); sDateStr != "" {
		if t, err := time.Parse("2006-01-02", sDateStr); err == nil {
			startDate = &t
		} else if t, err := time.Parse(time.RFC3339, sDateStr); err == nil {
			startDate = &t
		}
	}

	var endDate *time.Time
	if eDateStr := r.URL.Query().Get("end_date"); eDateStr != "" {
		if t, err := time.Parse("2006-01-02", eDateStr); err == nil {
			tEnd := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, t.Location())
			endDate = &tEnd
		} else if t, err := time.Parse(time.RFC3339, eDateStr); err == nil {
			endDate = &t
		}
	}

	mutations, meta, err := h.service.ListMutations(r.Context(), extractTenantSlug(r), &id, mutationType, startDate, endDate, params)
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

	items, meta, err := h.service.ListTopupRequests(r.Context(), extractTenantSlug(r), params, agentID, status)
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
	items, meta, err := h.service.ListTopupRequests(r.Context(), agent.TenantSlug, params, &agent.ID, status)
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

	var startDate *time.Time
	if sDateStr := r.URL.Query().Get("start_date"); sDateStr != "" {
		if t, err := time.Parse("2006-01-02", sDateStr); err == nil {
			startDate = &t
		} else if t, err := time.Parse(time.RFC3339, sDateStr); err == nil {
			startDate = &t
		}
	}

	var endDate *time.Time
	if eDateStr := r.URL.Query().Get("end_date"); eDateStr != "" {
		if t, err := time.Parse("2006-01-02", eDateStr); err == nil {
			tEnd := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, t.Location())
			endDate = &tEnd
		} else if t, err := time.Parse(time.RFC3339, eDateStr); err == nil {
			endDate = &t
		}
	}

	mutations, meta, err := h.service.ListMutations(r.Context(), agent.TenantSlug, &agent.ID, mutationType, startDate, endDate, params)
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

	res, _, err := h.service.ValidatePromo(r.Context(), extractTenantSlug(r), code)
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

// ──────────────────────────────────────────
// Loket Passpoint Wi-Fi
// ──────────────────────────────────────────

func (h *Handler) InquirePasspoint(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Kode kasir atau Order ID harus diisi"))
		return
	}

	res, err := h.service.InquirePasspoint(r.Context(), agent.ID, code)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, res)
}

func (h *Handler) PayPasspoint(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	var req passpoint.PayPasspointByAgentRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	receipt, err := h.service.PayPasspoint(r.Context(), agent.ID, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, receipt)
}

func (h *Handler) IssueManualPasspoint(w http.ResponseWriter, r *http.Request) {
	agent, err := h.getAuthenticatedAgent(r)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	var req passpoint.IssueManualPasspointRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	receipt, err := h.service.IssueManualPasspoint(r.Context(), agent.ID, req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, receipt)
}
