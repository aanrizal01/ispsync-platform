package report

import (
	"log/slog"
	"net/http"
	"strconv"
	"time"

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
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)

		r.With(authMW.RequirePermission("reports:read")).Get("/financial", h.GetFinancialSummary)
		r.With(authMW.RequirePermission("reports:read")).Get("/plans", h.GetPlanRevenue)
		r.With(authMW.RequirePermission("reports:read")).Get("/trends", h.GetRevenueTrends)
		r.With(authMW.RequirePermission("reports:read")).Get("/traffic", h.GetTrafficStats)
		r.With(authMW.RequirePermission("reports:read")).Get("/bhp-uso", h.GetBHPUSOReport)
		r.With(authMW.RequirePermission("reports:read")).Get("/export-csv", h.ExportCSV)
		r.With(authMW.RequirePermission("reports:read")).Get("/export-voucher-tax-csv", h.ExportVoucherTaxCSV)
		r.With(authMW.RequirePermission("reports:read")).Get("/export-bhp-uso-csv", h.ExportBHPUSOCSV)
	})
}

func (h *Handler) GetFinancialSummary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.service.GetFinancialSummary(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, summary)
}

func (h *Handler) GetPlanRevenue(w http.ResponseWriter, r *http.Request) {
	plans, err := h.service.GetRevenueByPlan(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, plans)
}

func (h *Handler) GetRevenueTrends(w http.ResponseWriter, r *http.Request) {
	months := 6
	if mStr := r.URL.Query().Get("months"); mStr != "" {
		if m, err := strconv.Atoi(mStr); err == nil && m > 0 && m <= 24 {
			months = m
		}
	}

	trends, err := h.service.GetRevenueTrends(r.Context(), months)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, trends)
}

func (h *Handler) GetTrafficStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.service.GetTrafficStats(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, stats)
}

func (h *Handler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	csvData, err := h.service.ExportInvoicesCSV(r.Context(), from, to)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	fileName := "transaksi-billing-" + time.Now().Format("20060102") + ".csv"
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+fileName+"\"")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(csvData)
}

func (h *Handler) ExportVoucherTaxCSV(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	csvData, err := h.service.ExportVoucherTaxCSV(r.Context(), from, to)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	fileName := "laporan-pajak-voucher-pmk6-" + time.Now().Format("20060102") + ".csv"
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+fileName+"\"")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(csvData)
}

func (h *Handler) GetBHPUSOReport(w http.ResponseWriter, r *http.Request) {
	year := time.Now().Year()
	if yStr := r.URL.Query().Get("year"); yStr != "" {
		if y, err := strconv.Atoi(yStr); err == nil && y > 2000 && y < 2100 {
			year = y
		}
	}

	report, err := h.service.GetBHPUSOReport(r.Context(), year)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}
	middleware.JSON(w, http.StatusOK, report)
}

func (h *Handler) ExportBHPUSOCSV(w http.ResponseWriter, r *http.Request) {
	year := time.Now().Year()
	if yStr := r.URL.Query().Get("year"); yStr != "" {
		if y, err := strconv.Atoi(yStr); err == nil && y > 2000 && y < 2100 {
			year = y
		}
	}

	csvData, err := h.service.ExportBHPUSOCSV(r.Context(), year)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	fileName := "laporan-bhp-uso-kominfo-" + strconv.Itoa(year) + "-" + time.Now().Format("20060102") + ".csv"
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+fileName+"\"")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(csvData)
}

