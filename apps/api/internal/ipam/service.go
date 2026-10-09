package ipam

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gigabill/isp/internal/auth"
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

func resolveTenantSlugFromContext(ctx context.Context) string {
	claims := auth.ClaimsFromContext(ctx)
	if claims != nil {
		if claims.TenantSlug != "" {
			return strings.ToLower(claims.TenantSlug)
		}
		if claims.Email != "" {
			email := strings.ToLower(claims.Email)
			if atIdx := strings.Index(email, "@"); atIdx != -1 {
				domainPart := email[atIdx+1:]
				parts := strings.Split(domainPart, ".")
				if len(parts) >= 3 && parts[len(parts)-2] == "ispsync" && parts[len(parts)-1] == "id" {
					slug := parts[0]
					if slug != "admin" && slug != "private" && slug != "member" {
						return slug
					}
				}
			}
		}
	}
	return "dev"
}

func (s *Service) GetSettings(ctx context.Context, tenantSlug ...string) (*IPAMSettings, error) {
	slug := ""
	if len(tenantSlug) > 0 {
		slug = strings.ToLower(strings.TrimSpace(tenantSlug[0]))
	}
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	if slug == "" || slug == "dev" {
		var valBytes []byte
		var updatedAt time.Time
		err := s.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = 'ipam_settings_dev'").Scan(&valBytes, &updatedAt)
		if err != nil && errors.Is(err, pgx.ErrNoRows) {
			err = s.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = 'ipam_settings'").Scan(&valBytes, &updatedAt)
		}
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

	key := "ipam_settings_" + slug
	var valBytes []byte
	var updatedAt time.Time
	err := s.db.QueryRow(ctx, "SELECT value, updated_at FROM app_settings WHERE key = $1", key).Scan(&valBytes, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &IPAMSettings{
				Enabled:         false,
				ServerURL:       "",
				AppID:           "",
				AppCode:         "",
				DefaultSubnetID: 0,
				AutoSync:        false,
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

func (s *Service) SaveSettings(ctx context.Context, tenantSlug string, input *IPAMSettings) (*IPAMSettings, error) {
	valBytes, err := json.Marshal(input)
	if err != nil {
		return nil, apperrors.Internal(fmt.Errorf("marshal ipam settings: %w", err))
	}

	slug := strings.ToLower(strings.TrimSpace(tenantSlug))
	if slug == "" {
		slug = resolveTenantSlugFromContext(ctx)
	}

	if slug == "" || slug == "dev" {
		const query = `
			INSERT INTO app_settings (key, value, updated_at)
			VALUES ($1, $2, NOW())
			ON CONFLICT (key) DO UPDATE
			SET value = EXCLUDED.value, updated_at = NOW()
		`
		if _, err := s.db.Exec(ctx, query, "ipam_settings_dev", valBytes); err != nil {
			return nil, apperrors.Internal(fmt.Errorf("save ipam settings dev: %w", err))
		}
		if _, err := s.db.Exec(ctx, query, "ipam_settings", valBytes); err != nil {
			return nil, apperrors.Internal(fmt.Errorf("save ipam settings: %w", err))
		}
		return s.GetSettings(ctx, "dev")
	}

	key := "ipam_settings_" + slug
	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	if _, err := s.db.Exec(ctx, query, key, valBytes); err != nil {
		return nil, apperrors.Internal(fmt.Errorf("save ipam settings: %w", err))
	}

	return s.GetSettings(ctx, slug)
}

func (s *Service) getClient(ctx context.Context, tenantSlug ...string) (*Client, *IPAMSettings, error) {
	settings, err := s.GetSettings(ctx, tenantSlug...)
	if err != nil {
		return nil, nil, err
	}

	if settings.ServerURL == "" || settings.AppID == "" {
		return nil, settings, apperrors.BadRequest("Konfigurasi URL Server atau App ID phpIPAM belum diisi di menu Pengaturan Sistem > phpIPAM")
	}

	client := NewClient(settings.ServerURL, settings.AppID, settings.AppCode, s.logger)
	return client, settings, nil
}

func (s *Service) TestConnection(ctx context.Context, tenantSlug string, customSettings *IPAMSettings) (*TestResult, error) {
	var client *Client
	if customSettings != nil && customSettings.ServerURL != "" {
		client = NewClient(customSettings.ServerURL, customSettings.AppID, customSettings.AppCode, s.logger)
	} else {
		var err error
		client, _, err = s.getClient(ctx, tenantSlug)
		if err != nil {
			return &TestResult{Success: false, Message: err.Error()}, nil
		}
	}

	return client.TestConnection(ctx)
}

func (s *Service) GetSubnets(ctx context.Context, tenantSlug ...string) ([]Subnet, error) {
	client, _, err := s.getClient(ctx, tenantSlug...)
	if err != nil {
		return nil, err
	}

	subnets, err := client.GetSubnets(ctx)
	if err != nil {
		return nil, apperrors.BadRequest(fmt.Sprintf("Gagal menarik subnet dari phpIPAM: %s", err.Error()))
	}

	return subnets, nil
}

func (s *Service) GetFirstFreeIP(ctx context.Context, subnetID int, tenantSlug ...string) (*FirstFreeResponse, error) {
	client, settings, err := s.getClient(ctx, tenantSlug...)
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
