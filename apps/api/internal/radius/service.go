package radius

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/pagination"
)

type Service struct {
	repo   *Repository
	logger *slog.Logger
}

func NewService(repo *Repository, logger *slog.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

func (s *Service) ListActiveSessions(ctx context.Context, tenantSlug string, params pagination.Params, search string) ([]Session, pagination.Meta, error) {
	sessions, total, err := s.repo.ListActiveSessions(ctx, tenantSlug, params, search)
	if err != nil {
		return nil, pagination.Meta{}, apperrors.Internal(err)
	}
	meta := pagination.NewMeta(params, total)
	return sessions, meta, nil
}

func (s *Service) DisconnectSession(ctx context.Context, req DisconnectSessionRequest) error {
	// Lookup NAS shared secret
	secret := "testing123"
	nas, err := s.repo.GetNASByIP(ctx, "", req.NasIPAddress)
	if err != nil {
		return apperrors.Internal(err)
	}
	if nas != nil && nas.Secret != "" {
		secret = nas.Secret
	} else {
		s.logger.Warn("NAS not registered or has no secret for CoA disconnect, using default", "nas_ip", req.NasIPAddress)
	}

	// Dispatch RFC 3576 / RFC 5176 Disconnect-Request Packet to UDP port 3799 asynchronously
	go func(targetIP, sec, user, sessID string) {
		if err := SendRFC3576Disconnect(targetIP, DefaultCoAPort, sec, user, sessID, "", 3*time.Second); err != nil {
			s.logger.Warn("RFC 3576 CoA disconnect UDP delivery warning", "nas_ip", targetIP, "user", user, "error", err)
		}
	}(req.NasIPAddress, secret, req.Username, req.AcctSessionID)

	// Mark session as terminated in radius_sessions
	if err := s.repo.MarkSessionTerminated(ctx, req.AcctSessionID, req.Username); err != nil {
		s.logger.Error("failed to mark session terminated in db", "error", err)
	}

	s.logger.Info("CoA disconnect request dispatched",
		"nas_ip", req.NasIPAddress,
		"username", req.Username,
		"session_id", req.AcctSessionID,
	)
	return nil
}

func (s *Service) CreateNAS(ctx context.Context, tenantSlug string, req CreateNASRequest) (*NAS, error) {
	if req.TenantSlug != "" {
		tenantSlug = req.TenantSlug
	}
	if tenantSlug == "" {
		tenantSlug = "dev"
	}

	nas := &NAS{
		NasName:     req.NasName,
		ShortName:   req.ShortName,
		Type:        req.Type,
		Secret:      req.Secret,
		Description: req.Description,
		TenantSlug:  tenantSlug,
		CreatedAt:   time.Now(),
	}

	if err := s.repo.CreateNAS(ctx, nas); err != nil {
		s.logger.Error("failed to create NAS", "error", err)
		return nil, apperrors.Internal(err)
	}

	s.logger.Info("new NAS registered", "nasname", nas.NasName, "type", nas.Type, "tenant", nas.TenantSlug)
	return nas, nil
}

func (s *Service) ListNAS(ctx context.Context, tenantSlug string) ([]NAS, error) {
	return s.repo.ListNAS(ctx, tenantSlug)
}

func (s *Service) DeleteNAS(ctx context.Context, tenantSlug string, id int) error {
	return s.repo.DeleteNAS(ctx, tenantSlug, id)
}

func (s *Service) SyncCredential(ctx context.Context, username, password, groupname string) error {
	return s.repo.SyncUserCredential(ctx, username, password, groupname)
}

func (s *Service) SyncCredentialWithIP(ctx context.Context, username, password, groupname, staticIP string) error {
	return s.repo.SyncUserCredentialWithIP(ctx, username, password, groupname, staticIP)
}

func (s *Service) SyncPasspointCredential(ctx context.Context, username, password, speedLimit string, simultaneousUse int) error {
	return s.repo.SyncPasspointUser(ctx, username, password, speedLimit, simultaneousUse)
}

func (s *Service) DeleteCredential(ctx context.Context, username string) error {
	return s.repo.DeleteUserCredential(ctx, username)
}

func (s *Service) ListAuthLogs(ctx context.Context, tenantSlug string, params pagination.Params, search string) ([]AuthLog, pagination.Meta, error) {
	logs, total, err := s.repo.ListAuthLogs(ctx, tenantSlug, params, search)
	if err != nil {
		return nil, pagination.Meta{}, apperrors.Internal(err)
	}
	meta := pagination.NewMeta(params, total)
	return logs, meta, nil
}

// DisconnectUserSessions terminates all active RADIUS sessions for a specific username via CoA Disconnect.
func (s *Service) DisconnectUserSessions(ctx context.Context, username string) error {
	sessions, err := s.repo.GetActiveSessionsByUsername(ctx, username)
	if err != nil {
		return fmt.Errorf("get active sessions for %s: %w", username, err)
	}

	for _, sess := range sessions {
		req := DisconnectSessionRequest{
			NasIPAddress:  sess.NasIPAddress,
			Username:      sess.Username,
			AcctSessionID: sess.AcctSessionID,
		}
		if err := s.DisconnectSession(ctx, req); err != nil {
			s.logger.Warn("failed to send CoA disconnect for session", "user", username, "session_id", sess.AcctSessionID, "error", err)
		}
	}
	return nil
}

// IsolateUser switches the subscriber's radusergroup to ISOLIR and dispatches CoA disconnect.
func (s *Service) IsolateUser(ctx context.Context, username string) error {
	_ = s.repo.EnsureIsolirGroup(ctx)

	if err := s.repo.SetUserGroup(ctx, username, "ISOLIR"); err != nil {
		return fmt.Errorf("set isolir group: %w", err)
	}

	if err := s.DisconnectUserSessions(ctx, username); err != nil {
		s.logger.Warn("error disconnecting isolated user sessions", "username", username, "error", err)
	}

	s.logger.Info("subscriber isolated in FreeRADIUS", "username", username)
	return nil
}

// RestoreUser switches the subscriber's radusergroup back to active plan profile and resets their connection.
func (s *Service) RestoreUser(ctx context.Context, username, groupname string) error {
	if err := s.repo.SetUserGroup(ctx, username, groupname); err != nil {
		return fmt.Errorf("restore user group to %s: %w", groupname, err)
	}

	if err := s.DisconnectUserSessions(ctx, username); err != nil {
		s.logger.Warn("error resetting user sessions upon restoration", "username", username, "error", err)
	}

	s.logger.Info("subscriber restored in FreeRADIUS", "username", username, "group", groupname)
	return nil
}

// EnsureGroupProfileWithPool configures bandwidth limits (Max and optional Min CIR) and optional Framed-Pool in radgroupreply.
func (s *Service) EnsureGroupProfileWithPool(ctx context.Context, groupname string, downloadKbps, uploadKbps int64, framedPool string, minDownloadKbps, minUploadKbps int64) error {
	return s.repo.UpsertGroupProfile(ctx, groupname, downloadKbps, uploadKbps, framedPool, minDownloadKbps, minUploadKbps)
}

// EnsureGroupProfile configures bandwidth limits for a profile group in radgroupreply.
func (s *Service) EnsureGroupProfile(ctx context.Context, groupname string, downloadKbps, uploadKbps int64) error {
	return s.EnsureGroupProfileWithPool(ctx, groupname, downloadKbps, uploadKbps, "", 0, 0)
}

// SetUserRateLimit sets rate limit directly for an individual username (e.g. voucher) in radreply.
func (s *Service) SetUserRateLimit(ctx context.Context, username string, downloadKbps, uploadKbps, minDownloadKbps, minUploadKbps int64) error {
	return s.repo.SetUserRateLimit(ctx, username, downloadKbps, uploadKbps, minDownloadKbps, minUploadKbps)
}

