package auth

import (
	"context"
	"crypto/rsa"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/pkg/crypto"
)

// Service provides authentication business logic.
type Service struct {
	repo           *Repository
	redis          *redis.Client
	privateKey     *rsa.PrivateKey
	publicKey      *rsa.PublicKey
	accessTokenTTL time.Duration
	refreshTokenTTL time.Duration
	logger         *slog.Logger
}

// NewService creates a new auth service, loading RSA keys from the filesystem.
func NewService(
	repo *Repository,
	rdb *redis.Client,
	privateKeyPath, publicKeyPath string,
	accessTTL, refreshTTL time.Duration,
	logger *slog.Logger,
) (*Service, error) {
	privateKey, err := loadPrivateKey(privateKeyPath)
	if err != nil {
		return nil, fmt.Errorf("load JWT private key: %w", err)
	}

	publicKey, err := loadPublicKey(publicKeyPath)
	if err != nil {
		return nil, fmt.Errorf("load JWT public key: %w", err)
	}

	return &Service{
		repo:            repo,
		redis:           rdb,
		privateKey:      privateKey,
		publicKey:       publicKey,
		accessTokenTTL:  accessTTL,
		refreshTokenTTL: refreshTTL,
		logger:          logger,
	}, nil
}

// Login authenticates a user and returns a token pair.
// Returns AUTH_REQUIRED error for invalid credentials (same error for
// user-not-found and wrong-password to prevent user enumeration).
func (s *Service) Login(ctx context.Context, req LoginRequest) (*Session, error) {
	user, hash, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		// Use constant-time comparison even for non-existent users
		_ = crypto.CheckPassword(req.Password, "$2a$12$dummyhashtopreventtimingattacks")
		return nil, apperrors.Unauthorized("Invalid email or password")
	}

	if !user.IsActive {
		return nil, apperrors.Unauthorized("Account is disabled")
	}

	if err := crypto.CheckPassword(req.Password, hash); err != nil {
		// SECURITY: Do NOT log the provided password
		s.logger.Warn("failed login attempt", "email", req.Email)
		return nil, apperrors.Unauthorized("Invalid email or password")
	}

	session, err := s.issueSession(ctx, user)
	if err != nil {
		return nil, err
	}

	_ = s.repo.UpdateLastLogin(ctx, user.ID) // best-effort, non-critical
	return session, nil
}

// Refresh validates a refresh token and issues a new token pair.
// The old refresh token is revoked (rotation).
func (s *Service) Refresh(ctx context.Context, req RefreshRequest) (*Session, error) {
	claims, err := s.parseToken(req.RefreshToken)
	if err != nil {
		return nil, apperrors.Unauthorized("Invalid or expired refresh token")
	}

	// Check Redis blacklist
	blacklistKey := refreshBlacklistKey(claims.TokenID)
	exists, err := s.redis.Exists(ctx, blacklistKey).Result()
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if exists > 0 {
		return nil, apperrors.Unauthorized("Refresh token has been revoked")
	}

	// Revoke old refresh token
	if err := s.revokeToken(ctx, claims.TokenID, time.Unix(claims.ExpiresAt, 0)); err != nil {
		s.logger.Error("failed to revoke old refresh token", "error", err)
	}

	// Load fresh user data (permissions may have changed)
	user, err := s.repo.GetUserByID(ctx, claims.UserID)
	if err != nil {
		return nil, apperrors.Unauthorized("User not found")
	}
	if !user.IsActive {
		return nil, apperrors.Unauthorized("Account is disabled")
	}

	return s.issueSession(ctx, user)
}

// Logout revokes the refresh token.
func (s *Service) Logout(ctx context.Context, claims *Claims) error {
	return s.revokeToken(ctx, claims.TokenID, time.Unix(claims.ExpiresAt, 0))
}

// GetCurrentUser returns the authenticated user's profile.
func (s *Service) GetCurrentUser(ctx context.Context, userID uuid.UUID) (*User, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, apperrors.NotFound("User")
	}
	return user, nil
}

// ChangePassword validates the current password and sets a new one.
func (s *Service) ChangePassword(ctx context.Context, userID uuid.UUID, req ChangePasswordRequest) error {
	currentHash, err := s.repo.GetPasswordHash(ctx, userID)
	if err != nil {
		return apperrors.Internal(err)
	}

	if err := crypto.CheckPassword(req.CurrentPassword, currentHash); err != nil {
		return apperrors.BadRequest("Current password is incorrect")
	}

	if len(req.NewPassword) < 8 {
		return apperrors.BadRequest("New password must be at least 8 characters")
	}

	newHash, err := crypto.HashPassword(req.NewPassword)
	if err != nil {
		return apperrors.Internal(err)
	}

	return s.repo.UpdatePassword(ctx, userID, newHash)
}

// ValidateAccessToken parses and validates an access token string.
func (s *Service) ValidateAccessToken(tokenStr string) (*Claims, error) {
	claims, err := s.parseToken(tokenStr)
	if err != nil {
		return nil, apperrors.Unauthorized("Invalid or expired access token")
	}
	return claims, nil
}

// ---- private helpers ----

func (s *Service) issueSession(ctx context.Context, user *User) (*Session, error) {
	now := time.Now()
	accessExp := now.Add(s.accessTokenTTL)
	refreshExp := now.Add(s.refreshTokenTTL)

	accessJTI := uuid.New().String()
	refreshJTI := uuid.New().String()

	accessToken, err := s.signToken(Claims{
		UserID:      user.ID,
		Email:       user.Email,
		CustomerID:  user.CustomerID,
		TenantSlug:  user.TenantSlug,
		Permissions: user.Permissions,
		TokenID:     accessJTI,
		IssuedAt:    now.Unix(),
		ExpiresAt:   accessExp.Unix(),
	})
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	refreshToken, err := s.signToken(Claims{
		UserID:     user.ID,
		Email:      user.Email,
		TenantSlug: user.TenantSlug,
		TokenID:    refreshJTI,
		IssuedAt:   now.Unix(),
		ExpiresAt:  refreshExp.Unix(),
	})
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	// Store refresh token JTI in Redis for blacklist checking
	if err := s.redis.Set(ctx, refreshActiveKey(refreshJTI), "1",
		s.refreshTokenTTL).Err(); err != nil {
		s.logger.Error("failed to store refresh token in redis", "error", err)
	}

	return &Session{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    accessExp,
		TokenType:    "Bearer",
	}, nil
}

func (s *Service) signToken(claims Claims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"sub":         claims.UserID.String(),
		"email":       claims.Email,
		"customer_id": claims.CustomerID,
		"tenant_slug": claims.TenantSlug,
		"permissions": claims.Permissions,
		"jti":         claims.TokenID,
		"iat":         claims.IssuedAt,
		"exp":         claims.ExpiresAt,
	})
	return token.SignedString(s.privateKey)
}

func (s *Service) parseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.publicKey, nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}

	mc, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid claims")
	}

	sub, _ := mc["sub"].(string)
	userID, err := uuid.Parse(sub)
	if err != nil {
		return nil, errors.New("invalid subject")
	}

	claims := &Claims{
		UserID:  userID,
		TokenID: fmt.Sprintf("%v", mc["jti"]),
	}

	if email, ok := mc["email"].(string); ok {
		claims.Email = email
	}

	if ts, ok := mc["tenant_slug"].(string); ok {
		claims.TenantSlug = ts
	}

	if perms, ok := mc["permissions"].([]interface{}); ok {
		for _, p := range perms {
			if s, ok := p.(string); ok {
				claims.Permissions = append(claims.Permissions, s)
			}
		}
	}

	if exp, ok := mc["exp"].(float64); ok {
		claims.ExpiresAt = int64(exp)
	}

	if cidStr, ok := mc["customer_id"].(string); ok && cidStr != "" {
		cid, err := uuid.Parse(cidStr)
		if err == nil {
			claims.CustomerID = &cid
		}
	}

	return claims, nil
}

func (s *Service) revokeToken(ctx context.Context, jti string, exp time.Time) error {
	ttl := time.Until(exp)
	if ttl <= 0 {
		return nil // already expired, no need to blacklist
	}
	return s.redis.Set(ctx, refreshBlacklistKey(jti), "1", ttl).Err()
}

func refreshBlacklistKey(jti string) string { return "auth:blacklist:" + jti }
func refreshActiveKey(jti string) string    { return "auth:refresh:" + jti }

// ---- RSA key loading ----

func loadPrivateKey(path string) (*rsa.PrivateKey, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	key, err := jwt.ParseRSAPrivateKeyFromPEM(b)
	if err != nil {
		return nil, err
	}
	return key, nil
}

func loadPublicKey(path string) (*rsa.PublicKey, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	key, err := jwt.ParseRSAPublicKeyFromPEM(b)
	if err != nil {
		return nil, err
	}
	return key, nil
}

// ListUsers returns users filtered by search query or role scoped by tenant.
// If caller is not root (private@ispsync.id), root account is shielded from results.
func (s *Service) ListUsers(ctx context.Context, search, roleSlug, callerEmail, tenantSlug string) ([]UserListItem, error) {
	return s.repo.ListUsers(ctx, search, roleSlug, callerEmail, tenantSlug)
}

// CreateUser creates a new system/staff user scoped to tenantSlug.
func (s *Service) CreateUser(ctx context.Context, req CreateUserRequest, creatorID uuid.UUID, tenantSlug string) (*UserListItem, error) {
	if len(req.Password) < 8 {
		return nil, apperrors.BadRequest("password must be at least 8 characters")
	}
	hash, err := crypto.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user, err := s.repo.CreateUser(ctx, req.Email, hash, req.FullName, req.Phone, req.RoleID, creatorID, tenantSlug)
	if err != nil {
		return nil, err
	}

	s.logger.Info("user created", "id", user.ID, "email", user.Email, "role_id", req.RoleID, "tenant_slug", tenantSlug)
	return user, nil
}

// GetUserByIDScoped fetches user by ID ensuring tenant isolation unless caller is root superadmin.
func (s *Service) GetUserByIDScoped(ctx context.Context, id uuid.UUID, callerEmail string, tenantSlug string) (*User, error) {
	targetUser, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, apperrors.NotFound("User")
	}
	if !strings.EqualFold(callerEmail, "private@ispsync.id") && !strings.EqualFold(callerEmail, "admin@ispsync.id") {
		if targetUser.TenantSlug != "" && tenantSlug != "" && !strings.EqualFold(targetUser.TenantSlug, tenantSlug) {
			return nil, apperrors.NotFound("User")
		}
	}
	return targetUser, nil
}

// UpdateUser updates user profile and role with platform root account protection.
func (s *Service) UpdateUser(ctx context.Context, id uuid.UUID, req UpdateUserRequest, updaterID uuid.UUID, updaterEmail string, tenantSlug string) error {
	targetUser, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return err
	}
	if strings.EqualFold(targetUser.Email, "private@ispsync.id") && !strings.EqualFold(updaterEmail, "private@ispsync.id") {
		return apperrors.Forbidden("Akun root platform dilindungi dan tidak dapat diubah oleh pengguna lain")
	}
	// Tenant isolation check
	if !strings.EqualFold(updaterEmail, "private@ispsync.id") && !strings.EqualFold(updaterEmail, "admin@ispsync.id") {
		if targetUser.TenantSlug != "" && tenantSlug != "" && !strings.EqualFold(targetUser.TenantSlug, tenantSlug) {
			return apperrors.Forbidden("Pengguna tidak berada dalam domain organisasi Anda")
		}
	}
	return s.repo.UpdateUser(ctx, id, req.FullName, req.Phone, req.IsActive, req.RoleID, updaterID)
}

// AdminResetPassword sets a new password for a user without requiring their current password.
func (s *Service) AdminResetPassword(ctx context.Context, id uuid.UUID, newPassword string, callerEmail string, tenantSlug string) error {
	targetUser, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return err
	}
	if strings.EqualFold(targetUser.Email, "private@ispsync.id") && !strings.EqualFold(callerEmail, "private@ispsync.id") {
		return apperrors.Forbidden("Password akun root platform tidak dapat direset oleh pengguna lain")
	}
	// Tenant isolation check
	if !strings.EqualFold(callerEmail, "private@ispsync.id") && !strings.EqualFold(callerEmail, "admin@ispsync.id") {
		if targetUser.TenantSlug != "" && tenantSlug != "" && !strings.EqualFold(targetUser.TenantSlug, tenantSlug) {
			return apperrors.Forbidden("Pengguna tidak berada dalam domain organisasi Anda")
		}
	}
	if len(newPassword) < 8 {
		return apperrors.BadRequest("password must be at least 8 characters")
	}
	hash, err := crypto.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	return s.repo.UpdatePassword(ctx, id, hash)
}

// DeleteUser deletes (soft delete) a user account.
func (s *Service) DeleteUser(ctx context.Context, id uuid.UUID, callerEmail string, tenantSlug string) error {
	targetUser, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return err
	}
	if strings.EqualFold(targetUser.Email, "private@ispsync.id") {
		return apperrors.Forbidden("Akun root platform dilindungi dan tidak dapat dihapus")
	}
	// Tenant isolation check
	if !strings.EqualFold(callerEmail, "private@ispsync.id") && !strings.EqualFold(callerEmail, "admin@ispsync.id") {
		if targetUser.TenantSlug != "" && tenantSlug != "" && !strings.EqualFold(targetUser.TenantSlug, tenantSlug) {
			return apperrors.Forbidden("Pengguna tidak berada dalam domain organisasi Anda")
		}
	}
	return s.repo.DeleteUser(ctx, id)
}

// ListRoles returns available system roles.
func (s *Service) ListRoles(ctx context.Context) ([]Role, error) {
	return s.repo.ListRoles(ctx)
}

// ListPermissions returns all available system permissions.
func (s *Service) ListPermissions(ctx context.Context) ([]Permission, error) {
	return s.repo.ListPermissions(ctx)
}

// CreateRole creates a new custom role.
func (s *Service) CreateRole(ctx context.Context, req CreateRoleRequest) (*Role, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, apperrors.BadRequest("Nama peran wajib diisi")
	}
	slug := strings.TrimSpace(req.Slug)
	if slug == "" {
		slug = strings.ToLower(strings.ReplaceAll(name, " ", "_"))
	}
	slug = strings.ToLower(regexp.MustCompile(`[^a-zA-Z0-9_-]`).ReplaceAllString(slug, "_"))

	return s.repo.CreateRole(ctx, name, slug, strings.TrimSpace(req.Description), req.PermissionIDs)
}

// UpdateRole updates an existing role.
func (s *Service) UpdateRole(ctx context.Context, id uuid.UUID, req UpdateRoleRequest) error {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return apperrors.BadRequest("Nama peran wajib diisi")
	}
	return s.repo.UpdateRole(ctx, id, name, strings.TrimSpace(req.Description), req.PermissionIDs)
}

// DeleteRole deletes a role.
func (s *Service) DeleteRole(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteRole(ctx, id)
}
