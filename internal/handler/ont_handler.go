package handler

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"ispsync/internal/fibergrid"
	"ispsync/internal/middleware"

	"github.com/go-chi/chi/v5"
)

// randomPassword membuat kata sandi acak kuat (tanpa karakter yang mudah tertukar).
func randomPassword(n int) string {
	const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic("crypto/rand tidak tersedia: " + err.Error())
	}
	for i := range b {
		b[i] = alphabet[int(b[i])%len(alphabet)]
	}
	return string(b)
}

// subscriberSN mengambil SN ONT milik pelanggan pada tenant aktif (isolasi tenant lewat store).
func (h *APIHandler) subscriberSN(w http.ResponseWriter, r *http.Request) (string, bool) {
	t := middleware.GetTenant(r)
	sub, err := h.store.GetSubscriberByID(r.Context(), t.ID, chi.URLParam(r, "id"))
	if err != nil || sub == nil {
		h.failResponse(w, http.StatusNotFound, "Pelanggan tidak ditemukan")
		return "", false
	}
	if sub.SerialNumber == nil || strings.TrimSpace(*sub.SerialNumber) == "" {
		h.failResponse(w, http.StatusConflict, "Pelanggan belum punya ONT terpasang")
		return "", false
	}
	return strings.TrimSpace(*sub.SerialNumber), true
}

func (h *APIHandler) fgError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, fibergrid.ErrNotConfigured):
		h.failResponse(w, http.StatusServiceUnavailable, err.Error())
	case errors.Is(err, fibergrid.ErrNotFound):
		h.failResponse(w, http.StatusNotFound, err.Error())
	default:
		h.failResponse(w, http.StatusBadGateway, err.Error())
	}
}

// rawData menulis data FiberGrid apa adanya dalam envelope standar Nexus.
func (h *APIHandler) rawData(w http.ResponseWriter, msg string, data json.RawMessage) {
	var v interface{}
	if len(data) > 0 {
		_ = json.Unmarshal(data, &v)
	}
	h.successResponse(w, msg, v)
}

// SubscriberONT telemetri ONT pelanggan dari FiberGrid.
func (h *APIHandler) SubscriberONT(w http.ResponseWriter, r *http.Request) {
	sn, ok := h.subscriberSN(w, r)
	if !ok {
		return
	}
	ont, err := h.fg.LookupONT(r.Context(), sn)
	if err != nil {
		h.fgError(w, err)
		return
	}
	h.successResponse(w, "Telemetri ONT", ont)
}

// SubscriberONTReboot reboot modem pelanggan.
func (h *APIHandler) SubscriberONTReboot(w http.ResponseWriter, r *http.Request) {
	sn, ok := h.subscriberSN(w, r)
	if !ok {
		return
	}
	data, err := h.fg.Reboot(r.Context(), sn)
	if err != nil {
		h.fgError(w, err)
		return
	}
	h.rawData(w, "Perintah reboot dikirim", data)
}

// SubscriberONTWifi membaca konfigurasi Wi-Fi modem pelanggan.
func (h *APIHandler) SubscriberONTWifi(w http.ResponseWriter, r *http.Request) {
	sn, ok := h.subscriberSN(w, r)
	if !ok {
		return
	}
	data, err := h.fg.GetWifi(r.Context(), sn)
	if err != nil {
		h.fgError(w, err)
		return
	}
	h.rawData(w, "Konfigurasi Wi-Fi", data)
}

// SubscriberONTWifiUpdate mengubah SSID/password Wi-Fi (hanya field yang diizinkan diteruskan).
func (h *APIHandler) SubscriberONTWifiUpdate(w http.ResponseWriter, r *http.Request) {
	sn, ok := h.subscriberSN(w, r)
	if !ok {
		return
	}
	var in map[string]interface{}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&in); err != nil {
		h.failResponse(w, http.StatusBadRequest, "Format JSON tidak valid")
		return
	}
	out := map[string]interface{}{}
	for _, k := range []string{"ssid_2g", "password_2g", "enabled_2g", "ssid_5g", "password_5g", "enabled_5g"} {
		if v, ok := in[k]; ok {
			out[k] = v
		}
	}
	if len(out) == 0 {
		h.failResponse(w, http.StatusBadRequest, "Tidak ada field Wi-Fi yang valid")
		return
	}
	for _, k := range []string{"password_2g", "password_5g"} {
		if p, ok := out[k].(string); ok && p != "" && len(p) < 8 {
			h.failResponse(w, http.StatusBadRequest, "Password Wi-Fi minimal 8 karakter")
			return
		}
	}
	data, err := h.fg.UpdateWifi(r.Context(), sn, out)
	if err != nil {
		h.fgError(w, err)
		return
	}
	h.rawData(w, "Wi-Fi diperbarui", data)
}
