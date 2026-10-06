package hotspot

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gigabill/isp/internal/radius"
	"github.com/gigabill/isp/internal/settings"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/voucher"
	"github.com/gigabill/isp/pkg/crypto"
)

type HotspotPaymentCreator func(ctx context.Context, orderID, pkgName, phone string, amount int64) (paymentURL string, qrImageURL string, snapToken string, err error)
type HotspotPaymentChecker func(ctx context.Context, orderID string) (bool, error)

type WhatsAppSender interface {
	Send(ctx context.Context, recipient string, subject string, body string) error
}

type SecuritySettingsGetter interface {
	GetSecuritySettings(ctx context.Context) (*settings.SecuritySettings, error)
}

type pendingOrder struct {
	templateID      string
	phone           string
	amount          int64 // final discounted amount
	originalPrice   int64
	discountAmount  int64
	agentID         *uuid.UUID
	promoCode       string
	agentCommission int64
	clientMAC       string
	clientIP        string
	createdAt       time.Time
}

type Service struct {
	db             *pgxpool.Pool
	radiusSvc      *radius.Service
	logger         *slog.Logger
	paymentCreator HotspotPaymentCreator
	paymentChecker HotspotPaymentChecker
	waSender       WhatsAppSender
	settingsRepo   SecuritySettingsGetter
	orders         sync.Map // orderID -> pendingOrder
}

func NewService(db *pgxpool.Pool, radiusSvc *radius.Service, logger *slog.Logger) *Service {
	return &Service{
		db:        db,
		radiusSvc: radiusSvc,
		logger:    logger,
	}
}

func (s *Service) SetPaymentCreator(creator HotspotPaymentCreator) {
	s.paymentCreator = creator
}

func (s *Service) SetPaymentChecker(checker HotspotPaymentChecker) {
	s.paymentChecker = checker
}

func (s *Service) SetWhatsAppSender(sender WhatsAppSender) {
	s.waSender = sender
}

func (s *Service) SetSettingsRepo(repo SecuritySettingsGetter) {
	s.settingsRepo = repo
}

func (s *Service) isMACLockEnabled(ctx context.Context) bool {
	if s.settingsRepo == nil {
		return true
	}
	sec, err := s.settingsRepo.GetSecuritySettings(ctx)
	if err != nil || sec == nil {
		return true
	}
	return sec.EnableMACLock
}


func (s *Service) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	if req.Mode == LoginModeVoucher {
		return s.loginVoucher(ctx, req)
	}
	return s.loginMember(ctx, req)
}

func (s *Service) loginVoucher(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	if req.Code == "" {
		return nil, apperrors.BadRequest("Kode voucher wajib diisi")
	}

	const q = `
		SELECT v.id, v.code, v.password, v.status, v.time_limit_seconds, v.data_limit_bytes,
		       v.used_seconds, v.used_bytes, v.first_used_at, v.expires_at, t.name, t.duration_minutes,
		       t.download_kbps, t.upload_kbps, t.min_download_kbps, t.min_upload_kbps,
		       COALESCE(v.channel, 'OFFLINE'), COALESCE(v.buyer_phone, ''), COALESCE(v.order_id, ''),
		       COALESCE(v.buyer_mac, ''), COALESCE(v.serial_number, ''),
		       COALESCE(v.is_mac_locked, true)
		FROM vouchers v
		JOIN voucher_templates t ON t.id = v.template_id
		WHERE v.code = $1
	`
	var (
		id, code, password, status, planName string
		timeLimit, dataLimit, usedSec, usedBytes int64
		durationMinutes int
		dlKbps, ulKbps, minDlKbps, minUlKbps int64
		firstUsedAt, expiresAt *time.Time
		channel, buyerPhone, orderID, buyerMAC, serialNumber string
		isMACLocked bool
	)

	err := s.db.QueryRow(ctx, q, req.Code).Scan(
		&id, &code, &password, &status, &timeLimit, &dataLimit,
		&usedSec, &usedBytes, &firstUsedAt, &expiresAt, &planName, &durationMinutes,
		&dlKbps, &ulKbps, &minDlKbps, &minUlKbps,
		&channel, &buyerPhone, &orderID, &buyerMAC, &serialNumber,
		&isMACLocked,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.BadRequest("Kode voucher tidak ditemukan")
		}
		return nil, apperrors.Internal(err)
	}

	// Password check if provided in voucher
	if password != "" && req.Password != "" && password != req.Password {
		return nil, apperrors.BadRequest("Password voucher salah")
	}

	now := time.Now()

	// Check validity & status
	if status == string(voucher.StatusRevoked) {
		return nil, apperrors.BadRequest("Voucher ini telah dibatalkan (REVOKED)")
	}
	if status == string(voucher.StatusExpired) || (expiresAt != nil && now.After(*expiresAt)) {
		return nil, apperrors.BadRequest("Masa berlaku voucher telah habis (EXPIRED)")
	}
	if status == string(voucher.StatusDepleted) || (timeLimit > 0 && usedSec >= timeLimit) {
		return nil, apperrors.BadRequest("Kuota durasi voucher telah habis (DEPLETED)")
	}

	// Device Binding (MAC Lock) Check
	macLockEnabled := s.isMACLockEnabled(ctx)
	reqMAC := normalizeMAC(req.ClientMAC)

	if macLockEnabled && isMACLocked && reqMAC != "" {
		boundMAC := normalizeMAC(buyerMAC)
		if boundMAC == "" {
			// First-time device binding: lock voucher to this device's MAC
			const bindQ = `UPDATE vouchers SET buyer_mac = $1, updated_at = NOW() WHERE id = $2`
			if _, err := s.db.Exec(ctx, bindQ, reqMAC, id); err != nil {
				s.logger.Error("failed to bind voucher to client mac", "error", err)
			} else {
				s.logger.Info("voucher bound to client mac", "code", code, "mac", reqMAC)
			}
		} else if boundMAC != reqMAC {
			// Device Mismatch!
			s.logger.Warn("voucher device mismatch detected", "code", code, "bound_mac", boundMAC, "req_mac", reqMAC, "channel", channel)
			if channel == "ONLINE" {
				return &LoginResponse{
					Success:      false,
					RequireReset: true,
					Channel:      "ONLINE",
					BoundMAC:     boundMAC,
					Username:     code,
					Password:     password,
					Message:      "Perangkat baru terdeteksi, harap gunakan MAC perangkat sebelumnya. Jika Anda menggunakan perangkat yang sama atau ingin memindahkan voucher, masukkan Nomor WhatsApp atau Order ID untuk mereset perangkat.",
				}, nil
			} else {
				return &LoginResponse{
					Success:      false,
					RequireReset: true,
					Channel:      "OFFLINE",
					BoundMAC:     boundMAC,
					Username:     code,
					Password:     password,
					Message:      "Perangkat baru terdeteksi, harap gunakan MAC perangkat sebelumnya. Jika Anda menggunakan perangkat yang sama atau ingin memindahkan voucher, masukkan Serial Number (SN) voucher ini untuk mereset perangkat.",
				}, nil
			}
		}
	}

	// First-use activation: set first_used_at and calculate expires_at
	if status == string(voucher.StatusUnused) {
		calcExpires := now.Add(time.Duration(durationMinutes) * time.Minute)
		expiresAt = &calcExpires
		firstUsedAt = &now

		const activateQ = `
			UPDATE vouchers
			SET status = 'ACTIVE', first_used_at = $1, expires_at = $2, updated_at = NOW()
			WHERE id = $3
		`
		_, err := s.db.Exec(ctx, activateQ, firstUsedAt, expiresAt, id)
		if err != nil {
			s.logger.Error("failed to activate voucher on first use", "error", err)
			return nil, apperrors.Internal(err)
		}
	}

	// Sync to FreeRADIUS radcheck
	groupName := "HOTSPOT_VOUCHER"
	if err := s.radiusSvc.SyncCredential(ctx, code, password, groupName); err != nil {
		s.logger.Error("failed to sync voucher to RADIUS radcheck", "error", err)
	}

	// Set exact rate limit with CIR & MIR in radreply
	if dlKbps > 0 && ulKbps > 0 {
		if err := s.radiusSvc.SetUserRateLimit(ctx, code, dlKbps, ulKbps, minDlKbps, minUlKbps); err != nil {
			s.logger.Error("failed to set rate limit in radreply", "error", err)
		}
	}

	s.logger.Info("hotspot voucher login verified", "code", code, "plan", planName)

	return &LoginResponse{
		Success:   true,
		Message:   "Otentikasi voucher berhasil",
		Username:  code,
		Password:  password,
		PlanName:  planName,
		TimeLimit: timeLimit,
		DataLimit: dataLimit,
		ExpiresAt: expiresAt,
	}, nil
}

func (s *Service) loginMember(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	if req.Username == "" || req.Password == "" {
		return nil, apperrors.BadRequest("Username dan password wajib diisi")
	}

	const q = `
		SELECT a.id, a.identity, a.password_hash, a.status, p.name
		FROM access_accounts a
		LEFT JOIN subscriptions s ON s.id = a.subscription_id
		LEFT JOIN plans p ON p.id = s.plan_id
		WHERE a.identity = $1 AND a.access_type IN ('HOTSPOT', 'PPPOE')
	`
	var (
		id, identity, status string
		pwdHash, planName *string
	)

	err := s.db.QueryRow(ctx, q, req.Username).Scan(
		&id, &identity, &pwdHash, &status, &planName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.BadRequest("Akun pengguna tidak ditemukan")
		}
		return nil, apperrors.Internal(err)
	}

	if status != "ACTIVE" {
		return nil, apperrors.Forbidden("Akun tidak aktif atau ditangguhkan (SUSPENDED)")
	}

	// Verify password hash
	if pwdHash != nil && *pwdHash != "" {
		if err := crypto.CheckPassword(req.Password, *pwdHash); err != nil {
			return nil, apperrors.BadRequest("Password salah")
		}
	}

	// Sync to FreeRADIUS radcheck
	groupName := "HOTSPOT_MEMBER"
	if err := s.radiusSvc.SyncCredential(ctx, identity, req.Password, groupName); err != nil {
		s.logger.Error("failed to sync member to RADIUS radcheck", "error", err)
	}

	name := "Paket Langganan Member"
	if planName != nil {
		name = *planName
	}

	s.logger.Info("hotspot member login verified", "username", identity)

	return &LoginResponse{
		Success:  true,
		Message:  "Otentikasi akun member berhasil",
		Username: identity,
		Password: req.Password,
		PlanName: name,
	}, nil
}

func (s *Service) GetStatus(ctx context.Context, username, clientIP, clientMAC string) (*StatusResponse, error) {
	// Query active session from radius_sessions
	const q = `
		SELECT username, framedipaddress::TEXT, callingstationid,
		       COALESCE(acctsessiontime, 0), COALESCE(acctinputoctets, 0), COALESCE(acctoutputoctets, 0)
		FROM radius_sessions
		WHERE acctstoptime IS NULL
		  AND (username = $1 OR framedipaddress::TEXT = $2 OR callingstationid = $3)
		ORDER BY acctstarttime DESC
		LIMIT 1
	`
	var (
		user, ip, mac string
		sessionTime, bytesIn, bytesOut int64
	)

	err := s.db.QueryRow(ctx, q, username, clientIP, clientMAC).Scan(
		&user, &ip, &mac, &sessionTime, &bytesIn, &bytesOut,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &StatusResponse{
				IsOnline:  false,
				Username:  username,
				ClientIP:  clientIP,
				ClientMAC: clientMAC,
			}, nil
		}
		return nil, apperrors.Internal(err)
	}

	return &StatusResponse{
		IsOnline:    true,
		Username:    user,
		ClientIP:    ip,
		ClientMAC:   mac,
		SessionTime: sessionTime,
		BytesIn:     bytesIn,
		BytesOut:    bytesOut,
	}, nil
}

func (s *Service) Logout(ctx context.Context, req LogoutRequest) error {
	// Send disconnect CoA
	return s.radiusSvc.DisconnectSession(ctx, radius.DisconnectSessionRequest{
		NasIPAddress: req.RouterIP,
		Username:     req.Username,
		FramedIP:     req.ClientIP,
	})
}

func (s *Service) GetPackages(ctx context.Context) ([]VoucherPackage, error) {
	const q = `
		SELECT id::text, name, COALESCE(description, ''), price, duration_minutes,
		       data_limit_bytes, download_kbps, upload_kbps, validity_days
		FROM voucher_templates
		WHERE is_active = true AND is_available_online = true
		ORDER BY price ASC
	`
	rows, err := s.db.Query(ctx, q)
	if err == nil {
		defer rows.Close()
		var pkgs []VoucherPackage
		for rows.Next() {
			var p VoucherPackage
			if err := rows.Scan(
				&p.ID, &p.Name, &p.Description, &p.Price, &p.DurationMinutes,
				&p.DataLimitBytes, &p.DownloadKbps, &p.UploadKbps, &p.ValidityDays,
			); err == nil {
				pkgs = append(pkgs, p)
			}
		}
		if len(pkgs) > 0 {
			return pkgs, nil
		}
	}

	return []VoucherPackage{}, nil
}

func (s *Service) Purchase(ctx context.Context, req PurchaseRequest) (*PurchaseResponse, error) {
	pkgs, err := s.GetPackages(ctx)
	if err != nil {
		return nil, err
	}

	var selectedPkg *VoucherPackage
	for _, p := range pkgs {
		if p.ID == req.TemplateID {
			selectedPkg = &p
			break
		}
	}
	if selectedPkg == nil && len(pkgs) > 0 {
		selectedPkg = &pkgs[0]
	}
	if selectedPkg == nil {
		return nil, apperrors.BadRequest("Paket voucher tidak ditemukan atau tidak tersedia untuk pembelian online")
	}

	randSecret, _ := crypto.GenerateSecret(3)
	orderID := "ORD-" + time.Now().Format("20060102150405") + "-" + randSecret

	var (
		discountAmount  int64
		agentCommission int64
		agentID         *uuid.UUID
		promoCode       string
		agentName       string
		finalPrice      = selectedPkg.Price
	)

	if req.PromoCode != "" {
		cleanedPromo := strings.ToUpper(strings.TrimSpace(req.PromoCode))
		const findPromoQ = `
			SELECT a.id, a.name, a.online_discount_pct, a.online_cashback_pct
			FROM agent_daily_promos p
			JOIN agents a ON a.id = p.agent_id
			WHERE UPPER(p.promo_code) = $1 AND p.valid_date = CURRENT_DATE AND a.status = 'ACTIVE'
		`
		var aID uuid.UUID
		var aName string
		var discPct, commPct float64
		if err := s.db.QueryRow(ctx, findPromoQ, cleanedPromo).Scan(&aID, &aName, &discPct, &commPct); err == nil {
			agentID = &aID
			agentName = aName
			promoCode = cleanedPromo
			discountAmount = int64(float64(selectedPkg.Price) * (discPct / 100.0))
			finalPrice = selectedPkg.Price - discountAmount
			agentCommission = int64(float64(selectedPkg.Price) * (commPct / 100.0))
		}
	}

	// Cache pending order details
	s.orders.Store(orderID, pendingOrder{
		templateID:      selectedPkg.ID,
		phone:           req.Phone,
		amount:          finalPrice,
		originalPrice:   selectedPkg.Price,
		discountAmount:  discountAmount,
		agentID:         agentID,
		promoCode:       promoCode,
		agentCommission: agentCommission,
		clientMAC:       req.ClientMAC,
		clientIP:        req.ClientIP,
		createdAt:       time.Now(),
	})

	var qrString, qrImageURL, paymentURL, snapToken string

	if s.paymentCreator != nil {
		if pURL, qURL, sTok, err := s.paymentCreator(ctx, orderID, selectedPkg.Name, req.Phone, finalPrice); err == nil {
			if pURL != "" {
				paymentURL = pURL
			}
			if qURL != "" {
				qrImageURL = qURL
			}
			if sTok != "" {
				snapToken = sTok
			}
		}
	}

	payMethod := req.PaymentMethod
	if payMethod == "" {
		payMethod = "MIDTRANS_QRIS"
	}
	expiresAt := time.Now().Add(15 * time.Minute)

	const insertOrderQ = `
		INSERT INTO public.hotspot_orders (
			id, order_id, template_id, package_name, amount, original_price, discount_amount,
			customer_phone, payment_method, payment_url, snap_token, client_ip, client_mac,
			promo_code, agent_id, agent_commission, status, expires_at, created_at, updated_at
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11, $12,
			$13, $14, $15, 'PENDING', $16, NOW(), NOW()
		)
		ON CONFLICT (order_id) DO NOTHING
	`
	if _, err := s.db.Exec(ctx, insertOrderQ,
		orderID, selectedPkg.ID, selectedPkg.Name, finalPrice, selectedPkg.Price, discountAmount,
		req.Phone, payMethod, paymentURL, snapToken, req.ClientIP, req.ClientMAC,
		promoCode, agentID, agentCommission, expiresAt,
	); err != nil {
		s.logger.Error("failed to record pending hotspot order to database", "order_id", orderID, "error", err)
	}

	return &PurchaseResponse{
		OrderID:        orderID,
		TemplateName:   selectedPkg.Name,
		Amount:         finalPrice,
		OriginalPrice:  selectedPkg.Price,
		DiscountAmount: discountAmount,
		PromoCode:      promoCode,
		AgentName:      agentName,
		PaymentMethod:  payMethod,
		PaymentURL:     paymentURL,
		SnapToken:      snapToken,
		QrString:       qrString,
		QrImageURL:     qrImageURL,
		ExpiresAt:      expiresAt,
		Status:         "PENDING",
	}, nil
}

func (s *Service) CheckPurchase(ctx context.Context, req ClaimPurchaseRequest) (*ClaimPurchaseResponse, error) {
	// Idempotency: Jika pesanan dengan OrderID ini sudah pernah diproses/terbit vouchernya,
	// kembalikan kredensial voucher yang sudah ada agar tidak terbuat voucher baru/ganda.
	if req.OrderID != "" {
		var existingCode, existingPwd, tplName string
		var timeLimit int64
		const checkExistingQ = `
			SELECT v.code, v.password, COALESCE(t.name, 'Voucher WiFi'), v.time_limit_seconds
			FROM vouchers v
			LEFT JOIN voucher_templates t ON t.id = v.template_id
			WHERE v.order_id = $1
			LIMIT 1
		`
		if err := s.db.QueryRow(ctx, checkExistingQ, req.OrderID).Scan(&existingCode, &existingPwd, &tplName, &timeLimit); err == nil && existingCode != "" {
			s.logger.Info("voucher already exists for order, returning existing credentials", "order_id", req.OrderID, "code", existingCode)
			_, _ = s.db.Exec(ctx, `UPDATE public.hotspot_orders SET status = 'PAID', voucher_code = $1, paid_at = COALESCE(paid_at, NOW()), updated_at = NOW() WHERE order_id = $2 AND status != 'PAID'`, existingCode, req.OrderID)
			return &ClaimPurchaseResponse{
				Status:       "PAID",
				Code:         existingCode,
				Password:     existingPwd,
				PlanName:     tplName,
				TimeLimitSec: timeLimit,
				Message:      "Pembayaran berhasil diverifikasi. Voucher internet Anda aktif!",
			}, nil
		}
	}

	// Verifikasi apakah pesanan sudah benar-benar dibayar di payment gateway!
	// Jangan pernah membuat voucher jika transaksi belum lunas.
	isPaid := false
	if req.SimulatePay {
		isPaid = true
	} else if s.paymentChecker != nil && req.OrderID != "" {
		paid, err := s.paymentChecker(ctx, req.OrderID)
		if err != nil {
			s.logger.Warn("failed to check payment status from provider", "order_id", req.OrderID, "error", err)
		} else if paid {
			isPaid = true
		}
	}

	if !isPaid {
		return &ClaimPurchaseResponse{
			Status:  "PENDING",
			Message: "Menunggu pembayaran dari payment gateway.",
		}, nil
	}

	templateIDStr := req.TemplateID
	phone := req.Phone
	clientMAC := req.ClientMAC

	var (
		orderAgentID         *uuid.UUID
		orderPromoCode       string
		orderDiscountAmount  int64
		orderAgentCommission int64
	)

	if cached, ok := s.orders.Load(req.OrderID); ok {
		if po, valid := cached.(pendingOrder); valid {
			if templateIDStr == "" {
				templateIDStr = po.templateID
			}
			if phone == "" {
				phone = po.phone
			}
			if clientMAC == "" {
				clientMAC = po.clientMAC
			}
			orderAgentID = po.agentID
			orderPromoCode = po.promoCode
			orderDiscountAmount = po.discountAmount
			orderAgentCommission = po.agentCommission
		}
	}

	var (
		templateID                                  uuid.UUID
		templateName                                string
		price, dlKbps, ulKbps, minDlKbps, minUlKbps int64
		durationMinutes                             int
	)

	if tid, err := uuid.Parse(templateIDStr); err == nil {
		templateID = tid
		const tplQ = `
			SELECT name, price, duration_minutes, download_kbps, upload_kbps, min_download_kbps, min_upload_kbps
			FROM voucher_templates
			WHERE id = $1
		`
		_ = s.db.QueryRow(ctx, tplQ, templateID).Scan(
			&templateName, &price, &durationMinutes,
			&dlKbps, &ulKbps, &minDlKbps, &minUlKbps,
		)
	}

	if orderAgentID == nil && req.PromoCode != "" {
		cleanedPromo := strings.ToUpper(strings.TrimSpace(req.PromoCode))
		const findPromoQ = `
			SELECT a.id, a.online_discount_pct, a.online_cashback_pct
			FROM agent_daily_promos p
			JOIN agents a ON a.id = p.agent_id
			WHERE UPPER(p.promo_code) = $1 AND p.valid_date = CURRENT_DATE AND a.status = 'ACTIVE'
		`
		var aID uuid.UUID
		var discPct, commPct float64
		if err := s.db.QueryRow(ctx, findPromoQ, cleanedPromo).Scan(&aID, &discPct, &commPct); err == nil {
			orderAgentID = &aID
			orderPromoCode = cleanedPromo
			orderDiscountAmount = int64(float64(price) * (discPct / 100.0))
			orderAgentCommission = int64(float64(price) * (commPct / 100.0))
		}
	}

	// Fallback jika template belum terisi
	if templateName == "" {
		_ = s.db.QueryRow(ctx, `
			SELECT id, name, price, duration_minutes, download_kbps, upload_kbps, min_download_kbps, min_upload_kbps
			FROM voucher_templates
			WHERE is_active = true AND is_available_online = true
			ORDER BY price ASC
			LIMIT 1
		`).Scan(
			&templateID, &templateName, &price, &durationMinutes,
			&dlKbps, &ulKbps, &minDlKbps, &minUlKbps,
		)
	}

	if durationMinutes <= 0 {
		durationMinutes = 1440
	}
	if templateName == "" {
		templateName = "Voucher Hotspot Online"
		dlKbps = 10240
		ulKbps = 5120
		price = 10000
	}

	// Format kode voucher online: nomor acak 12 digit (single login: username = password)
	code, err := crypto.GenerateNumericCode(12)
	if err != nil {
		return nil, err
	}
	password := code

	timeLimitSec := int64(durationMinutes * 60)
	// Masa aktif semua voucher sejak pertama kali dikeluarkan adalah 1 tahun
	validUntil := time.Now().AddDate(1, 0, 0)

	// Simpan ke database dengan channel 'ONLINE' dan status 'UNUSED' (masa aktif 1 tahun sejak dikeluarkan)
	const insertQ = `
		INSERT INTO vouchers (
			id, code, password, template_id, status, channel, buyer_phone, order_id, buyer_mac,
			agent_id, promo_code, discount_amount, agent_commission,
			time_limit_seconds, data_limit_bytes, used_seconds, used_bytes,
			first_used_at, expires_at, created_at, updated_at
		) VALUES (
			gen_random_uuid(), $1, $2, $3, 'UNUSED', 'ONLINE', $4, $5, $6,
			$7, $8, $9, $10,
			$11, 0, 0, 0,
			NULL, $12, NOW(), NOW()
		)
		ON CONFLICT (code) DO NOTHING
	`
	var templateIDParam interface{}
	if templateID != uuid.Nil {
		templateIDParam = templateID
	} else {
		templateIDParam = nil
	}

	var phoneParam *string
	if phone != "" {
		phoneParam = &phone
	}
	var orderIDParam *string
	if req.OrderID != "" {
		orderIDParam = &req.OrderID
	}
	var buyerMACParam *string
	if clientMAC != "" {
		buyerMACParam = &clientMAC
	}
	var promoParam *string
	if orderPromoCode != "" {
		promoParam = &orderPromoCode
	}

	if _, err := s.db.Exec(ctx, insertQ, code, password, templateIDParam, phoneParam, orderIDParam, buyerMACParam, orderAgentID, promoParam, orderDiscountAmount, orderAgentCommission, timeLimitSec, validUntil); err != nil {
		s.logger.Error("failed to insert online voucher to db", "error", err)
	}

	if req.OrderID != "" {
		const updateOrderPaidQ = `
			UPDATE public.hotspot_orders
			SET status = 'PAID', voucher_code = $1, paid_at = NOW(), updated_at = NOW()
			WHERE order_id = $2
		`
		if _, err := s.db.Exec(ctx, updateOrderPaidQ, code, req.OrderID); err != nil {
			s.logger.Error("failed to update hotspot order status to PAID", "order_id", req.OrderID, "error", err)
		}
	}

	// Kreditkan komisi agen secara otomatis ke saldo agen
	if orderAgentID != nil && orderAgentCommission > 0 {
		mutID := uuid.New()
		desc := fmt.Sprintf("Komisi penjualan voucher online paket '%s' via kode promo %s", templateName, orderPromoCode)
		const creditQ = `
			WITH updated_agent AS (
				UPDATE agents 
				SET balance = balance + $1, updated_at = NOW()
				WHERE id = $2
				RETURNING balance - $1 as before_bal, balance as after_bal
			)
			INSERT INTO agent_balance_mutations (
				id, agent_id, mutation_type, amount, balance_before, balance_after, reference_id, description, created_at
			)
			SELECT $3, $2, 'VOUCHER_ONLINE_COMMISSION', $1, before_bal, after_bal, $4, $5, NOW()
			FROM updated_agent
		`
		if _, err := s.db.Exec(ctx, creditQ, orderAgentCommission, *orderAgentID, mutID, req.OrderID, desc); err != nil {
			s.logger.Error("failed to credit agent commission", "agent_id", *orderAgentID, "order_id", req.OrderID, "error", err)
		} else {
			s.logger.Info("agent commission credited successfully", "agent_id", *orderAgentID, "order_id", req.OrderID, "amount", orderAgentCommission)
		}
	}

	// Sync ke FreeRADIUS radcheck
	groupName := "HOTSPOT_VOUCHER"
	if err := s.radiusSvc.SyncCredential(ctx, code, password, groupName); err != nil {
		s.logger.Error("failed to sync online voucher to RADIUS radcheck", "error", err)
	}

	// Set kecepatan (bandwidth limit) di FreeRADIUS radreply
	if dlKbps > 0 && ulKbps > 0 {
		if err := s.radiusSvc.SetUserRateLimit(ctx, code, dlKbps, ulKbps, minDlKbps, minUlKbps); err != nil {
			s.logger.Error("failed to set rate limit in radreply for online voucher", "error", err)
		}
	}

	// Otomatis kirim kode voucher ke WhatsApp pembeli
	if s.waSender != nil && phone != "" {
		go func(recipient, vCode, vPwd, plan, ord string, durationSec int64) {
			sendCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			msg := formatVoucherWAMessage(vCode, vPwd, plan, ord, durationSec)
			if err := s.waSender.Send(sendCtx, recipient, "Voucher Hotspot WiFi", msg); err != nil {
				s.logger.Error("failed to send voucher via WhatsApp", "phone", recipient, "error", err)
			} else {
				s.logger.Info("voucher sent via WhatsApp successfully", "phone", recipient, "code", vCode)
			}
		}(phone, code, password, templateName, req.OrderID, timeLimitSec)
	}

	s.logger.Info("online voucher issued successfully",
		"code", code,
		"channel", "ONLINE",
		"template", templateName,
		"order_id", req.OrderID,
		"buyer_phone", phone,
		"buyer_mac", clientMAC,
	)

	return &ClaimPurchaseResponse{
		Status:       "PAID",
		Code:         code,
		Password:     password,
		PlanName:     templateName,
		TimeLimitSec: timeLimitSec,
		Message:      "Pembayaran berhasil diverifikasi. Voucher internet Anda aktif!",
	}, nil
}

func normalizeMAC(mac string) string {
	mac = strings.ToUpper(strings.TrimSpace(mac))
	mac = strings.ReplaceAll(mac, "-", ":")
	return mac
}

func maskPhone(p string) string {
	cleaned := strings.TrimSpace(p)
	if len(cleaned) <= 6 {
		return cleaned
	}
	return cleaned[:4] + "****" + cleaned[len(cleaned)-3:]
}

func formatVoucherWAMessage(code, password, planName, orderID string, timeLimitSec int64) string {
	durationText := ""
	if timeLimitSec >= 86400 {
		durationText = fmt.Sprintf("%d Hari", timeLimitSec/86400)
	} else if timeLimitSec >= 3600 {
		durationText = fmt.Sprintf("%d Jam", timeLimitSec/3600)
	} else if timeLimitSec > 0 {
		durationText = fmt.Sprintf("%d Menit", timeLimitSec/60)
	} else {
		durationText = "Unlimited"
	}

	return fmt.Sprintf(`*GOGIGA HOTSPOT - KODE VOUCHER INTERNET*

Halo! Terima kasih atas pembelian voucher hotspot WiFi Anda.

📦 *Paket:* %s
⏱ *Durasi:* %s
🎫 *Kode Voucher:* %s
🔑 *Password:* %s
🆔 *Order ID:* %s

👉 *Cara Penggunaan:*
1. Hubungkan perangkat Anda ke sinyal WiFi *GOGIGA HOTSPOT*.
2. Buka browser atau klik notifikasi 'Masuk ke Jaringan'.
3. Masukkan Kode Voucher di atas lalu klik Login.

Selamat menikmati internet berkualitas dari GOGIGANET!`,
		planName, durationText, code, password, orderID)
}

func (s *Service) RecoverVoucher(ctx context.Context, req RecoverVoucherRequest) (*RecoverVoucherResponse, error) {
	phoneTrim := strings.TrimSpace(req.Phone)
	orderIDTrim := strings.TrimSpace(req.OrderID)

	if phoneTrim == "" && orderIDTrim == "" {
		return nil, apperrors.BadRequest("Masukkan nomor WhatsApp atau Order ID pembelian Anda")
	}

	var phone08, phone62, phoneDigits string
	if phoneTrim != "" {
		digitsOnly := ""
		for _, c := range phoneTrim {
			if c >= '0' && c <= '9' {
				digitsOnly += string(c)
			}
		}
		phoneDigits = digitsOnly
		if strings.HasPrefix(digitsOnly, "62") {
			phone62 = digitsOnly
			phone08 = "0" + strings.TrimPrefix(digitsOnly, "62")
		} else if strings.HasPrefix(digitsOnly, "0") {
			phone08 = digitsOnly
			phone62 = "62" + strings.TrimPrefix(digitsOnly, "0")
		} else {
			phone08 = digitsOnly
			phone62 = digitsOnly
		}
	}

	const q = `
		SELECT v.code, v.password, COALESCE(t.name, 'Voucher WiFi'), v.time_limit_seconds,
		       COALESCE(v.buyer_phone, ''), COALESCE(v.order_id, ''), COALESCE(v.buyer_mac, '')
		FROM vouchers v
		LEFT JOIN voucher_templates t ON t.id = v.template_id
		WHERE v.channel = 'ONLINE'
		  AND (
		    ($1 != '' AND v.order_id = $1)
		    OR ($2 != '' AND (
		       v.buyer_phone = $2
		       OR v.buyer_phone = $3
		       OR regexp_replace(v.buyer_phone, '\D', '', 'g') = $4
		    ))
		  )
		ORDER BY v.created_at DESC
		LIMIT 1
	`
	var (
		vCode, vPassword, vPlanName string
		vTimeLimit int64
		vBuyerPhone, vOrderID, vBuyerMAC string
	)

	err := s.db.QueryRow(ctx, q, orderIDTrim, phone08, phone62, phoneDigits).Scan(
		&vCode, &vPassword, &vPlanName, &vTimeLimit,
		&vBuyerPhone, &vOrderID, &vBuyerMAC,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &RecoverVoucherResponse{
				Success: false,
				Message: "Tidak ditemukan pembelian voucher online dengan nomor HP atau Order ID tersebut. Pastikan data sudah sesuai.",
			}, nil
		}
		return nil, apperrors.Internal(err)
	}

	// Security / Anti-Theft Verification:
	// 1. Apakah MAC perangkat cocok dengan MAC saat beli?
	reqMAC := normalizeMAC(req.ClientMAC)
	buyerMAC := normalizeMAC(vBuyerMAC)
	macMatches := reqMAC != "" && buyerMAC != "" && reqMAC == buyerMAC

	// 2. Apakah Order ID dimasukkan dan cocok dengan order_id di database? (Bukti transfer bank)
	orderIDMatches := orderIDTrim != "" && strings.EqualFold(orderIDTrim, strings.TrimSpace(vOrderID))

	// Jika MAC cocok ATAU Order ID cocok -> AUTHORIZED (bisa lihat kode voucher di layar)
	if macMatches || orderIDMatches {
		return &RecoverVoucherResponse{
			Success:      true,
			Authorized:   true,
			Code:         vCode,
			Password:     vPassword,
			PlanName:     vPlanName,
			TimeLimitSec: vTimeLimit,
			Message:      "Voucher berhasil ditemukan! Anda dapat langsung menghubungkan internet.",
		}, nil
	}

	// Jika BEDA PERANGKAT dan TIDAK ADA / SALAH Order ID:
	// Amankan! Jangan tampilkan kode di layar (Cegah orang lain yang cuma tahu nomor HP membajak voucher).
	// Sebagai gantinya, kirimkan ulang kode ke WhatsApp pemilik yang sah!
	sentToWA := false
	if s.waSender != nil && vBuyerPhone != "" {
		go func(recipient, code, pwd, plan, ord string, durationSec int64) {
			sendCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			msg := formatVoucherWAMessage(code, pwd, plan, ord, durationSec)
			_ = s.waSender.Send(sendCtx, recipient, "Voucher Hotspot WiFi", msg)
		}(vBuyerPhone, vCode, vPassword, vPlanName, vOrderID, vTimeLimit)
		sentToWA = true
	}

	return &RecoverVoucherResponse{
		Success:        true,
		Authorized:     false,
		MaskedPhone:    maskPhone(vBuyerPhone),
		Message:        "Perangkat berbeda terdeteksi demi keamanan. Kode voucher telah dikirimkan ke WhatsApp pemilik (" + maskPhone(vBuyerPhone) + "). Jika Anda pemilik yang sah, masukkan Order ID dari bukti bayar bank untuk membukanya di sini.",
		SentToWhatsApp: sentToWA,
	}, nil
}

func cleanDigits(str string) string {
	var sb strings.Builder
	for _, c := range str {
		if c >= '0' && c <= '9' {
			sb.WriteRune(c)
		}
	}
	return sb.String()
}

func (s *Service) ResetDevice(ctx context.Context, req ResetDeviceRequest) (*ResetDeviceResponse, error) {
	codeTrim := strings.TrimSpace(req.Code)
	keyTrim := strings.TrimSpace(req.ResetKey)
	newMAC := normalizeMAC(req.ClientMAC)

	if codeTrim == "" {
		return nil, apperrors.BadRequest("Kode voucher wajib diisi")
	}
	if keyTrim == "" {
		return nil, apperrors.BadRequest("Kunci verifikasi (No. WhatsApp / Order ID / Serial Number) wajib diisi")
	}

	const q = `
		SELECT v.id, v.code, v.password, COALESCE(v.channel, 'OFFLINE'),
		       COALESCE(v.buyer_phone, ''), COALESCE(v.order_id, ''),
		       COALESCE(v.serial_number, ''), COALESCE(v.buyer_mac, '')
		FROM vouchers v
		WHERE v.code = $1
	`
	var (
		id, code, password, channel                 string
		buyerPhone, orderID, serialNumber, boundMAC string
	)
	err := s.db.QueryRow(ctx, q, codeTrim).Scan(
		&id, &code, &password, &channel,
		&buyerPhone, &orderID, &serialNumber, &boundMAC,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &ResetDeviceResponse{
				Success: false,
				Message: "Voucher tidak ditemukan",
			}, nil
		}
		return nil, apperrors.Internal(err)
	}

	authorized := false
	if channel == "ONLINE" {
		// Online voucher: user can enter either their registered WhatsApp phone number OR the Order ID!
		// No OTP required.
		keyDigits := cleanDigits(keyTrim)
		buyerDigits := cleanDigits(buyerPhone)

		// Check if key matches Order ID
		if strings.EqualFold(keyTrim, strings.TrimSpace(orderID)) {
			authorized = true
		} else if keyDigits != "" && buyerDigits != "" {
			// Compare phone digits: tolerate 08... vs 628...
			kNorm := strings.TrimPrefix(keyDigits, "62")
			kNorm = strings.TrimPrefix(kNorm, "0")
			bNorm := strings.TrimPrefix(buyerDigits, "62")
			bNorm = strings.TrimPrefix(bNorm, "0")
			if kNorm == bNorm {
				authorized = true
			}
		}

		if !authorized {
			return &ResetDeviceResponse{
				Success: false,
				Message: "Nomor WhatsApp atau Order ID tidak cocok dengan data pembelian voucher ini.",
			}, nil
		}
	} else {
		// Offline / Fisik voucher: user enters Serial Number (SN).
		// Fallback: If legacy voucher had no SN, allow voucher password.
		snTrim := strings.TrimSpace(serialNumber)
		if snTrim != "" {
			if strings.EqualFold(keyTrim, snTrim) {
				authorized = true
			}
		} else {
			if keyTrim == password {
				authorized = true
			}
		}

		if !authorized {
			return &ResetDeviceResponse{
				Success: false,
				Message: "Serial Number (SN) voucher tidak cocok. Harap periksa SN pada fisik kartu voucher Anda.",
			}, nil
		}
	}

	// Update buyer_mac in database with new MAC
	const updateQ = `UPDATE vouchers SET buyer_mac = $1, updated_at = NOW() WHERE id = $2`
	if _, err := s.db.Exec(ctx, updateQ, newMAC, id); err != nil {
		s.logger.Error("failed to reset voucher mac binding", "error", err)
		return nil, apperrors.Internal(err)
	}

	s.logger.Info("voucher device mac reset successfully", "code", code, "channel", channel, "new_mac", newMAC)

	return &ResetDeviceResponse{
		Success:  true,
		Message:  "Perangkat berhasil direset dan dihubungkan ke perangkat baru!",
		Channel:  channel,
		NewMAC:   newMAC,
		Username: code,
		Password: password,
	}, nil
}


