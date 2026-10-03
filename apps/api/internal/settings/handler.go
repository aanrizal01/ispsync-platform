package settings

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/gigabill/isp/internal/auth"
	"github.com/gigabill/isp/internal/shared/middleware"
)

type Handler struct {
	service *Service
	logger  *slog.Logger
}

func NewHandler(service *Service, logger *slog.Logger) *Handler {
	return &Handler{service: service, logger: logger}
}

func (h *Handler) Routes(r chi.Router, authMW *auth.Middleware) {
	// Public route: readable for invoice rendering, client IP check, payment gateway check, and router walled-garden sync
	r.Get("/invoice-template", h.GetInvoiceTemplate)
	r.Get("/billing-addons", h.GetBillingAddons)
	r.Get("/client-ip", h.GetClientIP)
	r.Get("/walled-garden", h.GetWalledGarden)
	r.Get("/payment-gateway", h.GetPaymentGatewaySettings)
	r.Get("/domain", h.GetDomainSettings)

	// Admin protected route: update invoice template, billing addons, domain & security policy
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)
		r.Put("/invoice-template", h.UpdateInvoiceTemplate)
		r.Post("/invoice-template", h.UpdateInvoiceTemplate)
		r.Put("/billing-addons", h.UpdateBillingAddons)
		r.Post("/billing-addons", h.UpdateBillingAddons)
		r.Get("/security", h.GetSecuritySettings)
		r.Put("/security", h.UpdateSecuritySettings)
		r.Post("/security", h.UpdateSecuritySettings)
		r.Put("/payment-gateway", h.UpdatePaymentGatewaySettings)
		r.Put("/domain", h.UpdateDomainSettings)
		r.Post("/domain", h.UpdateDomainSettings)
		r.Get("/notification", h.GetNotificationSettings)
		r.Put("/notification", h.UpdateNotificationSettings)
		r.Post("/notification", h.UpdateNotificationSettings)
		r.Post("/test-whatsapp", h.TestWhatsApp)
	})
}

func (h *Handler) GetInvoiceTemplate(w http.ResponseWriter, r *http.Request) {
	settings, err := h.service.GetInvoiceTemplate(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, settings)
}

func (h *Handler) UpdateInvoiceTemplate(w http.ResponseWriter, r *http.Request) {
	var req InvoiceTemplateSettings
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	updated, err := h.service.UpdateInvoiceTemplate(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Template faktur berhasil diperbarui",
		"data":    updated,
	})
}

func (h *Handler) GetBillingAddons(w http.ResponseWriter, r *http.Request) {
	settings, err := h.service.GetBillingAddons(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, settings)
}

func (h *Handler) UpdateBillingAddons(w http.ResponseWriter, r *http.Request) {
	var req BillingAddonSettings
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	updated, err := h.service.UpdateBillingAddons(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Tarif add-on berhasil diperbarui",
		"data":    updated,
	})
}

func (h *Handler) GetSecuritySettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.service.GetSecuritySettings(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, settings)
}

func (h *Handler) UpdateSecuritySettings(w http.ResponseWriter, r *http.Request) {
	var req SecuritySettings
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	updated, err := h.service.UpdateSecuritySettings(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Kebijakan keamanan sistem berhasil diperbarui",
		"data":    updated,
	})
}

func (h *Handler) GetClientIP(w http.ResponseWriter, r *http.Request) {
	clientIP := ExtractClientIP(r)
	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"ip":      clientIP,
	})
}

func (h *Handler) GetWalledGarden(w http.ResponseWriter, r *http.Request) {
	sec, err := h.service.GetSecuritySettings(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	hosts := []string{}
	for _, h := range strings.Split(sec.WalledGardenHosts, ",") {
		h = strings.TrimSpace(h)
		if h != "" {
			hosts = append(hosts, h)
		}
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"enabled": sec.EnableWalledGarden,
		"hosts":   hosts,
	})
}

func (h *Handler) GetPaymentGatewaySettings(w http.ResponseWriter, r *http.Request) {
	s, err := h.service.GetPaymentGatewaySettings(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, s)
}

func (h *Handler) UpdatePaymentGatewaySettings(w http.ResponseWriter, r *http.Request) {
	var req PaymentGatewaySettings
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	updated, err := h.service.UpdatePaymentGatewaySettings(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Pengaturan Payment Gateway & Routing berhasil disimpan",
		"data":    updated,
	})
}

func (h *Handler) GetDomainSettings(w http.ResponseWriter, r *http.Request) {
	s, err := h.service.GetDomainSettings(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, s)
}

func (h *Handler) UpdateDomainSettings(w http.ResponseWriter, r *http.Request) {
	var req DomainSettings
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	updated, err := h.service.UpdateDomainSettings(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Pengaturan Domain & Sub-Brand WiFi berhasil disimpan",
		"data":    updated,
	})
}

func (h *Handler) GetNotificationSettings(w http.ResponseWriter, r *http.Request) {
	s, err := h.service.GetNotificationSettings(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, s)
}

func (h *Handler) UpdateNotificationSettings(w http.ResponseWriter, r *http.Request) {
	var req NotificationSettings
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	updated, err := h.service.UpdateNotificationSettings(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Pengaturan Notifikasi & WhatsApp Gateway berhasil disimpan",
		"data":    updated,
	})
}

func (h *Handler) TestWhatsApp(w http.ResponseWriter, r *http.Request) {
	var req TestWhatsAppRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.TestWhatsApp(r.Context(), req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Pesan uji coba WhatsApp berhasil dikirim ke nomor tujuan",
	})
}



