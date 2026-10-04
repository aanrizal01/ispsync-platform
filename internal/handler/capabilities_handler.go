package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"ispsync/internal/domain"
	"ispsync/internal/middleware"

	"github.com/go-chi/chi/v5"
)

// tenantCaps membaca flag kemampuan tenant aktif (default: semua false).
func (h *APIHandler) tenantCaps(r *http.Request) domain.TenantCapabilities {
	t := middleware.GetTenant(r)
	caps, err := h.store.GetTenantCapabilities(r.Context(), t.ID)
	if err != nil {
		return domain.TenantCapabilities{TenantID: t.ID}
	}
	return caps
}

// requireFiberGrid memastikan tenant berhak memakai FiberGrid.
func (h *APIHandler) requireFiberGrid(w http.ResponseWriter, r *http.Request) bool {
	if !h.tenantCaps(r).UsesFiberGrid {
		h.failResponse(w, http.StatusForbidden, "Fitur ini memerlukan FiberGrid. Tenant Anda belum mengaktifkan FiberGrid; hubungi pengelola platform.")
		return false
	}
	return true
}

// GetCapabilities flag kemampuan tenant aktif (untuk UI).
func (h *APIHandler) GetCapabilities(w http.ResponseWriter, r *http.Request) {
	h.successResponse(w, "Kemampuan tenant", h.tenantCaps(r))
}

// SuperuserSetCapabilities mengatur flag kemampuan tenant lain (khusus pemilik platform).
func (h *APIHandler) SuperuserSetCapabilities(w http.ResponseWriter, r *http.Request) {
	slug := strings.ToLower(strings.TrimSpace(chi.URLParam(r, "slug")))
	tn, err := h.store.GetTenantBySlug(r.Context(), slug)
	if err != nil || tn == nil {
		h.failResponse(w, http.StatusNotFound, "Tenant tidak ditemukan")
		return
	}
	var req struct {
		UsesFiberGrid     *bool `json:"uses_fibergrid"`
		OwnInfrastructure *bool `json:"own_infrastructure"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		h.failResponse(w, http.StatusBadRequest, "Body tidak valid")
		return
	}
	caps, _ := h.store.GetTenantCapabilities(r.Context(), tn.ID)
	caps.TenantID = tn.ID
	if req.UsesFiberGrid != nil {
		caps.UsesFiberGrid = *req.UsesFiberGrid
	}
	if req.OwnInfrastructure != nil {
		caps.OwnInfrastructure = *req.OwnInfrastructure
	}
	if err := h.store.SetTenantCapabilities(r.Context(), caps); err != nil {
		h.failResponse(w, http.StatusInternalServerError, "Gagal menyimpan: "+err.Error())
		return
	}
	h.successResponse(w, "Kemampuan tenant diperbarui", caps)
}

// tenantCapsFor untuk GetContext (publik): tenant tanpa konteks mengembalikan nol.
func (h *APIHandler) tenantCapsFor(r *http.Request) domain.TenantCapabilities {
	if middleware.GetTenantContext(r) == nil {
		return domain.TenantCapabilities{}
	}
	return h.tenantCaps(r)
}
