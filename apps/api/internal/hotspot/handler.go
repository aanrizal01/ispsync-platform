package hotspot

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/gigabill/isp/internal/shared/middleware"
)

type Handler struct {
	service *Service
	logger  *slog.Logger
}

func NewHandler(service *Service, logger *slog.Logger) *Handler {
	return &Handler{service: service, logger: logger}
}

func (h *Handler) Routes(r chi.Router) {
	// All hotspot portal routes are public (end-user access)
	r.Post("/login", h.Login)
	r.Get("/status", h.GetStatus)
	r.Post("/logout", h.Logout)

	// Self-service online voucher purchase
	r.Get("/packages", h.GetPackages)
	r.Post("/purchase", h.Purchase)
	r.Post("/check-purchase", h.CheckPurchase)
	r.Post("/recover-voucher", h.RecoverVoucher)
	r.Post("/reset-device", h.ResetDevice)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	// Read remote IP if client_ip is empty
	if req.ClientIP == "" {
		req.ClientIP = r.RemoteAddr
	}

	resp, err := h.service.Login(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, resp)
}

func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	clientIP := r.URL.Query().Get("ip")
	clientMAC := r.URL.Query().Get("mac")

	if clientIP == "" {
		clientIP = r.RemoteAddr
	}

	status, err := h.service.GetStatus(r.Context(), username, clientIP, clientMAC)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, status)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	var req LogoutRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.Logout(r.Context(), req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{
		"message": "Sesi hotspot berhasil diakhiri",
	})
}

func (h *Handler) GetPackages(w http.ResponseWriter, r *http.Request) {
	pkgs, err := h.service.GetPackages(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, pkgs)
}

func (h *Handler) Purchase(w http.ResponseWriter, r *http.Request) {
	var req PurchaseRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if req.ClientIP == "" {
		req.ClientIP = r.RemoteAddr
	}

	resp, err := h.service.Purchase(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, resp)
}

func (h *Handler) CheckPurchase(w http.ResponseWriter, r *http.Request) {
	var req ClaimPurchaseRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	resp, err := h.service.CheckPurchase(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, resp)
}

func (h *Handler) RecoverVoucher(w http.ResponseWriter, r *http.Request) {
	var req RecoverVoucherRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if req.ClientIP == "" {
		req.ClientIP = r.RemoteAddr
	}

	resp, err := h.service.RecoverVoucher(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, resp)
}

func (h *Handler) ResetDevice(w http.ResponseWriter, r *http.Request) {
	var req ResetDeviceRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	resp, err := h.service.ResetDevice(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, resp)
}


