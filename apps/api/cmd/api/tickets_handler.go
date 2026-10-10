package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gigabill/isp/internal/auth"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/middleware"
)

type ApiTicket struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenant_id"`
	CustomerID  *string   `json:"customer_id,omitempty"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	Priority    string    `json:"priority"`
	Category    string    `json:"category"`
	AssigneeID  *string   `json:"assignee_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func handleListTickets(db *pgxpool.Pool, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slug := auth.ExtractTenantSlug(r)
		if slug == "" {
			slug = "dev"
		}
		rows, err := db.Query(r.Context(), `
			SELECT id, tenant_id, customer_id, title, COALESCE(description, ''), status, priority, COALESCE(category, 'Umum'), assignee_id, created_at, updated_at
			FROM tickets
			WHERE tenant_id = $1 OR tenant_id = '' OR $1 = 'superadmin'
			ORDER BY created_at DESC
		`, slug)
		if err != nil {
			middleware.JSONError(w, log, apperrors.Internal(err))
			return
		}
		defer rows.Close()

		tickets := make([]ApiTicket, 0)
		for rows.Next() {
			var t ApiTicket
			if err := rows.Scan(&t.ID, &t.TenantID, &t.CustomerID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.Category, &t.AssigneeID, &t.CreatedAt, &t.UpdatedAt); err != nil {
				middleware.JSONError(w, log, apperrors.Internal(err))
				return
			}
			tickets = append(tickets, t)
		}

		middleware.JSON(w, http.StatusOK, map[string]interface{}{
			"data": tickets,
		})
	}
}

func handleCreateTicket(db *pgxpool.Pool, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slug := auth.ExtractTenantSlug(r)
		if slug == "" {
			slug = "dev"
		}

		var req struct {
			CustomerID  *string `json:"customer_id"`
			Title       string  `json:"title"`
			Description string  `json:"description"`
			Status      string  `json:"status"`
			Priority    string  `json:"priority"`
			Category    string  `json:"category"`
			AssigneeID  *string `json:"assignee_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			middleware.JSONError(w, log, apperrors.BadRequest("Payload JSON tidak valid"))
			return
		}

		if strings.TrimSpace(req.Title) == "" {
			middleware.JSONError(w, log, apperrors.BadRequest("Subjek/judul tiket wajib diisi"))
			return
		}
		if req.Status == "" {
			req.Status = "OPEN"
		}
		if req.Priority == "" {
			req.Priority = "MEDIUM"
		}
		if req.Category == "" {
			req.Category = "Koneksi Internet"
		}

		if req.CustomerID != nil && strings.TrimSpace(*req.CustomerID) == "" {
			req.CustomerID = nil
		}
		if req.AssigneeID != nil && strings.TrimSpace(*req.AssigneeID) == "" {
			req.AssigneeID = nil
		}

		id := "TKT-" + strings.ToUpper(uuid.New().String()[:8])
		now := time.Now()

		_, err := db.Exec(r.Context(), `
			INSERT INTO tickets (id, tenant_id, customer_id, title, description, status, priority, category, assignee_id, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`, id, slug, req.CustomerID, req.Title, req.Description, req.Status, req.Priority, req.Category, req.AssigneeID, now, now)
		if err != nil {
			middleware.JSONError(w, log, apperrors.Internal(err))
			return
		}

		middleware.JSON(w, http.StatusCreated, map[string]interface{}{
			"message": "Tiket berhasil dibuat",
			"data": ApiTicket{
				ID:          id,
				TenantID:    slug,
				CustomerID:  req.CustomerID,
				Title:       req.Title,
				Description: req.Description,
				Status:      req.Status,
				Priority:    req.Priority,
				Category:    req.Category,
				AssigneeID:  req.AssigneeID,
				CreatedAt:   now,
				UpdatedAt:   now,
			},
		})
	}
}

func handleUpdateTicket(db *pgxpool.Pool, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slug := auth.ExtractTenantSlug(r)
		if slug == "" {
			slug = "dev"
		}
		id := chi.URLParam(r, "id")

		var req struct {
			Title       *string `json:"title"`
			Description *string `json:"description"`
			Status      *string `json:"status"`
			Priority    *string `json:"priority"`
			Category    *string `json:"category"`
			AssigneeID  *string `json:"assignee_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			middleware.JSONError(w, log, apperrors.BadRequest("Payload JSON tidak valid"))
			return
		}

		query := `
			UPDATE tickets SET
				title = COALESCE($1, title),
				description = COALESCE($2, description),
				status = COALESCE($3, status),
				priority = COALESCE($4, priority),
				category = COALESCE($5, category),
				assignee_id = COALESCE($6, assignee_id),
				updated_at = NOW()
			WHERE id = $7 AND (tenant_id = $8 OR tenant_id = '' OR $8 = 'superadmin')
		`
		_, err := db.Exec(r.Context(), query, req.Title, req.Description, req.Status, req.Priority, req.Category, req.AssigneeID, id, slug)
		if err != nil {
			middleware.JSONError(w, log, apperrors.Internal(err))
			return
		}

		middleware.JSON(w, http.StatusOK, map[string]interface{}{
			"message": "Tiket berhasil diupdate",
		})
	}
}
