package voucher

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/pagination"
	"github.com/gigabill/isp/pkg/crypto"
	"github.com/gigabill/isp/pkg/money"
)

type WhatsAppSender interface {
	Send(ctx context.Context, recipient string, subject string, body string) error
}

type RadiusSynchronizer interface {
	DeleteCredential(ctx context.Context, username string) error
	DisconnectUserSessions(ctx context.Context, username string) error
	SyncCredential(ctx context.Context, username, password, groupname string) error
}

type Service struct {
	repo      *Repository
	logger    *slog.Logger
	waSender  WhatsAppSender
	radiusSvc RadiusSynchronizer
}

func NewService(repo *Repository, logger *slog.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

func (s *Service) SetWhatsAppSender(sender WhatsAppSender) {
	s.waSender = sender
}

func (s *Service) SetRadiusService(radiusSvc RadiusSynchronizer) {
	s.radiusSvc = radiusSvc
}

func (s *Service) CreateTemplate(ctx context.Context, req CreateTemplateRequest) (*Template, error) {
	now := time.Now()
	isAvailableOnline := false
	if req.IsAvailableOnline != nil {
		isAvailableOnline = *req.IsAvailableOnline
	}

	t := &Template{
		ID:                uuid.New(),
		Name:              req.Name,
		Description:       req.Description,
		Price:             money.Amount(req.Price),
		Currency:          "IDR",
		DurationMinutes:   req.DurationMinutes,
		DataLimitBytes:    req.DataLimitBytes,
		DownloadKbps:      req.DownloadKbps,
		UploadKbps:        req.UploadKbps,
		MinDownloadKbps:   req.MinDownloadKbps,
		MinUploadKbps:     req.MinUploadKbps,
		ValidityDays:      req.ValidityDays,
		IsActive:          true,
		IsAvailableOnline: isAvailableOnline,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := s.repo.CreateTemplate(ctx, t); err != nil {
		s.logger.Error("failed to create voucher template", "error", err)
		return nil, apperrors.Internal(err)
	}

	return t, nil
}

func (s *Service) ListTemplates(ctx context.Context) ([]Template, error) {
	return s.repo.ListTemplates(ctx)
}

func (s *Service) UpdateTemplate(ctx context.Context, id uuid.UUID, req UpdateTemplateRequest) (*Template, error) {
	t, err := s.repo.GetTemplateByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if t == nil {
		return nil, apperrors.NotFound("Template voucher")
	}

	t.Name = req.Name
	t.Description = req.Description
	t.Price = money.Amount(req.Price)
	t.DurationMinutes = req.DurationMinutes
	t.DataLimitBytes = req.DataLimitBytes
	t.DownloadKbps = req.DownloadKbps
	t.UploadKbps = req.UploadKbps
	t.MinDownloadKbps = req.MinDownloadKbps
	t.MinUploadKbps = req.MinUploadKbps
	t.ValidityDays = req.ValidityDays
	if req.IsActive != nil {
		t.IsActive = *req.IsActive
	}
	if req.IsAvailableOnline != nil {
		t.IsAvailableOnline = *req.IsAvailableOnline
	}
	t.UpdatedAt = time.Now()

	if err := s.repo.UpdateTemplate(ctx, t); err != nil {
		s.logger.Error("failed to update voucher template", "error", err, "template_id", id)
		return nil, apperrors.Internal(err)
	}

	return t, nil
}

func (s *Service) DeleteTemplate(ctx context.Context, id uuid.UUID) error {
	t, err := s.repo.GetTemplateByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if t == nil {
		return apperrors.NotFound("Template voucher")
	}

	if err := s.repo.DeleteTemplate(ctx, id); err != nil {
		s.logger.Error("failed to delete voucher template", "error", err, "template_id", id)
		return apperrors.Internal(err)
	}

	return nil
}

func (s *Service) GenerateBatch(ctx context.Context, req GenerateBatchRequest, createdBy *uuid.UUID) (*Batch, []Voucher, error) {
	tpl, err := s.repo.GetTemplateByID(ctx, req.TemplateID)
	if err != nil {
		return nil, nil, apperrors.Internal(err)
	}
	if tpl == nil {
		return nil, nil, apperrors.NotFound("Voucher Template")
	}
	if !tpl.IsActive {
		return nil, nil, apperrors.BadRequest("Template voucher ini tidak aktif")
	}

	batchNum, err := s.repo.GenerateBatchNumber(ctx)
	if err != nil {
		return nil, nil, apperrors.Internal(err)
	}

	now := time.Now()
	isMACLocked := true
	if req.IsMACLocked != nil {
		isMACLocked = *req.IsMACLocked
	}
	batch := &Batch{
		ID:           uuid.New(),
		BatchNumber:  batchNum,
		TemplateID:   &req.TemplateID,
		TemplateName: &tpl.Name,
		Quantity:     req.Quantity,
		IsMACLocked:  isMACLocked,
		Notes:        req.Notes,
		CreatedBy:    createdBy,
		CreatedAt:    now,
	}

	// Masa aktif semua voucher sejak pertama kali dikeluarkan adalah 1 tahun
	batchExpiry := now.AddDate(1, 0, 0)
	timeLimitSec := int64(tpl.DurationMinutes) * 60

	// Configuration defaults
	codeLength := req.CodeLength
	if codeLength <= 0 {
		codeLength = 6
	}
	charType := req.CharType
	if charType == "" {
		charType = "alphanumeric_upper"
	}
	userMode := req.UserMode
	if userMode == "" {
		userMode = "same"
	}

	vouchers := make([]Voucher, 0, req.Quantity)
	for i := 0; i < req.Quantity; i++ {
		code, err := crypto.GenerateCustomVoucherCode(crypto.VoucherCodeOptions{
			Prefix:   req.Prefix,
			Length:   codeLength,
			CharType: charType,
		})
		if err != nil {
			return nil, nil, fmt.Errorf("generate voucher code: %w", err)
		}

		var pwd string
		if userMode == "same" {
			pwd = code
		} else {
			pwd, err = crypto.GenerateCustomVoucherCode(crypto.VoucherCodeOptions{
				Length:   codeLength,
				CharType: charType,
			})
			if err != nil {
				pwd = code
			}
		}

		v := Voucher{
			ID:               uuid.New(),
			Code:             code,
			Password:         pwd,
			BatchID:          &batch.ID,
			BatchNumber:      &batch.BatchNumber,
			TemplateID:       &tpl.ID,
			TemplateName:     &tpl.Name,
			Price:            tpl.Price,
			Status:           StatusUnused,
			Channel:          "OFFLINE",
			IsMACLocked:      isMACLocked,
			AgentID:          req.AgentID,
			TimeLimitSeconds: timeLimitSec,
			DataLimitBytes:   tpl.DataLimitBytes,
			ExpiresAt:        &batchExpiry,
			CreatedAt:        now,
			UpdatedAt:        now,
		}
		vouchers = append(vouchers, v)
	}

	if err := s.repo.CreateBatchWithVouchers(ctx, batch, vouchers); err != nil {
		s.logger.Error("failed to generate voucher batch", "error", err)
		return nil, nil, apperrors.Internal(err)
	}

	s.logger.Info("voucher batch generated successfully",
		"batch_number", batchNum,
		"quantity", req.Quantity,
		"template", tpl.Name,
	)

	return batch, vouchers, nil
}

func (s *Service) ListBatches(ctx context.Context) ([]Batch, error) {
	return s.repo.ListBatches(ctx)
}

func (s *Service) ListVouchers(ctx context.Context, params pagination.Params, batchID *uuid.UUID, status string, channel string, agentID string, search string, voucherType string) ([]Voucher, pagination.Meta, error) {
	vouchers, total, err := s.repo.ListVouchers(ctx, params, batchID, status, channel, agentID, search, voucherType)
	if err != nil {
		return nil, pagination.Meta{}, apperrors.Internal(err)
	}
	meta := pagination.NewMeta(params, total)
	return vouchers, meta, nil
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*Voucher, error) {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if v == nil {
		return nil, apperrors.NotFound("Voucher")
	}
	return v, nil
}

func (s *Service) GetDetailByID(ctx context.Context, id uuid.UUID) (*VoucherDetail, error) {
	d, err := s.repo.GetDetailByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if d == nil {
		return nil, apperrors.NotFound("Voucher")
	}
	return d, nil
}

func (s *Service) Disconnect(ctx context.Context, id uuid.UUID) error {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if v == nil {
		return apperrors.NotFound("Voucher")
	}

	if s.radiusSvc != nil && v.Code != "" {
		if err := s.radiusSvc.DisconnectUserSessions(ctx, v.Code); err != nil {
			return apperrors.Internal(fmt.Errorf("gagal memutuskan sesi: %w", err))
		}
	}

	s.logger.Info("voucher active sessions disconnected by admin", "voucher_id", id, "code", v.Code)
	return nil
}

func (s *Service) Revoke(ctx context.Context, id uuid.UUID, reason string) error {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if v == nil {
		return apperrors.NotFound("Voucher")
	}
	if v.Status == StatusRevoked {
		return nil
	}

	if err := s.repo.Revoke(ctx, id, reason); err != nil {
		return apperrors.Internal(err)
	}

	if s.radiusSvc != nil && v.Code != "" {
		_ = s.radiusSvc.DeleteCredential(ctx, v.Code)
		_ = s.radiusSvc.DisconnectUserSessions(ctx, v.Code)
	}

	s.logger.Info("voucher revoked and radius session disconnected", "voucher_id", id, "code", v.Code, "reason", reason)
	return nil
}

func (s *Service) Restore(ctx context.Context, id uuid.UUID) error {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if v == nil {
		return apperrors.NotFound("Voucher")
	}
	if v.Status != StatusRevoked {
		return apperrors.BadRequest("Voucher tidak dalam status REVOKED")
	}

	targetStatus := StatusUnused
	if v.UsedSeconds > 0 || v.FirstUsedAt != nil {
		targetStatus = StatusActive
	}

	if err := s.repo.Restore(ctx, id, string(targetStatus)); err != nil {
		return apperrors.Internal(err)
	}

	// Re-sync to FreeRADIUS radcheck
	if s.radiusSvc != nil && v.Code != "" {
		pwd := v.Password
		if pwd == "" {
			pwd = v.Code
		}
		_ = s.radiusSvc.SyncCredential(ctx, v.Code, pwd, "HOTSPOT_VOUCHER")
	}

	s.logger.Info("voucher restored", "voucher_id", id, "code", v.Code, "status", targetStatus)
	return nil
}

func (s *Service) ResetMAC(ctx context.Context, id uuid.UUID) error {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if v == nil {
		return apperrors.NotFound("Voucher")
	}

	if err := s.repo.ResetMAC(ctx, id); err != nil {
		return apperrors.Internal(err)
	}

	s.logger.Info("voucher device mac reset by admin", "voucher_id", id, "code", v.Code)
	return nil
}

// RunVoucherCleanupJob marks expired vouchers and removes vouchers older than 1 year.
func (s *Service) RunVoucherCleanupJob(ctx context.Context) error {
	expired, purged, err := s.repo.ExpireAndCleanupVouchers(ctx)
	if err != nil {
		s.logger.Error("failed to run voucher cleanup job", "error", err)
		return err
	}
	if expired > 0 || purged > 0 {
		s.logger.Info("voucher cleanup job completed", "expired_count", expired, "purged_count", purged)
	}
	return nil
}

// RunVoucherAccountingSyncJob reconciles voucher status, MAC binding, and usage with radius_sessions.
func (s *Service) RunVoucherAccountingSyncJob(ctx context.Context) error {
	if err := s.repo.SyncVouchersFromAccounting(ctx); err != nil {
		s.logger.Error("failed to sync vouchers from radius accounting", "error", err)
		return err
	}
	return nil
}

// GenerateBlankBatch generates a batch of unassigned scratch vouchers with unique serial numbers
func (s *Service) GenerateBlankBatch(ctx context.Context, req GenerateBlankBatchRequest, createdBy *uuid.UUID) (*Batch, []Voucher, error) {
	if req.Quantity < 1 || req.Quantity > 1000 {
		return nil, nil, apperrors.BadRequest("Jumlah voucher harus antara 1 sampai 1000")
	}

	batchNum, err := s.repo.GenerateBatchNumber(ctx)
	if err != nil {
		return nil, nil, apperrors.Internal(err)
	}

	now := time.Now()
	isMACLocked := true
	if req.IsMACLocked != nil {
		isMACLocked = *req.IsMACLocked
	}
	blankBatchName := "Kartu Blanko Universal"
	batch := &Batch{
		ID:           uuid.New(),
		BatchNumber:  batchNum,
		TemplateID:   nil,
		TemplateName: &blankBatchName,
		Quantity:     req.Quantity,
		IsMACLocked:  isMACLocked,
		Notes:        req.Notes,
		CreatedBy:    createdBy,
		CreatedAt:    now,
	}

	codeLength := req.CodeLength
	if codeLength <= 0 {
		codeLength = 10
	}
	if codeLength < 4 {
		codeLength = 4
	}
	if codeLength > 16 {
		codeLength = 16
	}

	var vouchers []Voucher
	for i := 0; i < req.Quantity; i++ {
		sn, err := s.repo.GenerateSerialNumber(ctx, req.Prefix)
		if err != nil {
			return nil, nil, fmt.Errorf("generate sn: %w", err)
		}

		code, err := crypto.GenerateCustomVoucherCode(crypto.VoucherCodeOptions{
			Length:   codeLength,
			CharType: "numeric",
		})
		if err != nil {
			return nil, nil, fmt.Errorf("generate voucher code: %w", err)
		}

		v := Voucher{
			ID:               uuid.New(),
			Code:             code,
			Password:         code,
			BatchID:          &batch.ID,
			BatchNumber:      &batch.BatchNumber,
			TemplateID:       nil,
			TemplateName:     &blankBatchName,
			Price:            0,
			Status:           StatusBlank,
			Channel:          "OFFLINE",
			IsMACLocked:      isMACLocked,
			SerialNumber:     &sn,
			IsBlank:          true,
			TimeLimitSeconds: 0,
			DataLimitBytes:   0,
			CreatedAt:        now,
			UpdatedAt:        now,
		}
		vouchers = append(vouchers, v)
	}

	if err := s.repo.CreateBatchWithVouchers(ctx, batch, vouchers); err != nil {
		s.logger.Error("failed to generate blank voucher batch", "error", err)
		return nil, nil, apperrors.Internal(err)
	}

	s.logger.Info("blank voucher batch generated successfully",
		"batch_number", batchNum,
		"quantity", req.Quantity,
	)

	return batch, vouchers, nil
}

// ActivateBlankVoucher activates a single blank voucher on-demand using agent's deposit
func (s *Service) ActivateBlankVoucher(ctx context.Context, agentID uuid.UUID, req ActivateBlankVoucherRequest) (*Voucher, error) {
	tpl, err := s.repo.GetTemplateByID(ctx, req.TemplateID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tpl == nil {
		return nil, apperrors.NotFound("Voucher Template")
	}
	if !tpl.IsActive {
		return nil, apperrors.BadRequest("Template voucher ini tidak aktif")
	}

	_, _, cashbackPct, err := s.repo.GetAgentDetails(ctx, agentID)
	if err != nil {
		return nil, apperrors.BadRequest("Mitra agen tidak ditemukan atau tidak aktif")
	}

	rawPrice := int64(tpl.Price)
	commission := int64(float64(rawPrice) * (cashbackPct / 100.0))
	modalCost := rawPrice - commission

	voucher, err := s.repo.ActivateBlankVoucher(ctx, agentID, req.SerialNumber, tpl, modalCost, commission)
	if err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	s.logger.Info("blank voucher activated", "sn", req.SerialNumber, "agent_id", agentID, "template", tpl.Name)
	return voucher, nil
}

// ActivateBlankRange activates a range of sequential serial numbers atomically
func (s *Service) ActivateBlankRange(ctx context.Context, agentID uuid.UUID, req ActivateBlankRangeRequest) (*RangeActivationResult, error) {
	if req.SNStart == "" || req.SNEnd == "" {
		return nil, apperrors.BadRequest("SN Awal dan SN Akhir harus diisi")
	}

	tpl, err := s.repo.GetTemplateByID(ctx, req.TemplateID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tpl == nil {
		return nil, apperrors.NotFound("Voucher Template")
	}
	if !tpl.IsActive {
		return nil, apperrors.BadRequest("Template voucher ini tidak aktif")
	}

	_, _, cashbackPct, err := s.repo.GetAgentDetails(ctx, agentID)
	if err != nil {
		return nil, apperrors.BadRequest("Mitra agen tidak ditemukan atau tidak aktif")
	}

	rawPrice := int64(tpl.Price)
	commissionPerUnit := int64(float64(rawPrice) * (cashbackPct / 100.0))
	modalCostPerUnit := rawPrice - commissionPerUnit

	res, err := s.repo.ActivateBlankRange(ctx, agentID, req.SNStart, req.SNEnd, tpl, modalCostPerUnit, commissionPerUnit)
	if err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	s.logger.Info("blank voucher range activated",
		"sn_start", req.SNStart,
		"sn_end", req.SNEnd,
		"count", res.SuccessCount,
		"agent_id", agentID,
	)
	return res, nil
}

// CheckSN returns inquiry details for a voucher serial number
func (s *Service) CheckSN(ctx context.Context, sn string) (*BlankVoucherInquiry, error) {
	v, err := s.repo.GetBySerialNumber(ctx, sn)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if v == nil {
		return nil, apperrors.NotFound("Nomor seri kartu tidak ditemukan")
	}

	inquiry := &BlankVoucherInquiry{
		SerialNumber:       *v.SerialNumber,
		Code:               v.Code,
		Status:             v.Status,
		IsBlank:            v.IsBlank,
		TemplateID:         v.TemplateID,
		TemplateName:       v.TemplateName,
		Price:              int64(v.Price),
		ActivatedAt:        v.ActivatedAt,
		ActivatedByAgentID: v.ActivatedByAgentID,
		ActivatedByAgent:   v.AgentName,
		TimeLimitSeconds:   v.TimeLimitSeconds,
		DataLimitBytes:     v.DataLimitBytes,
		FirstUsedAt:        v.FirstUsedAt,
		ExpiresAt:          v.ExpiresAt,
		UsedSeconds:        v.UsedSeconds,
		UsedBytes:          v.UsedBytes,
	}
	return inquiry, nil
}

// ReissueDamagedVoucher generates replacement credentials for a damaged scratch card
func (s *Service) ReissueDamagedVoucher(ctx context.Context, agentID uuid.UUID, req ReissueDamagedVoucherRequest) (*Voucher, error) {
	newCode, err := crypto.GenerateCustomVoucherCode(crypto.VoucherCodeOptions{
		Length:   6,
		CharType: "numeric",
	})
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	voucher, err := s.repo.ReissueDamagedVoucher(ctx, agentID, req.SerialNumber, newCode, newCode, req.Reason)
	if err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	s.logger.Info("damaged voucher reissued", "sn", req.SerialNumber, "new_code", newCode, "agent_id", agentID)
	return voucher, nil
}

// ListAgentActivatedVouchers lists vouchers activated by the specific agent
func (s *Service) ListAgentActivatedVouchers(ctx context.Context, agentID uuid.UUID, params pagination.Params, search string) ([]Voucher, pagination.Meta, error) {
	vouchers, total, err := s.repo.ListAgentActivatedVouchers(ctx, agentID, params, search)
	if err != nil {
		return nil, pagination.Meta{}, apperrors.Internal(err)
	}
	meta := pagination.NewMeta(params, total)
	return vouchers, meta, nil
}

// GetAgentByUserID resolves agent ID from auth user ID
func (s *Service) GetAgentByUserID(ctx context.Context, userID uuid.UUID) (agentID uuid.UUID, name string, balance int64, offlineCashbackPct float64, err error) {
	return s.repo.GetAgentByUserID(ctx, userID)
}

// ResendWhatsApp sends voucher credentials to the buyer's WhatsApp number
func (s *Service) ResendWhatsApp(ctx context.Context, id uuid.UUID) error {
	if s.waSender == nil {
		return apperrors.BadRequest("Gateway WhatsApp belum dikonfigurasi pada sistem")
	}

	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if v == nil {
		return apperrors.NotFound("Voucher tidak ditemukan")
	}
	if v.BuyerPhone == nil || *v.BuyerPhone == "" {
		return apperrors.BadRequest("Nomor WhatsApp pembeli tidak tercatat pada voucher ini")
	}

	phone := *v.BuyerPhone
	tplName := "Voucher WiFi"
	if v.TemplateName != nil && *v.TemplateName != "" {
		tplName = *v.TemplateName
	}
	orderID := "-"
	if v.OrderID != nil && *v.OrderID != "" {
		orderID = *v.OrderID
	}

	durationText := ""
	if v.TimeLimitSeconds >= 86400 {
		durationText = fmt.Sprintf("%d Hari", v.TimeLimitSeconds/86400)
	} else if v.TimeLimitSeconds >= 3600 {
		durationText = fmt.Sprintf("%d Jam", v.TimeLimitSeconds/3600)
	} else if v.TimeLimitSeconds > 0 {
		durationText = fmt.Sprintf("%d Menit", v.TimeLimitSeconds/60)
	} else {
		durationText = "Unlimited"
	}

	msg := fmt.Sprintf(`*ISPSYNC HOTSPOT - KODE VOUCHER INTERNET*

Halo! Berikut adalah kode voucher hotspot Anda:

📦 *Paket:* %s
⏱ *Durasi:* %s
🎫 *Kode Voucher:* %s
🔑 *Password:* %s
🆔 *Order ID:* %s

👉 *Cara Penggunaan:*
1. Hubungkan perangkat Anda ke sinyal WiFi *ISPSYNC HOTSPOT*.
2. Buka browser atau klik notifikasi 'Masuk ke Jaringan'.
3. Masukkan Kode Voucher di atas lalu klik Login.

Selamat menikmati internet dari ISPSYNC!`,
		tplName, durationText, v.Code, v.Password, orderID)

	if err := s.waSender.Send(ctx, phone, "Voucher Hotspot WiFi", msg); err != nil {
		s.logger.Error("failed to resend voucher via WhatsApp", "voucher_id", id, "phone", phone, "error", err)
		return fmt.Errorf("gagal mengirim pesan WhatsApp: %w", err)
	}

	s.logger.Info("voucher resent via WhatsApp successfully", "voucher_id", id, "phone", phone)
	return nil
}

func (s *Service) ListHotspotOrders(ctx context.Context, filter ListHotspotOrdersFilter) (*HotspotOrdersResponse, error) {
	orders, total, err := s.repo.ListHotspotOrders(ctx, filter)
	if err != nil {
		return nil, err
	}
	summary, err := s.repo.GetHotspotOrdersSummary(ctx)
	if err != nil {
		s.logger.Warn("failed to get hotspot orders summary", "error", err)
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}

	totalPages := int(total) / limit
	if int(total)%limit != 0 || totalPages == 0 {
		totalPages++
	}

	return &HotspotOrdersResponse{
		Data:    orders,
		Summary: summary,
		Pagination: pagination.Meta{
			Page:       page,
			Limit:      limit,
			Total:      int(total),
			TotalPages: totalPages,
		},
	}, nil
}

