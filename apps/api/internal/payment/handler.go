package payment

import (
	"io"
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
	// Public Webhook route (No JWT auth, uses cryptographic signature check)
	r.Post("/webhook/{provider}", h.HandleWebhook)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		r.With(authMW.RequirePermission("payments:read")).Get("/", h.List)
		r.With(authMW.RequirePermission("payments:read")).Get("/{id}", h.GetByID)
		r.With(authMW.RequirePermission("payments:write")).Post("/", h.CreateManualPayment)
	})
}

func (h *Handler) CreateManualPayment(w http.ResponseWriter, r *http.Request) {
	var req CreateManualPaymentRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	p, err := h.service.CreateManualPayment(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, p)
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

	payments, meta, err := h.service.List(r.Context(), params, custID, status)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSONList(w, payments, meta)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID pembayaran tidak valid"))
		return
	}

	p, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, p)
}

func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	if provider == "" {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Provider parameter required"))
		return
	}

	// Read raw payload for signature verification
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Failed to read webhook payload"))
		return
	}
	defer r.Body.Close()

	// Extract potential signature headers
	signature := r.Header.Get("X-Callback-Signature")
	if signature == "" {
		signature = r.Header.Get("X-Signature")
	}
	if signature == "" {
		signature = r.Header.Get("x-callback-token")
	}

	if err := h.service.ProcessWebhook(r.Context(), provider, payload, signature); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	// Gateways expect 200 OK
	middleware.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
