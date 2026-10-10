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

type ApiTicketMessage struct {
	ID            string    `json:"id"`
	TicketID      string    `json:"ticket_id"`
	SenderType    string    `json:"sender_type"` // 'STAFF' or 'CUSTOMER'
	SenderID      *string   `json:"sender_id,omitempty"`
	SenderName    string    `json:"sender_name"`
	Message       string    `json:"message"`
	AttachmentURL *string   `json:"attachment_url,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

func handleListTicketMessages(db *pgxpool.Pool, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ticketID := chi.URLParam(r, "id")
		if ticketID == "" {
			middleware.JSONError(w, log, apperrors.BadRequest("ID tiket wajib disertakan"))
			return
		}

		rows, err := db.Query(r.Context(), `
			SELECT id, ticket_id, sender_type, sender_id, sender_name, message, attachment_url, created_at
			FROM ticket_messages
			WHERE ticket_id = $1
			ORDER BY created_at ASC
		`, ticketID)
		if err != nil {
			middleware.JSONError(w, log, apperrors.Internal(err))
			return
		}
		defer rows.Close()

		messages := make([]ApiTicketMessage, 0)
		for rows.Next() {
			var m ApiTicketMessage
			if err := rows.Scan(&m.ID, &m.TicketID, &m.SenderType, &m.SenderID, &m.SenderName, &m.Message, &m.AttachmentURL, &m.CreatedAt); err != nil {
				middleware.JSONError(w, log, apperrors.Internal(err))
				return
			}
			messages = append(messages, m)
		}

		middleware.JSON(w, http.StatusOK, map[string]interface{}{
			"data": messages,
		})
	}
}

func handleCreateTicketMessage(db *pgxpool.Pool, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ticketID := chi.URLParam(r, "id")
		if ticketID == "" {
			middleware.JSONError(w, log, apperrors.BadRequest("ID tiket wajib disertakan"))
			return
		}

		var req struct {
			SenderType    string  `json:"sender_type"`
			SenderID      *string `json:"sender_id"`
			SenderName    string  `json:"sender_name"`
			Message       string  `json:"message"`
			AttachmentURL *string `json:"attachment_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			middleware.JSONError(w, log, apperrors.BadRequest("Payload JSON tidak valid"))
			return
		}

		if strings.TrimSpace(req.Message) == "" {
			middleware.JSONError(w, log, apperrors.BadRequest("Pesan tidak boleh kosong"))
			return
		}

		if req.SenderType == "" {
			req.SenderType = "STAFF"
		}
		if req.SenderName == "" {
			if req.SenderType == "CUSTOMER" {
				req.SenderName = "Pelanggan"
			} else {
				req.SenderName = "Tim Dukungan Teknis"
			}
		}

		// Ensure ticket exists
		var currentTicketID string
		err := db.QueryRow(r.Context(), `SELECT id FROM tickets WHERE id = $1`, ticketID).Scan(&currentTicketID)
		if err != nil {
			middleware.JSONError(w, log, apperrors.NotFound("Tiket tidak ditemukan"))
			return
		}

		msgID := "MSG-" + strings.ToUpper(uuid.New().String()[:8])
		now := time.Now()

		_, err = db.Exec(r.Context(), `
			INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, message, attachment_url, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, msgID, ticketID, req.SenderType, req.SenderID, req.SenderName, req.Message, req.AttachmentURL, now)
		if err != nil {
			middleware.JSONError(w, log, apperrors.Internal(err))
			return
		}

		// Update ticket updated_at
		_, _ = db.Exec(r.Context(), `UPDATE tickets SET updated_at = NOW() WHERE id = $1`, ticketID)

		middleware.JSON(w, http.StatusCreated, map[string]interface{}{
			"message": "Pesan berhasil dikirim",
			"data": ApiTicketMessage{
				ID:            msgID,
				TicketID:      ticketID,
				SenderType:    req.SenderType,
				SenderID:      req.SenderID,
				SenderName:    req.SenderName,
				Message:       req.Message,
				AttachmentURL: req.AttachmentURL,
				CreatedAt:     now,
			},
		})
	}
}

func handleGetPublicTicket(db *pgxpool.Pool, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		var t ApiTicket
		var custName *string
		var custPhone *string
		err := db.QueryRow(r.Context(), `
			SELECT t.id, t.tenant_id, t.customer_id, t.title, COALESCE(t.description, ''), t.status, t.priority, COALESCE(t.category, 'Umum'), t.assignee_id, t.created_at, t.updated_at,
			       c.full_name, c.phone
			FROM tickets t
			LEFT JOIN customers c ON c.id = t.customer_id
			WHERE t.id = $1
		`, id).Scan(&t.ID, &t.TenantID, &t.CustomerID, &t.Title, &t.Description, &t.Status, &t.Priority, &t.Category, &t.AssigneeID, &t.CreatedAt, &t.UpdatedAt, &custName, &custPhone)
		if err != nil {
			middleware.JSONError(w, log, apperrors.NotFound("Tiket tidak ditemukan"))
			return
		}

		rows, err := db.Query(r.Context(), `
			SELECT id, ticket_id, sender_type, sender_id, sender_name, message, attachment_url, created_at
			FROM ticket_messages
			WHERE ticket_id = $1
			ORDER BY created_at ASC
		`, id)
		if err != nil {
			middleware.JSONError(w, log, apperrors.Internal(err))
			return
		}
		defer rows.Close()

		messages := make([]ApiTicketMessage, 0)
		for rows.Next() {
			var m ApiTicketMessage
			if err := rows.Scan(&m.ID, &m.TicketID, &m.SenderType, &m.SenderID, &m.SenderName, &m.Message, &m.AttachmentURL, &m.CreatedAt); err == nil {
				messages = append(messages, m)
			}
		}

		cName := "Pelanggan Umum"
		if custName != nil && *custName != "" {
			cName = *custName
		}

		middleware.JSON(w, http.StatusOK, map[string]interface{}{
			"data": map[string]interface{}{
				"ticket":         t,
				"customer_name":  cName,
				"customer_phone": custPhone,
				"messages":       messages,
			},
		})
	}
}

