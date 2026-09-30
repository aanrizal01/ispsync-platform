package acs

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
)

type Service struct {
	repo        *Repository
	genieClient *GenieClient
	logger      *slog.Logger
}

func NewService(repo *Repository, genieClient *GenieClient, logger *slog.Logger) *Service {
	return &Service{
		repo:        repo,
		genieClient: genieClient,
		logger:      logger,
	}
}

func (s *Service) ListONTs(ctx context.Context) ([]CustomerONT, error) {
	return s.repo.ListONTs(ctx)
}

func (s *Service) GetONT(ctx context.Context, id uuid.UUID) (*CustomerONT, error) {
	ont, err := s.repo.GetONTByID(ctx, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if ont == nil {
		return nil, apperrors.NotFound("ONT")
	}
	return ont, nil
}

func (s *Service) GetONTByCustomerID(ctx context.Context, customerID uuid.UUID) (*CustomerONT, error) {
	ont, err := s.repo.GetONTByCustomerID(ctx, customerID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if ont == nil {
		return nil, apperrors.NotFound("Customer ONT")
	}
	return ont, nil
}

func (s *Service) UpdateWiFi(ctx context.Context, id uuid.UUID, ssid, password string) error {
	if ssid == "" {
		return apperrors.BadRequest("Nama WiFi tidak boleh kosong")
	}
	if len(password) < 8 {
		return apperrors.BadRequest("Kata sandi WiFi minimal 8 karakter")
	}

	ont, err := s.repo.GetONTByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if ont == nil {
		return apperrors.NotFound("ONT")
	}

	// 1. Update Database
	if err := s.repo.UpdateWiFi(ctx, id, ssid, password); err != nil {
		return apperrors.Internal(err)
	}

	// 2. Push TR-069 task to GenieACS
	go func() {
		bgCtx := context.Background()
		if err := s.genieClient.PushWiFiConfiguration(bgCtx, ont.SerialNumber, ont.Vendor, ssid, password); err != nil {
			s.logger.Error("failed to push TR-069 wifi config to GenieACS", "sn", ont.SerialNumber, "err", err)
		} else {
			s.logger.Info("TR-069 WiFi update successfully dispatched", "sn", ont.SerialNumber, "ssid", ssid)
		}
	}()

	return nil
}

func (s *Service) RebootONT(ctx context.Context, id uuid.UUID) error {
	ont, err := s.repo.GetONTByID(ctx, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if ont == nil {
		return apperrors.NotFound("ONT")
	}

	// Push TR-069 RPC Reboot task to GenieACS
	go func() {
		bgCtx := context.Background()
		if err := s.genieClient.RebootONT(bgCtx, ont.SerialNumber); err != nil {
			s.logger.Error("failed to push TR-069 reboot to GenieACS", "sn", ont.SerialNumber, "err", err)
		} else {
			s.logger.Info("TR-069 reboot successfully dispatched", "sn", ont.SerialNumber)
		}
	}()

	return nil
}

func (s *Service) RegisterONT(ctx context.Context, req RegisterONTRequest) (*CustomerONT, error) {
	if req.SerialNumber == "" {
		return nil, apperrors.BadRequest("Serial number wajib diisi")
	}
	if req.WiFiSSID == "" {
		req.WiFiSSID = "GigaNet-" + req.SerialNumber[len(req.SerialNumber)-4:]
	}
	if req.WiFiPassword == "" {
		req.WiFiPassword = "internet123"
	}

	ont, err := s.repo.CreateONT(ctx, req)
	if err != nil {
		return nil, apperrors.Internal(fmt.Errorf("failed to register ont: %w", err))
	}
	return ont, nil
}

func (s *Service) CheckStatus(ctx context.Context) (map[string]interface{}, error) {
	err := s.genieClient.Ping(ctx)
	isOnline := err == nil
	statusMsg := "Terhubung ke FTTX Command Center Engine (Port 8082)"
	if !isOnline {
		statusMsg = err.Error()
	}

	return map[string]interface{}{
		"base_url":   s.genieClient.GetBaseURL(),
		"is_online":  isOnline,
		"status":     statusMsg,
		"checked_at": time.Now().UTC().Format(time.RFC3339),
	}, nil
}
