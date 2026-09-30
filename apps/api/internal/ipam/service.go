package ipam

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/gigabill/isp/internal/shared/errors"
)

type Service struct {
	db     *pgxpool.Pool
	logger *slog.Logger
}

func NewService(db *pgxpool.Pool, logger *slog.Logger) *Service {
	return &Service{
		db:     db,
		logger: logger,
	}
}

func (s *Service) GetSettings(ctx context.Context) (*IPAMSettings, error) {
	const query = `SELECT value, updated_at FROM app_settings WHERE key = 'ipam_settings'`
	var valBytes []byte
	var updatedAt time.Time
	err := s.db.QueryRow(ctx, query).Scan(&valBytes, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &IPAMSettings{
				Enabled:         true,
				ServerURL:       "",
				AppID:           "gigabill",
				AppCode:         "",
				DefaultSubnetID: 0,
				AutoSync:        true,
			}, nil
		}
		return nil, apperrors.Internal(err)
	}

	var res IPAMSettings
	if err := json.Unmarshal(valBytes, &res); err != nil {
		return nil, apperrors.Internal(err)
	}
	res.UpdatedAt = updatedAt
	return &res, nil
}

func (s *Service) SaveSettings(ctx context.Context, input *IPAMSettings) (*IPAMSettings, error) {
	valBytes, err := json.Marshal(input)
	if err != nil {
		return nil, apperrors.Internal(fmt.Errorf("marshal ipam settings: %w", err))
	}

	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ('ipam_settings', $1, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	if _, err := s.db.Exec(ctx, query, valBytes); err != nil {
		return nil, apperrors.Internal(fmt.Errorf("save ipam settings: %w", err))
	}

	return s.GetSettings(ctx)
}

func (s *Service) getClient(ctx context.Context) (*Client, *IPAMSettings, error) {
	settings, err := s.GetSettings(ctx)
	if err != nil {
		return nil, nil, err
	}

	if settings.ServerURL == "" || settings.AppID == "" {
		return nil, settings, apperrors.BadRequest("Konfigurasi URL Server atau App ID phpIPAM belum diisi di menu Pengaturan Sistem > phpIPAM")
	}

	client := NewClient(settings.ServerURL, settings.AppID, settings.AppCode, s.logger)
	return client, settings, nil
}

func (s *Service) TestConnection(ctx context.Context, customSettings *IPAMSettings) (*TestResult, error) {
	var client *Client
	if customSettings != nil && customSettings.ServerURL != "" {
		client = NewClient(customSettings.ServerURL, customSettings.AppID, customSettings.AppCode, s.logger)
	} else {
		var err error
		client, _, err = s.getClient(ctx)
		if err != nil {
			return &TestResult{Success: false, Message: err.Error()}, nil
		}
	}

	return client.TestConnection(ctx)
}

func (s *Service) GetSubnets(ctx context.Context) ([]Subnet, error) {
	client, _, err := s.getClient(ctx)
	if err != nil {
		return nil, err
	}

	subnets, err := client.GetSubnets(ctx)
	if err != nil {
		return nil, apperrors.BadRequest(fmt.Sprintf("Gagal menarik subnet dari phpIPAM: %s", err.Error()))
	}

	return subnets, nil
}

func (s *Service) GetFirstFreeIP(ctx context.Context, subnetID int) (*FirstFreeResponse, error) {
	client, settings, err := s.getClient(ctx)
	if err != nil {
		return nil, err
	}

	targetSubnetID := subnetID
	if targetSubnetID <= 0 {
		targetSubnetID = settings.DefaultSubnetID
	}

	if targetSubnetID <= 0 {
		// Auto-discover the first subnet from phpIPAM
		subnets, subErr := client.GetSubnets(ctx)
		if subErr == nil && len(subnets) > 0 {
			targetSubnetID = subnets[0].ID
		} else {
			return nil, apperrors.BadRequest("Subnet belum dipilih. Silakan pilih Subnet Default pada menu Pengaturan Sistem > phpIPAM")
		}
	}

	ip, err := client.GetFirstFreeIP(ctx, targetSubnetID)
	if err != nil {
		return nil, apperrors.BadRequest(fmt.Sprintf("Gagal mendapatkan IP dari phpIPAM: %s", err.Error()))
	}

	return &FirstFreeResponse{
		SubnetID: targetSubnetID,
		IP:       ip,
	}, nil
}

func (s *Service) SyncAddressAllocation(ctx context.Context, oldIP, newIP, username, customerName string) error {
	client, settings, err := s.getClient(ctx)
	if err != nil {
		// If not configured or not enabled, ignore safely
		return nil
	}

	if !settings.AutoSync {
		return nil
	}

	// 1. If old IP existed and changed, release it
	if oldIP != "" && oldIP != newIP {
		s.logger.Info("releasing ipam address", "ip", oldIP)
		if err := client.ReleaseAddress(ctx, oldIP, settings.DefaultSubnetID); err != nil {
			s.logger.Warn("failed to release ipam address", "ip", oldIP, "error", err)
		}
	}

	// 2. If new IP assigned, record it in phpIPAM
	if newIP != "" {
		desc := fmt.Sprintf("PPPoE: %s (%s)", username, customerName)
		s.logger.Info("assigning ipam address", "ip", newIP, "subnet_id", settings.DefaultSubnetID)
		if err := client.AssignAddress(ctx, settings.DefaultSubnetID, newIP, username, desc); err != nil {
			s.logger.Warn("failed to assign ipam address", "ip", newIP, "error", err)
			return err
		}
	}

	return nil
}
