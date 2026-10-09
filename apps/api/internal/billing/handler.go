package billing

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

func extractTenantSlug(r *http.Request) string {
	return auth.ExtractTenantSlug(r)
}

type Handler struct {
	service *Service
	logger  *slog.Logger
}

func NewHandler(service *Service, logger *slog.Logger) *Handler {
	return &Handler{service: service, logger: logger}
}

func (h *Handler) Routes(r chi.Router, authMW *auth.Middleware) {
	// Public routes (No JWT required, for customer self-service)
	r.Post("/public/lookup", h.PublicLookup)
	r.Post("/public/pay-qris", h.PublicPayInvoice)
	r.Post("/public/topup-deposit", h.PublicTopUpDeposit)
	r.Get("/public/{number}/print", h.PublicPrintInvoice)
	r.Get("/public/invoices/{number}/print", h.PublicPrintInvoice)

	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		// Read routes
		r.With(authMW.RequireAnyPermission("invoices:read", "payments:read", "payments:write")).Get("/", h.List)
		r.With(authMW.RequireAnyPermission("invoices:read", "payments:read", "payments:write")).Get("/{id}", h.GetByID)
		r.With(authMW.RequireAnyPermission("invoices:read", "payments:read", "payments:write")).Get("/{id}/print", h.PrintInvoice)

		// Write routes
		r.With(authMW.RequirePermission("invoices:write")).Post("/", h.CreateManual)
		r.With(authMW.RequirePermission("invoices:write")).Post("/{id}/issue", h.Issue)
		r.With(authMW.RequirePermission("invoices:void")).Post("/{id}/void", h.Void)
		r.With(authMW.RequirePermission("invoices:write")).Post("/{id}/send-reminder", h.SendManualReminder)

		// Security Deposit routes
		r.With(authMW.RequirePermission("invoices:write")).Post("/security-deposit", h.CreateSecurityDeposit)
		r.With(authMW.RequirePermission("invoices:write")).Post("/security-deposit/{id}/release", h.ReleaseSecurityDeposit)
		r.With(authMW.RequirePermission("invoices:write")).Post("/security-deposit/{id}/forfeit", h.ForfeitSecurityDeposit)
		r.With(authMW.RequirePermission("invoices:write")).Post("/security-deposit/{id}/refund", h.RefundSecurityDeposit)
	})
}

func (h *Handler) PublicLookup(w http.ResponseWriter, r *http.Request) {
	var req PublicInvoiceLookupRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	tenantSlug := extractTenantSlug(r)
	res, err := h.service.PublicLookup(r.Context(), tenantSlug, req.Query)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, res)
}

func (h *Handler) PublicPayInvoice(w http.ResponseWriter, r *http.Request) {
	var req PublicPayInvoiceRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	res, err := h.service.PublicPayInvoice(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, res)
}

func (h *Handler) PublicTopUpDeposit(w http.ResponseWriter, r *http.Request) {
	var req PublicTopUpDepositRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	res, err := h.service.PublicTopUpDeposit(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, res)
}



func (h *Handler) CreateManual(w http.ResponseWriter, r *http.Request) {
	var req CreateManualInvoiceRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	claims := auth.ClaimsFromContext(r.Context())
	var issuedBy *uuid.UUID
	if claims != nil {
		issuedBy = &claims.UserID
	}

	inv, err := h.service.CreateManual(r.Context(), req, issuedBy)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, inv)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)
	status := r.URL.Query().Get("status")
	custIDStr := r.URL.Query().Get("customer_id")

	var custID *uuid.UUID
	if custIDStr != "" {
		if id, err := uuid.Parse(custIDStr); err == nil {
			custID = &id
		}
	}

	tenantSlug := extractTenantSlug(r)
	invoices, meta, err := h.service.List(r.Context(), tenantSlug, params, custID, status)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, invoices, meta)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID invoice tidak valid"))
		return
	}

	inv, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, inv)
}

func (h *Handler) Issue(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID invoice tidak valid"))
		return
	}

	claims := auth.ClaimsFromContext(r.Context())
	var issuedBy *uuid.UUID
	if claims != nil {
		issuedBy = &claims.UserID
	}

	if err := h.service.Issue(r.Context(), id, issuedBy); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Invoice berhasil diterbitkan"})
}

func (h *Handler) Void(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID invoice tidak valid"))
		return
	}

	var req VoidInvoiceRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.Void(r.Context(), id, req.Reason); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Invoice berhasil dibatalkan (VOID)"})
}

func (h *Handler) CreateSecurityDeposit(w http.ResponseWriter, r *http.Request) {
	var req CreateSecurityDepositRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	cn, err := h.service.CreateSecurityDeposit(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusCreated, cn)
}

func (h *Handler) ReleaseSecurityDeposit(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID deposit tidak valid"))
		return
	}
	var req ReleaseDepositRequest
	_ = middleware.DecodeJSON(r, &req)

	if err := h.service.ReleaseSecurityDeposit(r.Context(), id, req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Deposit jaminan berhasil dicairkan menjadi saldo aktif"})
}

func (h *Handler) ForfeitSecurityDeposit(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID deposit tidak valid"))
		return
	}
	var req ForfeitDepositRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	if err := h.service.ForfeitSecurityDeposit(r.Context(), id, req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Deposit jaminan berhasil disita sebagai pinalti"})
}

func (h *Handler) RefundSecurityDeposit(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID deposit tidak valid"))
		return
	}
	var req struct {
		Reason string `json:"reason"`
	}
	_ = middleware.DecodeJSON(r, &req)

	if err := h.service.RefundSecurityDeposit(r.Context(), id, req.Reason); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Deposit jaminan berhasil diproses untuk refund"})
}

func (h *Handler) PublicPrintInvoice(w http.ResponseWriter, r *http.Request) {
	num := chi.URLParam(r, "number")
	if num == "" {
		http.Error(w, "Nomor invoice wajib diisi", http.StatusBadRequest)
		return
	}

	htmlContent, err := h.service.RenderPublicInvoicePrint(r.Context(), num)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(htmlContent))
}

func (h *Handler) PrintInvoice(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID invoice tidak valid"))
		return
	}

	htmlContent, err := h.service.RenderInvoicePrint(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(htmlContent))
}

func (h *Handler) SendManualReminder(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID invoice tidak valid"))
		return
	}

	if err := h.service.SendManualReminder(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{
		"message": "Pengingat tagihan WhatsApp berhasil dikirim ke pelanggan",
	})
}

