package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"ispsync/internal/middleware"
	"ispsync/internal/repository"

	"github.com/go-chi/chi/v5"
)

func (h *APIHandler) jartaplokErr(w http.ResponseWriter, err error) {
	if errors.Is(err, repository.ErrJartaplokInvalid) {
		h.failResponse(w, http.StatusBadRequest, err.Error())
		return
	}
	h.failResponse(w, http.StatusInternalServerError, "Gagal memproses perjanjian: "+err.Error())
}

// CreateJartaplokAgreement pemilik infrastruktur membuat kontrak sewa ke ISP lain (OWNER).
func (h *APIHandler) CreateJartaplokAgreement(w http.ResponseWriter, r *http.Request) {
	t := middleware.GetTenant(r)
	if !h.tenantCaps(r).OwnInfrastructure {
		h.failResponse(w, http.StatusForbidden, "Tenant Anda tidak memiliki infrastruktur sendiri untuk disewakan.")
		return
	}
	var req struct {
		ClientSlug string  `json:"client_slug"`
		ScopeArea  string  `json:"scope_area"`
		Rate       float64 `json:"rate_per_port"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		h.failResponse(w, http.StatusBadRequest, "Body tidak valid")
		return
	}
	ag, err := h.store.CreateJartaplokAgreement(r.Context(), t.ID, req.ClientSlug, req.ScopeArea, req.Rate)
	if err != nil {
		h.jartaplokErr(w, err)
		return
	}
	h.successResponse(w, "Perjanjian dibuat", ag)
}

// LeaseJartaplokODP menyewakan port sebuah ODP ke perjanjian (OWNER pemilik).
func (h *APIHandler) LeaseJartaplokODP(w http.ResponseWriter, r *http.Request) {
	t := middleware.GetTenant(r)
	var req struct {
		ODPCode string `json:"odp_code"`
		Ports   int    `json:"ports"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		h.failResponse(w, http.StatusBadRequest, "Body tidak valid")
		return
	}
	if err := h.store.AddSharedODP(r.Context(), t.ID, chi.URLParam(r, "id"), req.ODPCode, req.Ports); err != nil {
		h.jartaplokErr(w, err)
		return
	}
	h.successResponse(w, "ODP disewakan", nil)
}

// SetJartaplokAgreementStatus mengubah status perjanjian (OWNER pemilik).
func (h *APIHandler) SetJartaplokAgreementStatus(w http.ResponseWriter, r *http.Request) {
	t := middleware.GetTenant(r)
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&req); err != nil {
		h.failResponse(w, http.StatusBadRequest, "Body tidak valid")
		return
	}
	if err := h.store.SetJartaplokAgreementStatus(r.Context(), t.ID, chi.URLParam(r, "id"), req.Status); err != nil {
		h.jartaplokErr(w, err)
		return
	}
	h.successResponse(w, "Status perjanjian diperbarui", nil)
}
