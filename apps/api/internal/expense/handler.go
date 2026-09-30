package expense

import (
	"encoding/csv"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/auth"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
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
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		r.With(authMW.RequirePermission("billing:read")).Get("/expenses", h.ListExpenses)
		r.With(authMW.RequirePermission("billing:read")).Get("/expenses/summary", h.GetExpenseSummary)
		r.With(authMW.RequirePermission("billing:read")).Get("/expenses/export-csv", h.ExportCSV)
		r.With(authMW.RequirePermission("billing:write")).Post("/expenses", h.CreateExpense)
		r.With(authMW.RequirePermission("billing:read")).Get("/expenses/{id}", h.GetExpense)
		r.With(authMW.RequirePermission("billing:write")).Put("/expenses/{id}", h.UpdateExpense)
		r.With(authMW.RequirePermission("billing:write")).Delete("/expenses/{id}", h.DeleteExpense)
	})
}

func getUserIDFromContext(r *http.Request) *uuid.UUID {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		return nil
	}
	return &claims.UserID
}

func (h *Handler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	var input CreateExpenseInput
	if err := middleware.DecodeJSON(r, &input); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	recordedBy := getUserIDFromContext(r)
	exp, err := h.service.CreateExpense(r.Context(), input, recordedBy)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest(err.Error()))
		return
	}

	middleware.JSON(w, http.StatusCreated, exp)
}

func (h *Handler) GetExpense(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID pengeluaran tidak valid"))
		return
	}

	exp, err := h.service.GetExpenseByID(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.NotFound(err.Error()))
		return
	}

	middleware.JSON(w, http.StatusOK, exp)
}

func (h *Handler) UpdateExpense(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID pengeluaran tidak valid"))
		return
	}

	var input UpdateExpenseInput
	if err := middleware.DecodeJSON(r, &input); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	exp, err := h.service.UpdateExpense(r.Context(), id, input)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest(err.Error()))
		return
	}

	middleware.JSON(w, http.StatusOK, exp)
}

func (h *Handler) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("ID pengeluaran tidak valid"))
		return
	}

	if err := h.service.DeleteExpense(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest(err.Error()))
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]any{
		"message": "Data pengeluaran berhasil dihapus",
	})
}

func (h *Handler) ListExpenses(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit <= 0 {
		limit = 20
	}

	filter := ExpenseFilter{
		StartDate: q.Get("start_date"),
		EndDate:   q.Get("end_date"),
		Search:    q.Get("search"),
		Page:      page,
		Limit:     limit,
	}

	if cat := q.Get("category"); cat != "" {
		c := ExpenseCategory(cat)
		filter.Category = &c
	}

	if bhp := q.Get("is_bhp_deductible"); bhp != "" {
		val := bhp == "true" || bhp == "1"
		filter.IsBHPDeductible = &val
	}

	expenses, total, err := h.service.ListExpenses(r.Context(), filter)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	totalPages := (total + limit - 1) / limit
	if totalPages == 0 {
		totalPages = 1
	}

	middleware.JSON(w, http.StatusOK, map[string]any{
		"data": expenses,
		"meta": map[string]any{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

func (h *Handler) GetExpenseSummary(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	year, _ := strconv.Atoi(q.Get("year"))
	if year <= 0 {
		year = time.Now().Year()
	}
	month, _ := strconv.Atoi(q.Get("month"))
	if month <= 0 {
		month = int(time.Now().Month())
	}

	summary, err := h.service.GetExpenseSummary(r.Context(), year, month)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, summary)
}

func (h *Handler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := ExpenseFilter{
		StartDate: q.Get("start_date"),
		EndDate:   q.Get("end_date"),
		Search:    q.Get("search"),
		Page:      1,
		Limit:     10000,
	}

	if cat := q.Get("category"); cat != "" {
		c := ExpenseCategory(cat)
		filter.Category = &c
	}
	if bhp := q.Get("is_bhp_deductible"); bhp != "" {
		val := bhp == "true" || bhp == "1"
		filter.IsBHPDeductible = &val
	}

	expenses, _, err := h.service.ListExpenses(r.Context(), filter)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=gogigabill-pengeluaran-%s.csv", time.Now().Format("20060102-150405")))

	// Write UTF-8 BOM
	_, _ = w.Write([]byte("\xEF\xBB\xBF"))

	cw := csv.NewWriter(w)
	defer cw.Flush()

	header := []string{
		"No",
		"No Transaksi",
		"Tanggal",
		"Kategori",
		"Keterangan / Keperluan",
		"Nominal (Rp)",
		"Vendor / Penerima",
		"Metode Bayar",
		"Akun Sumber Dana",
		"No Referensi",
		"Pengurang Sah BHP/USO",
		"Dicatat Oleh",
		"Catatan",
	}
	_ = cw.Write(header)

	for i, e := range expenses {
		vendor := ""
		if e.VendorName != nil {
			vendor = *e.VendorName
		}
		bankAcc := ""
		if e.BankAccount != nil {
			bankAcc = *e.BankAccount
		}
		refNo := ""
		if e.ReferenceNumber != nil {
			refNo = *e.ReferenceNumber
		}
		notes := ""
		if e.Notes != nil {
			notes = *e.Notes
		}
		recorder := ""
		if e.RecordedByName != nil {
			recorder = *e.RecordedByName
		}
		bhpStr := "Tidak"
		if e.IsBHPDeductible {
			bhpStr = "Ya (Pengurang Sah PP 43/2023)"
		}

		row := []string{
			strconv.Itoa(i + 1),
			e.ExpenseNumber,
			e.ExpenseDate,
			string(e.Category),
			e.Title,
			strconv.FormatInt(e.Amount, 10),
			vendor,
			string(e.PaymentMethod),
			bankAcc,
			refNo,
			bhpStr,
			recorder,
			notes,
		}
		_ = cw.Write(row)
	}
}
