package handler

import (
	"encoding/xml"
	"io"
	"net/http"
	"strconv"
	"strings"

	"ispsync/internal/domain"
	"ispsync/internal/middleware"
)

const (
	kmlMaxBytes      = 5 << 20
	kmlMaxPlacemarks = 5000
)

type kmlPlacemark struct {
	Name   string
	Coords string
}

// parseKMLPlacemarks mengambil Placemark bertipe Point dari KML (Folder bersarang didukung).
func parseKMLPlacemarks(r io.Reader) ([]kmlPlacemark, error) {
	dec := xml.NewDecoder(r)
	dec.Strict = false
	var out []kmlPlacemark
	var cur *kmlPlacemark
	var inPoint bool
	for {
		tok, err := dec.Token()
		if err == io.EOF {
			return out, nil
		}
		if err != nil {
			return nil, err
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "Placemark":
				cur = &kmlPlacemark{}
			case "Point":
				inPoint = cur != nil
			case "name":
				if cur != nil && cur.Name == "" && !inPoint {
					var s string
					if err := dec.DecodeElement(&s, &t); err == nil {
						cur.Name = strings.TrimSpace(s)
					}
				}
			case "coordinates":
				if cur != nil && inPoint {
					var s string
					if err := dec.DecodeElement(&s, &t); err == nil {
						cur.Coords = strings.TrimSpace(s)
					}
				}
			}
		case xml.EndElement:
			switch t.Name.Local {
			case "Point":
				inPoint = false
			case "Placemark":
				if cur != nil {
					out = append(out, *cur)
					if len(out) > kmlMaxPlacemarks {
						return nil, io.ErrShortBuffer
					}
				}
				cur = nil
			}
		}
	}
}

// UploadJartaplokKML mengimpor titik ODP dari file KML ke tenant aktif (OWNER/NOC).
func (h *APIHandler) UploadJartaplokKML(w http.ResponseWriter, r *http.Request) {
	t := middleware.GetTenant(r)
	r.Body = http.MaxBytesReader(w, r.Body, kmlMaxBytes+1024)
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		h.failResponse(w, http.StatusBadRequest, "Berkas tidak valid atau lebih dari 5 MB")
		return
	}
	f, _, err := r.FormFile("file")
	if err != nil {
		h.failResponse(w, http.StatusBadRequest, "Berkas KML wajib diunggah (field 'file')")
		return
	}
	defer f.Close()

	marks, err := parseKMLPlacemarks(io.LimitReader(f, kmlMaxBytes))
	if err != nil {
		h.failResponse(w, http.StatusBadRequest, "Format KML tidak valid atau terlalu banyak titik (maks "+strconv.Itoa(kmlMaxPlacemarks)+")")
		return
	}

	existing := map[string]domain.ODP{}
	if list, err := h.store.ListODPs(r.Context(), t.ID); err == nil {
		for _, o := range list {
			if o.TenantID == t.ID {
				existing[strings.ToUpper(o.Code)] = o
			}
		}
	}

	var inserted, updated, skipped int
	for _, m := range marks {
		code := strings.ToUpper(strings.TrimSpace(m.Name))
		parts := strings.Split(strings.TrimSpace(m.Coords), ",")
		if code == "" || len(code) > 64 || len(parts) < 2 {
			skipped++
			continue
		}
		lon, e1 := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
		lat, e2 := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
		if e1 != nil || e2 != nil || lat < -90 || lat > 90 || lon < -180 || lon > 180 {
			skipped++
			continue
		}
		odp := &domain.ODP{TenantID: t.ID, Code: code, Name: m.Name, Latitude: lat, Longitude: lon, TotalPorts: 8, Status: "ACTIVE"}
		if ex, ok := existing[code]; ok {
			// Pertahankan kapasitas, pemakaian, dan status yang sudah ada.
			odp.TotalPorts, odp.UsedPorts, odp.Status = ex.TotalPorts, ex.UsedPorts, ex.Status
			updated++
		} else {
			inserted++
		}
		if err := h.store.UpsertODP(r.Context(), odp); err != nil {
			h.failResponse(w, http.StatusInternalServerError, "Gagal menyimpan ODP "+code+": "+err.Error())
			return
		}
	}
	h.successResponse(w, "KML disinkronkan", map[string]int{
		"total_placemarks": len(marks), "inserted": inserted, "updated": updated, "skipped": skipped,
	})
}
