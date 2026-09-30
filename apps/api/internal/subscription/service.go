package subscription

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/customer"
	"github.com/gigabill/isp/internal/plan"
	"github.com/gigabill/isp/internal/radius"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/pagination"
	"github.com/gigabill/isp/pkg/crypto"
)

type InitialInvoiceGenerator interface {
	GenerateInitialInvoice(ctx context.Context, sub *Subscription, monthlyPrice, installationFee int64, taxPercent int) error
}

type IPAMSynchronizer interface {
	SyncAddressAllocation(ctx context.Context, oldIP, newIP, username, customerName string) error
}

type Service struct {
	repo         *Repository
	planRepo     *plan.Repository
	customerRepo *customer.Repository
	radiusSvc    *radius.Service
	invoiceGen   InitialInvoiceGenerator
	ipamSync     IPAMSynchronizer
	logger       *slog.Logger
}

func NewService(repo *Repository, planRepo *plan.Repository, customerRepo *customer.Repository, radiusSvc *radius.Service, logger *slog.Logger) *Service {
	return &Service{
		repo:         repo,
		planRepo:     planRepo,
		customerRepo: customerRepo,
		radiusSvc:    radiusSvc,
		logger:       logger,
	}
}

func (s *Service) SetInitialInvoiceGenerator(gen InitialInvoiceGenerator) {
	s.invoiceGen = gen
}

func (s *Service) SetIPAMSynchronizer(sync IPAMSynchronizer) {
	s.ipamSync = sync
}

func (s *Service) Create(ctx context.Context, req CreateSubscriptionRequest) (*Subscription, error) {
	// Verify customer
	cust, err := s.customerRepo.GetByID(ctx, req.CustomerID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if cust == nil {
		return nil, apperrors.NotFound("Customer")
	}

	// Verify plan and get current active price snapshot
	targetPlan, err := s.planRepo.GetByID(ctx, req.PlanID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if targetPlan == nil {
		return nil, apperrors.NotFound("Plan")
	}
	if targetPlan.Status != plan.StatusActive {
		return nil, apperrors.BadRequest("Paket tidak dalam status aktif")
	}

	currentPrice, err := s.planRepo.GetCurrentPrice(ctx, req.PlanID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if currentPrice == nil {
		return nil, apperrors.BadRequest("Paket belum memiliki harga aktif")
	}

	cycle := targetPlan.BillingCycle
	if req.BillingCycle != nil {
		cycle = *req.BillingCycle
	}

	autoRenewal := true
	if req.AutoRenewal != nil {
		autoRenewal = *req.AutoRenewal
	}

	now := time.Now()
	sub := &Subscription{
		ID:              uuid.New(),
		CustomerID:      req.CustomerID,
		PlanID:          req.PlanID,
		PlanPriceID:     currentPrice.ID,
		Status:          StatusPending,
		BillingCycle:    cycle,
		AutoRenewal:     autoRenewal,
		GracePeriodDays: targetPlan.GracePeriodDays,
		Notes:           req.Notes,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	// Optional initial access account
	var acc *AccessAccount
	if req.InitialAccessType != nil && req.InitialUsername != nil && req.InitialPassword != nil {
		hash, err := crypto.HashPassword(*req.InitialPassword)
		if err != nil {
			return nil, apperrors.Internal(err)
		}
		acc = &AccessAccount{
			ID:                   uuid.New(),
			CustomerID:           req.CustomerID,
			AccessType:           *req.InitialAccessType,
			Identity:             *req.InitialUsername,
			PasswordHash:         &hash,
			StaticIP:             req.InitialStaticIP,
			Status:               AccessAccountPending,
			SimultaneousUseLimit: 1,
			CreatedAt:            now,
			UpdatedAt:            now,
		}
	}

	if err := s.repo.Create(ctx, sub, acc); err != nil {
		s.logger.Error("failed to create subscription", "error", err)
		return nil, apperrors.Internal(err)
	}

	if acc != nil {
		sub.AccessAccounts = append(sub.AccessAccounts, *acc)
		if s.radiusSvc != nil && req.InitialUsername != nil && req.InitialPassword != nil {
			groupName := targetPlan.Name
			staticIP := ""
			if req.InitialStaticIP != nil {
				staticIP = *req.InitialStaticIP
			}
			_ = s.radiusSvc.SyncCredentialWithIP(ctx, *req.InitialUsername, *req.InitialPassword, groupName, staticIP)
			framedPool := ""
			if targetPlan.FramedPool != nil {
				framedPool = *targetPlan.FramedPool
			}
			_ = s.radiusSvc.EnsureGroupProfileWithPool(ctx, groupName, targetPlan.DownloadKbps, targetPlan.UploadKbps, framedPool, targetPlan.MinDownloadKbps, targetPlan.MinUploadKbps)

			if req.InitialStaticIP != nil && *req.InitialStaticIP != "" && s.ipamSync != nil {
				if err := s.ipamSync.SyncAddressAllocation(ctx, "", *req.InitialStaticIP, *req.InitialUsername, cust.FullName); err != nil {
					s.logger.Warn("failed to sync ipam address allocation on create", "error", err, "ip", *req.InitialStaticIP)
				}
			}
		}
	}

	sub.PlanName = &targetPlan.Name
	sub.CustomerName = &cust.FullName
	sub.CustomerNumber = &cust.CustomerNumber
	sub.PriceSnapshot = &PriceSnapshot{
		ID:              currentPrice.ID,
		MonthlyPrice:    currentPrice.MonthlyPrice,
		InstallationFee: currentPrice.InstallationFee,
		ActivationFee:   currentPrice.ActivationFee,
		TaxPercent:      currentPrice.TaxPercent,
		LateFeePercent:  currentPrice.LateFeePercent,
		Currency:        currentPrice.Currency,
	}

	// Auto-generate initial invoice (1st month + installation fee if any)
	if s.invoiceGen != nil && currentPrice != nil {
		if err := s.invoiceGen.GenerateInitialInvoice(ctx, sub, currentPrice.MonthlyPrice.Int64(), currentPrice.InstallationFee.Int64(), currentPrice.TaxPercent); err != nil {
			s.logger.Warn("failed to auto-generate initial invoice for new subscription", "subscription_id", sub.ID, "error", err)
		}
	}

	return sub, nil
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*Subscription, error) {
	sub, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if sub == nil {
		return nil, apperrors.NotFound("Subscription")
	}
	return sub, nil
}

func (s *Service) List(ctx context.Context, params pagination.Params, customerID *uuid.UUID, status string, search string) ([]Subscription, pagination.Meta, error) {
	subs, total, err := s.repo.List(ctx, params, customerID, status, search)
	if err != nil {
		return nil, pagination.Meta{}, apperrors.Internal(err)
	}
	meta := pagination.NewMeta(params, total)
	return subs, meta, nil
}

func (s *Service) Activate(ctx context.Context, id uuid.UUID) (*Subscription, error) {
	sub, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if sub == nil {
		return nil, apperrors.NotFound("Subscription")
	}
	if sub.Status == StatusActive {
		return sub, nil
	}

	now := time.Now()
	nextBilling := calculateNextBillingDate(now, sub.BillingCycle)

	if err := s.repo.UpdateStatus(ctx, id, StatusActive, &now, &nextBilling); err != nil {
		return nil, apperrors.Internal(err)
	}

	// Also activate associated access accounts
	_ = s.repo.UpdateAccessAccountsBySubscriptionID(ctx, id, AccessAccountActive)

	// FreeRADIUS Sync & Session Reset
	if s.radiusSvc != nil {
		groupName := "DEFAULT"
		if sub.PlanName != nil && *sub.PlanName != "" {
			groupName = *sub.PlanName
		}
		for _, acc := range sub.AccessAccounts {
			_ = s.radiusSvc.RestoreUser(ctx, acc.Identity, groupName)
		}
	}

	sub.Status = StatusActive
	sub.StartDate = &now
	sub.NextBillingDate = &nextBilling
	s.logger.Info("subscription activated & synced to FreeRADIUS", "subscription_id", id)
	return sub, nil
}

func (s *Service) Suspend(ctx context.Context, id uuid.UUID) (*Subscription, error) {
	sub, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if sub == nil {
		return nil, apperrors.NotFound("Subscription")
	}

	if err := s.repo.UpdateStatus(ctx, id, StatusSuspended, nil, nil); err != nil {
		return nil, apperrors.Internal(err)
	}

	// Suspend associated access accounts
	_ = s.repo.UpdateAccessAccountsBySubscriptionID(ctx, id, AccessAccountSuspended)

	// FreeRADIUS Isolir & CoA Disconnect
	if s.radiusSvc != nil {
		for _, acc := range sub.AccessAccounts {
			if err := s.radiusSvc.IsolateUser(ctx, acc.Identity); err != nil {
				s.logger.Warn("failed to isolate access account in FreeRADIUS", "identity", acc.Identity, "error", err)
			}
		}
	}

	sub.Status = StatusSuspended
	s.logger.Info("subscription suspended & isolated in FreeRADIUS", "subscription_id", id)
	return sub, nil
}

func (s *Service) Reactivate(ctx context.Context, id uuid.UUID) (*Subscription, error) {
	sub, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if sub == nil {
		return nil, apperrors.NotFound("Subscription")
	}

	now := time.Now()
	var newNextBilling *time.Time
	// If the existing next_billing_date was in the past (expired), extend from now
	if sub.NextBillingDate == nil || sub.NextBillingDate.Before(now) {
		nb := calculateNextBillingDate(now, sub.BillingCycle)
		newNextBilling = &nb
	}

	if err := s.repo.UpdateStatus(ctx, id, StatusActive, nil, newNextBilling); err != nil {
		return nil, apperrors.Internal(err)
	}

	_ = s.repo.UpdateAccessAccountsBySubscriptionID(ctx, id, AccessAccountActive)

	// FreeRADIUS Restore to Plan Profile & CoA Disconnect
	if s.radiusSvc != nil {
		groupName := "DEFAULT"
		if sub.PlanName != nil && *sub.PlanName != "" {
			groupName = *sub.PlanName
		}
		for _, acc := range sub.AccessAccounts {
			if err := s.radiusSvc.RestoreUser(ctx, acc.Identity, groupName); err != nil {
				s.logger.Warn("failed to restore access account in FreeRADIUS", "identity", acc.Identity, "error", err)
			}
		}
	}

	sub.Status = StatusActive
	if newNextBilling != nil {
		sub.NextBillingDate = newNextBilling
	}
	s.logger.Info("subscription reactivated & restored in FreeRADIUS", "subscription_id", id)
	return sub, nil
}

// ExtendValidityOnPayment handles the rolling validity extension when a subscription payment is completed:
// - If already expired/suspended (or next_billing_date <= paymentTime): extends from paymentTime.
// - If still active (next_billing_date > paymentTime): adds a cycle to the existing next_billing_date (accumulative).
// - Ensures status is ACTIVE and restores FreeRADIUS profile & MikroTik session.
func (s *Service) ExtendValidityOnPayment(ctx context.Context, id uuid.UUID, paymentTime time.Time) (*Subscription, error) {
	sub, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if sub == nil {
		return nil, apperrors.NotFound("Subscription")
	}

	baseDate := paymentTime
	if sub.NextBillingDate != nil && sub.NextBillingDate.After(paymentTime) {
		baseDate = *sub.NextBillingDate
	}

	newNextBilling := calculateNextBillingDate(baseDate, sub.BillingCycle)

	if err := s.repo.UpdateStatus(ctx, id, StatusActive, nil, &newNextBilling); err != nil {
		return nil, apperrors.Internal(err)
	}

	_ = s.repo.UpdateAccessAccountsBySubscriptionID(ctx, id, AccessAccountActive)

	// FreeRADIUS Restore to Plan Profile & CoA Disconnect
	if s.radiusSvc != nil {
		groupName := "DEFAULT"
		if sub.PlanName != nil && *sub.PlanName != "" {
			groupName = *sub.PlanName
		}
		for _, acc := range sub.AccessAccounts {
			if err := s.radiusSvc.RestoreUser(ctx, acc.Identity, groupName); err != nil {
				s.logger.Warn("failed to restore access account in FreeRADIUS", "identity", acc.Identity, "error", err)
			}
		}
	}

	sub.Status = StatusActive
	sub.NextBillingDate = &newNextBilling
	sub.EndDate = &newNextBilling
	s.logger.Info("subscription validity extended on payment (rolling model)",
		"subscription_id", id,
		"base_date", baseDate.Format("2006-01-02 15:04:05"),
		"new_next_billing", newNextBilling.Format("2006-01-02 15:04:05"),
	)
	return sub, nil
}

// RevertToPending resets a subscription back to PENDING (e.g. accidental activation when physical install is not yet done)
func (s *Service) RevertToPending(ctx context.Context, id uuid.UUID) (*Subscription, error) {
	sub, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if sub == nil {
		return nil, apperrors.NotFound("Subscription")
	}

	if err := s.repo.RevertToPending(ctx, id); err != nil {
		return nil, apperrors.Internal(err)
	}

	_ = s.repo.UpdateAccessAccountsBySubscriptionID(ctx, id, AccessAccountPending)

	// Isolate/disable in FreeRADIUS so connection cannot authenticate while still pending
	if s.radiusSvc != nil {
		for _, acc := range sub.AccessAccounts {
			if err := s.radiusSvc.IsolateUser(ctx, acc.Identity); err != nil {
				s.logger.Warn("failed to isolate access account on revert pending", "identity", acc.Identity, "error", err)
			}
		}
	}

	sub.Status = StatusPending
	sub.StartDate = nil
	sub.NextBillingDate = nil
	s.logger.Info("subscription reverted back to PENDING", "subscription_id", id)
	return sub, nil
}

func (s *Service) ChangePlan(ctx context.Context, id uuid.UUID, req ChangePlanRequest) (*Subscription, error) {
	sub, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if sub == nil {
		return nil, apperrors.NotFound("Subscription")
	}

	targetPlan, err := s.planRepo.GetByID(ctx, req.PlanID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if targetPlan == nil {
		return nil, apperrors.NotFound("Plan")
	}
	if targetPlan.Status != plan.StatusActive {
		return nil, apperrors.BadRequest("Paket baru tidak dalam status aktif")
	}

	currentPrice, err := s.planRepo.GetCurrentPrice(ctx, req.PlanID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if currentPrice == nil {
		return nil, apperrors.BadRequest("Paket baru belum memiliki harga aktif")
	}

	if err := s.repo.UpdatePlan(ctx, id, req.PlanID, currentPrice.ID); err != nil {
		return nil, apperrors.Internal(err)
	}

	// Update FreeRADIUS bandwidth group immediately if active
	if sub.Status == StatusActive && s.radiusSvc != nil {
		for _, acc := range sub.AccessAccounts {
			if err := s.radiusSvc.RestoreUser(ctx, acc.Identity, targetPlan.Name); err != nil {
				s.logger.Warn("failed to update access account in FreeRADIUS for plan change", "identity", acc.Identity, "error", err)
			}
		}
	}

	s.logger.Info("subscription plan changed & synced to FreeRADIUS",
		"subscription_id", id,
		"new_plan_id", req.PlanID,
		"new_plan_name", targetPlan.Name,
	)

	return s.repo.GetByID(ctx, id)
}

func (s *Service) Cancel(ctx context.Context, id uuid.UUID, reason string) (*Subscription, error) {
	sub, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if sub == nil {
		return nil, apperrors.NotFound("Subscription")
	}

	if err := s.repo.Cancel(ctx, id, reason); err != nil {
		return nil, apperrors.Internal(err)
	}

	_ = s.repo.UpdateAccessAccountsBySubscriptionID(ctx, id, AccessAccountDisabled)

	// FreeRADIUS Deletion & Disconnect
	if s.radiusSvc != nil {
		for _, acc := range sub.AccessAccounts {
			_ = s.radiusSvc.DeleteCredential(ctx, acc.Identity)
			_ = s.radiusSvc.DisconnectUserSessions(ctx, acc.Identity)
		}
	}

	sub.Status = StatusCancelled
	s.logger.Info("subscription cancelled & removed from FreeRADIUS", "subscription_id", id, "reason", reason)
	return sub, nil
}

// Access Account Service Methods

func (s *Service) CreateAccessAccount(ctx context.Context, req CreateAccessAccountRequest) (*AccessAccount, error) {
	cust, err := s.customerRepo.GetByID(ctx, req.CustomerID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if cust == nil {
		return nil, apperrors.NotFound("Customer")
	}

	hash, err := crypto.HashPassword(req.Password)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	limit := req.SimultaneousUseLimit
	if limit <= 0 {
		limit = 1
	}

	now := time.Now()
	acc := &AccessAccount{
		ID:                   uuid.New(),
		CustomerID:           req.CustomerID,
		SubscriptionID:       req.SubscriptionID,
		AccessType:           req.AccessType,
		Identity:             req.Identity,
		PasswordHash:         &hash,
		DisplayName:          req.DisplayName,
		Status:               AccessAccountActive,
		StaticIP:             req.StaticIP,
		SimultaneousUseLimit: limit,
		Notes:                req.Notes,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	if err := s.repo.CreateAccessAccount(ctx, acc); err != nil {
		s.logger.Error("failed to create access account", "error", err)
		return nil, apperrors.Internal(err)
	}

	if s.radiusSvc != nil {
		groupName := "DEFAULT"
		if req.SubscriptionID != nil {
			if sub, _ := s.repo.GetByID(ctx, *req.SubscriptionID); sub != nil && sub.PlanName != nil {
				groupName = *sub.PlanName
			}
		}
		staticIP := ""
		if req.StaticIP != nil {
			staticIP = *req.StaticIP
		}
		_ = s.radiusSvc.SyncCredentialWithIP(ctx, req.Identity, req.Password, groupName, staticIP)
	}

	return acc, nil
}

func (s *Service) ListAccessAccounts(ctx context.Context, params pagination.Params, customerID *uuid.UUID, accessType string) ([]AccessAccount, pagination.Meta, error) {
	accs, total, err := s.repo.ListAccessAccounts(ctx, params, customerID, accessType)
	if err != nil {
		return nil, pagination.Meta{}, apperrors.Internal(err)
	}
	meta := pagination.NewMeta(params, total)
	return accs, meta, nil
}

func (s *Service) UpdateAccessAccountStatus(ctx context.Context, id uuid.UUID, status AccessAccountStatus) error {
	return s.repo.UpdateAccessAccountStatus(ctx, id, status)
}

func (s *Service) UpdateAccessAccountIP(ctx context.Context, id uuid.UUID, staticIP *string, disconnectSession bool) (*AccessAccount, error) {
	acc, err := s.repo.GetAccessAccountByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if acc == nil {
		return nil, apperrors.NotFound("AccessAccount")
	}

	updatedAcc, err := s.repo.UpdateAccessAccountIP(ctx, id, staticIP)
	if err != nil {
		s.logger.Error("failed to update access account ip", "id", id, "error", err)
		return nil, apperrors.Internal(err)
	}

	if s.radiusSvc != nil {
		ipVal := ""
		if staticIP != nil {
			ipVal = *staticIP
		}
		groupName := "DEFAULT"
		if acc.SubscriptionID != nil {
			if sub, _ := s.repo.GetByID(ctx, *acc.SubscriptionID); sub != nil && sub.PlanName != nil {
				groupName = *sub.PlanName
			}
		}
		pwd := ""
		if acc.Password != nil {
			pwd = *acc.Password
		}
		_ = s.radiusSvc.SyncCredentialWithIP(ctx, acc.Identity, pwd, groupName, ipVal)

		if disconnectSession {
			_ = s.radiusSvc.DisconnectUserSessions(ctx, acc.Identity)
		}
	}

	if s.ipamSync != nil {
		oldIP := ""
		if acc.StaticIP != nil {
			oldIP = *acc.StaticIP
		}
		newIP := ""
		if staticIP != nil {
			newIP = *staticIP
		}
		custName := "Pelanggan"
		if acc.SubscriptionID != nil {
			if sub, _ := s.repo.GetByID(ctx, *acc.SubscriptionID); sub != nil && sub.CustomerName != nil {
				custName = *sub.CustomerName
			}
		}
		if err := s.ipamSync.SyncAddressAllocation(ctx, oldIP, newIP, acc.Identity, custName); err != nil {
			s.logger.Warn("failed to sync ipam address allocation on update", "error", err, "ip", newIP, "username", acc.Identity)
		}
	}

	return updatedAcc, nil
}

func calculateNextBillingDate(from time.Time, cycle plan.BillingCycle) time.Time {
	switch cycle {
	case plan.BillingCycleDaily:
		return from.AddDate(0, 0, 1)
	case plan.BillingCycleWeekly:
		return from.AddDate(0, 0, 7)
	case plan.BillingCycleQuarterly:
		return from.AddDate(0, 3, 0)
	case plan.BillingCycleAnnual:
		return from.AddDate(1, 0, 0)
	case plan.BillingCycleMonthly, plan.BillingCyclePrepaid:
		fallthrough
	default:
		return from.AddDate(0, 1, 0)
	}
}
