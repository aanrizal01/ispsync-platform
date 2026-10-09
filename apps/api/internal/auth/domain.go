package auth

import (
	"time"

	"github.com/google/uuid"
)

// ---- Domain Types ----

// User represents a system user (admin or customer portal user).
type User struct {
	ID           uuid.UUID  `json:"id"`
	Email        string     `json:"email"`
	FullName     string     `json:"full_name"`
	Phone        string     `json:"phone"`
	IsActive     bool       `json:"is_active"`
	TenantSlug   string     `json:"tenant_slug,omitempty"`
	CustomerID   *uuid.UUID `json:"customer_id,omitempty"` // non-nil for customer portal users
	LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Roles        []Role     `json:"roles,omitempty"`
	Permissions  []string   `json:"permissions,omitempty"` // flattened permission slugs
}

// Role represents an RBAC role.
type Role struct {
	ID          uuid.UUID    `json:"id"`
	Name        string       `json:"name"`
	Slug        string       `json:"slug"`
	Description string       `json:"description"`
	IsSystem    bool         `json:"is_system"`
	TenantSlug  string       `json:"tenant_slug,omitempty"`
	UserCount   int          `json:"user_count"`
	Permissions []Permission `json:"permissions"`
}

// Permission represents a granular system permission.
type Permission struct {
	ID     uuid.UUID `json:"id"`
	Name   string    `json:"name"`    // human-readable
	Slug   string    `json:"slug"`    // e.g. "customers:write"
	Module string    `json:"module"`  // e.g. "customers"
	Action string    `json:"action"`  // e.g. "write"
}

// Session holds JWT token pair returned on login/refresh.
type Session struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	TokenType    string    `json:"token_type"`
}

// Claims holds the JWT payload for authenticated requests.
type Claims struct {
	UserID      uuid.UUID  `json:"sub"`
	Email       string     `json:"email"`
	TenantSlug  string     `json:"tenant_slug,omitempty"`
	CustomerID  *uuid.UUID `json:"customer_id,omitempty"`
	Permissions []string   `json:"permissions"`
	TokenID     string     `json:"jti"` // for blacklisting
	IssuedAt    int64      `json:"iat"`
	ExpiresAt   int64      `json:"exp"`
}

// HasPermission returns true if the claims include the given permission slug.
func (c *Claims) HasPermission(perm string) bool {
	for _, p := range c.Permissions {
		if p == perm || p == "*" {
			return true
		}
	}
	// Fallback for active admin sessions minted before new permission slugs were introduced
	if !c.IsCustomer() && c.hasRawPermission("admin:users") {
		switch perm {
		case "admin:roles",
			"partners:read", "partners:write",
			"billing:read", "billing:write",
			"notifications:read", "notifications:write",
			"network:write":
			return true
		}
	}
	return false
}

func (c *Claims) hasRawPermission(perm string) bool {
	for _, p := range c.Permissions {
		if p == perm || p == "*" {
			return true
		}
	}
	return false
}

// IsCustomer returns true if this is a customer portal token.
func (c *Claims) IsCustomer() bool {
	return c.CustomerID != nil
}

// ---- Request / Response DTOs ----

// LoginRequest is the payload for POST /auth/login.
type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required,min=1"`
}

// RefreshRequest is the payload for POST /auth/refresh.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// ChangePasswordRequest is the payload for PUT /auth/me/password.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password"     validate:"required,min=8"`
}

// UpdateProfileRequest is the payload for PUT /auth/me.
type UpdateProfileRequest struct {
	FullName string `json:"full_name" validate:"required,min=2,max=100"`
	Phone    string `json:"phone"     validate:"omitempty,max=20"`
}

// UserListItem represents a user row in admin staff list.
type UserListItem struct {
	ID          uuid.UUID  `json:"id"`
	Email       string     `json:"email"`
	FullName    string     `json:"full_name"`
	Phone       string     `json:"phone"`
	IsActive    bool       `json:"is_active"`
	TenantSlug  string     `json:"tenant_slug,omitempty"`
	CustomerID  *uuid.UUID `json:"customer_id,omitempty"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	Role        *Role      `json:"role,omitempty"`
}

// CreateUserRequest is the payload for POST /users.
type CreateUserRequest struct {
	Email    string    `json:"email"     validate:"required,email"`
	Password string    `json:"password"  validate:"required,min=8"`
	FullName string    `json:"full_name" validate:"required,min=2,max=100"`
	Phone    string    `json:"phone"     validate:"omitempty,max=20"`
	RoleID   uuid.UUID `json:"role_id"   validate:"required"`
}

// UpdateUserRequest is the payload for PUT /users/{id}.
type UpdateUserRequest struct {
	FullName string     `json:"full_name" validate:"required,min=2,max=100"`
	Phone    string     `json:"phone"     validate:"omitempty,max=20"`
	IsActive bool       `json:"is_active"`
	RoleID   *uuid.UUID `json:"role_id,omitempty"`
}

// AdminResetPasswordRequest is the payload for PUT /users/{id}/password.
type AdminResetPasswordRequest struct {
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// CreateRoleRequest is the payload for POST /roles.
type CreateRoleRequest struct {
	Name          string      `json:"name" validate:"required,min=2,max=100"`
	Slug          string      `json:"slug" validate:"omitempty,max=50"`
	Description   string      `json:"description"`
	PermissionIDs []uuid.UUID `json:"permission_ids"`
}

// UpdateRoleRequest is the payload for PUT /roles/{id}.
type UpdateRoleRequest struct {
	Name          string      `json:"name" validate:"required,min=2,max=100"`
	Description   string      `json:"description"`
	PermissionIDs []uuid.UUID `json:"permission_ids"`
}
