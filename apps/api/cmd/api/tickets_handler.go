package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
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

		// Ensure ticket exists and check status
		var currentTicketID string
		var currentStatus string
		err := db.QueryRow(r.Context(), `SELECT id, status FROM tickets WHERE id = $1`, ticketID).Scan(&currentTicketID, &currentStatus)
		if err != nil {
			middleware.JSONError(w, log, apperrors.NotFound("Tiket tidak ditemukan"))
			return
		}

		if req.SenderType == "CUSTOMER" && (strings.ToUpper(currentStatus) == "CLOSED" || strings.ToUpper(currentStatus) == "RESOLVED") {
			middleware.JSONError(w, log, apperrors.BadRequest("Tiket ini telah ditutup atau selesai ditangani. Percakapan baru tidak dapat dikirim."))
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

		var botReply *ApiTicketMessage
		if req.SenderType == "CUSTOMER" {
			botReply = generateBotReply(r.Context(), db, ticketID, req.Message)
		}

		resp := map[string]interface{}{
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
		}
		if botReply != nil {
			resp["bot_reply"] = botReply
		}

		middleware.JSON(w, http.StatusCreated, resp)
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
			LEFT JOIN customers c ON c.id::text = t.customer_id
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

		// Initial greeting from Virtual Assistant if ticket has 0 messages
		if len(messages) == 0 {
			botName := "Asisten Virtual " + strings.ToUpper(t.TenantID)
			if t.TenantID == "dev" {
				botName = "Asisten Virtual DEV LAB"
			}
			welcomeMsg := fmt.Sprintf(
				"Halo Kak %s! 👋 Selamat datang di Layanan Dukungan Pelanggan Resmi.\n\n"+
				"Laporan gangguan Anda terkait **%s** telah tersimpan dengan nomor tiket **#%s** (Prioritas: %s).\n\n"+
				"Sembari tim teknis kami memeriksa konfigurasi jalur, Anda dapat memilih tombol bantuan cepat di bawah untuk melakukan diagnosa koneksi secara mandiri.",
				cName, t.Title, t.ID, t.Priority,
			)
			botMsgID := "MSG-BOT-" + strings.ToUpper(uuid.New().String()[:8])
			botNow := time.Now()
			_, _ = db.Exec(r.Context(), `
				INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, message, attachment_url, created_at)
				VALUES ($1, $2, 'BOT', NULL, $3, $4, NULL, $5)
			`, botMsgID, t.ID, botName, welcomeMsg, botNow)

			messages = append(messages, ApiTicketMessage{
				ID:         botMsgID,
				TicketID:   t.ID,
				SenderType: "BOT",
				SenderName: botName,
				Message:    welcomeMsg,
				CreatedAt:  botNow,
			})
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

func formatRupiah(amount int64) string {
	str := strconv.FormatInt(amount, 10)
	var result []byte
	l := len(str)
	for i, c := range str {
		if i > 0 && (l-i)%3 == 0 {
			result = append(result, '.')
		}
		result = append(result, byte(c))
	}
	return string(result)
}

func generateBotReply(ctx context.Context, db *pgxpool.Pool, ticketID string, customerMsg string) *ApiTicketMessage {
	var customerID *string
	var tenantID string
	var ticketTitle string
	var custName string
	var custPhone string
	err := db.QueryRow(ctx, `
		SELECT t.customer_id, COALESCE(t.tenant_id, 'dev'), t.title, COALESCE(c.full_name, 'Pelanggan'), COALESCE(c.phone, '')
		FROM tickets t
		LEFT JOIN customers c ON c.id::text = t.customer_id
		WHERE t.id = $1
	`, ticketID).Scan(&customerID, &tenantID, &ticketTitle, &custName, &custPhone)
	if err != nil {
		return nil
	}

	botName := "Asisten Virtual " + strings.ToUpper(tenantID)
	if tenantID == "dev" {
		botName = "Asisten Virtual DEV LAB"
	}

	msgLower := strings.ToLower(strings.TrimSpace(customerMsg))
	var botReplyText string

	if strings.Contains(msgLower, "koneksi") || strings.Contains(msgLower, "sinyal") || strings.Contains(msgLower, "lambat") || 
	   strings.Contains(msgLower, "lemot") || strings.Contains(msgLower, "los") || strings.Contains(msgLower, "merah") || 
	   strings.Contains(msgLower, "status koneksi") || strings.Contains(msgLower, "putus") {
		var planName, subStatus string
		if customerID != nil {
			_ = db.QueryRow(ctx, `
				SELECT p.name, s.status
				FROM subscriptions s
				JOIN plans p ON p.id = s.plan_id
				WHERE s.customer_id::text = $1
				ORDER BY s.created_at DESC LIMIT 1
			`, *customerID).Scan(&planName, &subStatus)
		}

		if planName == "" {
			planName = "Paket Internet Dedicated"
			subStatus = "ACTIVE"
		}

		botReplyText = fmt.Sprintf(
			"Halo Kak %s! 🤖\n\n"+
			"📊 **Hasil Diagnosa Cepat Sistem Jaringan:**\n"+
			"• Paket Langganan: **%s**\n"+
			"• Status Layanan: **%s**\n\n"+
			"🔍 **Pengecekan Fisik Mandiri:**\n"+
			"1. Periksa lampu indikator **LOS** di modem (harus padam/mati, tidak boleh merah menyala).\n"+
			"2. Lampu **PON** harus menyala hijau stabil tanpa kedip cepat.\n"+
			"3. Pastikan kabel optik patchcord kuning tidak terjepit atau tertekuk tajam.\n\n"+
			"💡 Jika lampu indikator tidak normal, Anda dapat mencoba menu **'Restart Modem'** atau ketik **'Bantuan Teknisi'** untuk eskalasi kunjungan.",
			custName, planName, subStatus,
		)

	} else if strings.Contains(msgLower, "tagihan") || strings.Contains(msgLower, "billing") || strings.Contains(msgLower, "bayar") || 
			   strings.Contains(msgLower, "lunas") || strings.Contains(msgLower, "invoice") {
		var invNumber string
		var amountDue int64
		var dueDate time.Time
		hasUnpaid := false

		if customerID != nil {
			err := db.QueryRow(ctx, `
				SELECT invoice_number, amount_due, due_date
				FROM invoices
				WHERE customer_id::text = $1 AND status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
				ORDER BY due_date ASC LIMIT 1
			`, *customerID).Scan(&invNumber, &amountDue, &dueDate)
			if err == nil {
				hasUnpaid = true
			}
		}

		if hasUnpaid {
			botReplyText = fmt.Sprintf(
				"Halo Kak %s! 💳\n\n"+
				"Sistem mendeteksi tagihan langganan yang belum diselesaikan:\n"+
				"• No. Invoice: **%s**\n"+
				"• Total Tagihan: **Rp %s**\n"+
				"• Jatuh Tempo: **%s**\n\n"+
				"⚠️ Apabila layanan Anda saat ini terisolir, silakan lakukan pembayaran melalui menu billing atau hubungi tim administrasi kami agar koneksi langsung dibuka otomatis.",
				custName, invNumber, formatRupiah(amountDue), dueDate.Format("02 Jan 2006"),
			)
		} else {
			botReplyText = fmt.Sprintf(
				"Halo Kak %s! 💳\n\n"+
				"✅ **Semua tagihan Anda berstatus LUNAS.**\n"+
				"Tidak ada tagihan tertunggak pada akun Anda. Kendala koneksi yang Anda laporkan murni gangguan teknis dan bukan karena penonaktifan administratif.",
				custName,
			)
		}

	} else if strings.Contains(msgLower, "restart") || strings.Contains(msgLower, "reboot") || strings.Contains(msgLower, "matikan") {
		botReplyText = fmt.Sprintf(
			"Halo Kak %s! 🔄\n\n"+
			"Berikut langkah **Restart Modem ONT** yang aman:\n"+
			"1. Cabut jack adaptor daya di bagian belakang modem (atau matikan tombol power).\n"+
			"2. Diamkan modem selama **15-20 detik** agar memori internal modem ter-reset bersih.\n"+
			"3. Colokkan kembali adaptor dan tunggu **2-3 menit** hingga lampu PON & Internet menyala hijau stabil.\n\n"+
			"Jika internet sudah normal kembali atau butuh bantuan lebih lanjut, beri tahu kami di sini ya!",
			custName,
		)

	} else if strings.Contains(msgLower, "teknisi") || strings.Contains(msgLower, "eskalasi") || strings.Contains(msgLower, "lapangan") || 
			   strings.Contains(msgLower, "staf") || strings.Contains(msgLower, "manusia") || strings.Contains(msgLower, "operator") || strings.Contains(msgLower, "cs") {
		_, _ = db.Exec(ctx, `UPDATE tickets SET priority = 'HIGH', status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1`, ticketID)

		botReplyText = fmt.Sprintf(
			"Halo Kak %s! 👨‍🔧\n\n"+
			"Laporan tiket Anda telah berhasil **DIESKALASI KE TIM TEKNISI LAPANGAN** dengan prioritas tinggi (HIGH).\n\n"+
			"• ID Tiket: **%s**\n"+
			"• Nomor Kontak: **%s**\n\n"+
			"Staf teknis kami saat ini sedang meninjau jalur transmisi kabel optik dan konfigurasi port ODP terkait. Petugas kami akan menghubungi nomor terdaftar Anda jika diperlukan kunjungan langsung ke lokasi. Mohon menunggu kabar selanjutnya ya! 🙏",
			custName, ticketID, custPhone,
		)

	} else if strings.Contains(msgLower, "halo") || strings.Contains(msgLower, "hai") || strings.Contains(msgLower, "pagi") || 
			   strings.Contains(msgLower, "siang") || strings.Contains(msgLower, "sore") || strings.Contains(msgLower, "malam") || 
			   strings.Contains(msgLower, "assalamualaikum") || strings.Contains(msgLower, "test") {
		botReplyText = fmt.Sprintf(
			"Halo Kak %s! 👋\n\n"+
			"Saya asisten virtual resmi %s. Saya siap membantu Anda melakukan pemeriksaan koneksi secara cepat 24 jam.\n\n"+
			"Silakan klik salah satu opsi bantuan cepat di bawah atau ketik langsung kebutuhan Anda:\n"+
			"• Ketik **'Cek Koneksi'** untuk cek status paket & indikator modem\n"+
			"• Ketik **'Cek Tagihan'** untuk cek status pembayaran invoice\n"+
			"• Ketik **'Restart Modem'** untuk panduan reboot mandiri\n"+
			"• Ketik **'Bantuan Teknisi'** untuk eskalasi kunjungan lapangan",
			custName, strings.ToUpper(tenantID),
		)

	} else {
		botReplyText = fmt.Sprintf(
			"Terima kasih atas pesannya Kak %s! 🤖\n\n"+
			"Pesan Anda telah kami catat pada riwayat tiket ini. Sembari menunggu staf helpdesk kami menanggapi, Anda dapat memanfaatkan fitur pengecekan mandiri:\n\n"+
			"• **Cek Koneksi** — Diagnosa paket & sinyal modem\n"+
			"• **Cek Tagihan** — Cek status pembayaran langganan\n"+
			"• **Restart Modem** — Panduan menyegarkan koneksi\n"+
			"• **Bantuan Teknisi** — Eskalasi prioritas ke teknisi lapangan",
			custName,
		)
	}

	botMsgID := "MSG-BOT-" + strings.ToUpper(uuid.New().String()[:8])
	botNow := time.Now()

	_, err = db.Exec(ctx, `
		INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, message, attachment_url, created_at)
		VALUES ($1, $2, 'BOT', NULL, $3, $4, NULL, $5)
	`, botMsgID, ticketID, botName, botReplyText, botNow)
	if err != nil {
		return nil
	}

	return &ApiTicketMessage{
		ID:         botMsgID,
		TicketID:   ticketID,
		SenderType: "BOT",
		SenderName: botName,
		Message:    botReplyText,
		CreatedAt:  botNow,
	}
}

