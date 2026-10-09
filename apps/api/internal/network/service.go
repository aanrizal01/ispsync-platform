package network

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/radius"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
)

type Service struct {
	repo      *Repository
	radiusSvc *radius.Service
	logger    *slog.Logger
}

func NewService(repo *Repository, radiusSvc *radius.Service, logger *slog.Logger) *Service {
	return &Service{
		repo:      repo,
		radiusSvc: radiusSvc,
		logger:    logger,
	}
}

func (s *Service) CreateDevice(ctx context.Context, tenantSlug string, req CreateDeviceRequest) (*Device, error) {
	if tenantSlug == "" {
		tenantSlug = "dev"
	}
	now := time.Now()
	dev := &Device{
		ID:                uuid.New(),
		TenantSlug:        tenantSlug,
		Name:              req.Name,
		Vendor:            req.Vendor,
		Model:             req.Model,
		IPAddress:         req.IPAddress,
		APIPort:           req.APIPort,
		AuthType:          req.AuthType,
		Username:          req.Username,
		PasswordEncrypted: req.Password, // Can be encrypted with KMS/AES-GCM in prod
		UseTLS:            req.UseTLS,
		IsActive:          true,
		Status:            StatusUnknown,
		Metadata:          req.Metadata,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := s.repo.Create(ctx, dev); err != nil {
		s.logger.Error("failed to create network device", "error", err)
		return nil, apperrors.Internal(err)
	}

	// Auto-register to FreeRADIUS NAS if requested
	if req.EnableRadius && s.radiusSvc != nil {
		secret := "testing123"
		if req.RadiusSharedSecret != nil && *req.RadiusSharedSecret != "" {
			secret = *req.RadiusSharedSecret
		}
		nasType := "other"
		if req.Vendor == VendorMikroTik {
			nasType = "mikrotik"
		} else if req.Vendor == VendorJuniper {
			nasType = "juniper"
		}

		desc := fmt.Sprintf("Auto-created from Network Device %s", dev.Name)
		_, err := s.radiusSvc.CreateNAS(ctx, dev.TenantSlug, radius.CreateNASRequest{
			NasName:     dev.IPAddress,
			ShortName:   &dev.Name,
			Type:        nasType,
			Secret:      secret,
			Description: &desc,
			TenantSlug:  dev.TenantSlug,
		})
		if err != nil {
			s.logger.Warn("network device created but failed to auto-register NAS", "error", err)
		} else {
			s.logger.Info("network device auto-registered to FreeRADIUS NAS", "nasname", dev.IPAddress)
		}
	}

	s.logger.Info("network device created", "id", dev.ID, "name", dev.Name, "vendor", dev.Vendor)
	return dev, nil
}


func (s *Service) GetDevice(ctx context.Context, tenantSlug string, id uuid.UUID) (*Device, error) {
	dev, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if dev == nil {
		return nil, apperrors.NotFound("Network device tidak ditemukan")
	}
	if tenantSlug != "" && tenantSlug != "superadmin" && dev.TenantSlug != "" && dev.TenantSlug != tenantSlug {
		return nil, apperrors.NotFound("Network device tidak ditemukan")
	}
	return dev, nil
}

func (s *Service) ListDevices(ctx context.Context, tenantSlug string, vendor *Vendor, isActive *bool) ([]Device, error) {
	return s.repo.List(ctx, tenantSlug, vendor, isActive)
}

func (s *Service) UpdateDevice(ctx context.Context, tenantSlug string, id uuid.UUID, req UpdateDeviceRequest) (*Device, error) {
	dev, err := s.GetDevice(ctx, tenantSlug, id)
	if err != nil {
		return nil, err
	}

	dev.Name = req.Name
	dev.Model = req.Model
	dev.IPAddress = req.IPAddress
	dev.APIPort = req.APIPort
	dev.Username = req.Username
	if req.Password != nil && *req.Password != "" {
		dev.PasswordEncrypted = *req.Password
	}
	dev.UseTLS = req.UseTLS
	dev.IsActive = req.IsActive
	if req.Metadata != nil {
		dev.Metadata = req.Metadata
	}
	dev.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, dev); err != nil {
		return nil, apperrors.Internal(err)
	}

	return dev, nil
}

func (s *Service) DeleteDevice(ctx context.Context, tenantSlug string, id uuid.UUID) error {
	_, err := s.GetDevice(ctx, tenantSlug, id)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, id)
}

func (s *Service) GetAdapter(dev *Device) (DeviceAdapter, error) {
	switch dev.Vendor {
	case VendorMikroTik:
		return NewMikroTikAdapter(dev.IPAddress, dev.APIPort, dev.Username, dev.PasswordEncrypted, dev.UseTLS), nil
	case VendorJuniper:
		return NewJuniperAdapter(dev.IPAddress, dev.APIPort, dev.Username, dev.PasswordEncrypted, dev.UseTLS), nil
	default:
		return nil, fmt.Errorf("vendor %s belum didukung", dev.Vendor)
	}
}

func (s *Service) TestConnection(ctx context.Context, tenantSlug string, id uuid.UUID) (*TestConnectionResponse, error) {
	dev, err := s.GetDevice(ctx, tenantSlug, id)
	if err != nil {
		return nil, err
	}

	adapter, err := s.GetAdapter(dev)
	if err != nil {
		return &TestConnectionResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	start := time.Now()
	pingErr := adapter.Ping(ctx)
	latency := time.Since(start).Milliseconds()

	now := time.Now()
	logEntry := &DeviceLog{
		ID:         uuid.New(),
		DeviceID:   dev.ID,
		Action:     "TEST_CONNECTION",
		ExecutedAt: now,
	}

	if pingErr != nil {
		_ = s.repo.UpdateStatus(ctx, dev.ID, StatusOffline, nil)
		logEntry.Status = "FAILED"
		detail := pingErr.Error()
		logEntry.Details = &detail
		_ = s.repo.AddLog(ctx, logEntry)

		return &TestConnectionResponse{
			Success:   false,
			Message:   fmt.Sprintf("Koneksi gagal: %v", pingErr),
			LatencyMS: latency,
		}, nil
	}

	sysInfo, _ := adapter.GetSystemInfo(ctx)
	detectedModel := ""
	if sysInfo != nil && sysInfo.BoardName != "" {
		if sysInfo.Version != "" {
			detectedModel = fmt.Sprintf("%s (ROS %s)", sysInfo.BoardName, sysInfo.Version)
		} else {
			detectedModel = sysInfo.BoardName
		}
	}
	_ = s.repo.UpdateStatusWithModel(ctx, dev.ID, StatusOnline, detectedModel, &now)

	logEntry.Status = "SUCCESS"
	detail := fmt.Sprintf("Latency: %dms, CPU: %d%%", latency, func() int {
		if sysInfo != nil {
			return sysInfo.CPULoad
		}
		return 0
	}())
	logEntry.Details = &detail
	_ = s.repo.AddLog(ctx, logEntry)

	return &TestConnectionResponse{
		Success:    true,
		Message:    "Koneksi ke router berhasil terhubung",
		LatencyMS:  latency,
		SystemInfo: sysInfo,
	}, nil
}

func (s *Service) SyncPPPoEProfile(ctx context.Context, tenantSlug string, deviceID uuid.UUID, profile PPPoEProfile) error {
	dev, err := s.GetDevice(ctx, tenantSlug, deviceID)
	if err != nil {
		return err
	}

	adapter, err := s.GetAdapter(dev)
	if err != nil {
		return err
	}

	return adapter.SyncPPPoEProfile(ctx, profile)
}

func (s *Service) SetSimpleQueue(ctx context.Context, tenantSlug string, deviceID uuid.UUID, queue SimpleQueue) error {
	dev, err := s.GetDevice(ctx, tenantSlug, deviceID)
	if err != nil {
		return err
	}

	adapter, err := s.GetAdapter(dev)
	if err != nil {
		return err
	}

	return adapter.SetSimpleQueue(ctx, queue)
}

func (s *Service) ListLogs(ctx context.Context, tenantSlug string, deviceID uuid.UUID, limit int) ([]DeviceLog, error) {
	if _, err := s.GetDevice(ctx, tenantSlug, deviceID); err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 20
	}
	return s.repo.ListLogs(ctx, deviceID, limit)
}

func (s *Service) ListODPs(ctx context.Context, cluster string) ([]ODPNode, error) {
	return s.repo.ListODPNodes(ctx, cluster)
}

func (s *Service) CreateODP(ctx context.Context, req CreateODPRequest) (*ODPNode, error) {
	return s.repo.CreateODPNode(ctx, req)
}

func (s *Service) DeleteODP(ctx context.Context, id string) error {
	return s.repo.DeleteODPNode(ctx, id)
}

func (s *Service) ListFiberRoutes(ctx context.Context) ([]FiberRoute, error) {
	return s.repo.ListFiberRoutes(ctx)
}

func (s *Service) GetFTTXStats(ctx context.Context) (*FTTXStats, error) {
	return s.repo.GetFTTXStats(ctx)
}

