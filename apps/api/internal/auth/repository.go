package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository handles all database operations for the auth domain.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new auth repository.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetUserByEmail retrieves a user by email address along with roles and permissions.
func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*User, string, error) {
	const q = `
		SELECT id, email, password_hash, full_name, phone, is_active,
		       customer_id, last_login_at, created_at, updated_at
		FROM users
		WHERE email = $1 AND deleted_at IS NULL
	`
	var u User
	var passwordHash string
	var customerID *uuid.UUID

	err := r.db.QueryRow(ctx, q, email).Scan(
		&u.ID, &u.Email, &passwordHash, &u.FullName, &u.Phone,
		&u.IsActive, &customerID, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, "", fmt.Errorf("get user by email: %w", err)
	}
	u.CustomerID = customerID

	// Load permissions
	perms, err := r.getUserPermissions(ctx, u.ID)
	if err != nil {
		return nil, "", err
	}
	u.Permissions = perms

	// Load roles
	roles, err := r.getUserRoles(ctx, u.ID)
	if err == nil {
		u.Roles = roles
	}

	return &u, passwordHash, nil
}

// GetUserByID retrieves a user by ID.
func (r *Repository) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	const q = `
		SELECT id, email, full_name, phone, is_active,
		       customer_id, last_login_at, created_at, updated_at
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`
	var u User
	var customerID *uuid.UUID

	err := r.db.QueryRow(ctx, q, id).Scan(
		&u.ID, &u.Email, &u.FullName, &u.Phone, &u.IsActive,
		&customerID, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	u.CustomerID = customerID

	perms, err := r.getUserPermissions(ctx, id)
	if err != nil {
		return nil, err
	}
	u.Permissions = perms

	// Load roles
	roles, err := r.getUserRoles(ctx, id)
	if err == nil {
		u.Roles = roles
	}

	return &u, nil
}

// UpdateLastLogin sets the last_login_at timestamp for a user.
func (r *Repository) UpdateLastLogin(ctx context.Context, userID uuid.UUID) error {
	const q = `UPDATE users SET last_login_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, q, userID)
	return err
}

// UpdatePassword sets a new password hash for a user.
func (r *Repository) UpdatePassword(ctx context.Context, userID uuid.UUID, hash string) error {
	const q = `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(ctx, q, hash, userID)
	return err
}

// GetPasswordHash retrieves the password hash for a user.
func (r *Repository) GetPasswordHash(ctx context.Context, userID uuid.UUID) (string, error) {
	var hash string
	err := r.db.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1`, userID).Scan(&hash)
	return hash, err
}

// getUserPermissions fetches the flattened permission slugs for a user via roles.
func (r *Repository) getUserPermissions(ctx context.Context, userID uuid.UUID) ([]string, error) {
	const q = `
		SELECT DISTINCT p.slug
		FROM user_roles ur
		JOIN role_permissions rp ON rp.role_id = ur.role_id
		JOIN permissions p ON p.id = rp.permission_id
		WHERE ur.user_id = $1
		ORDER BY p.slug
	`
	rows, err := r.db.Query(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("get user permissions: %w", err)
	}
	defer rows.Close()

	var perms []string
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			return nil, err
		}
		perms = append(perms, slug)
	}
	return perms, rows.Err()
}

// getUserRoles fetches the roles assigned to a user.
func (r *Repository) getUserRoles(ctx context.Context, userID uuid.UUID) ([]Role, error) {
	const q = `
		SELECT r.id, r.name, r.slug, COALESCE(r.description, '')
		FROM user_roles ur
		JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = $1
		ORDER BY r.name
	`
	rows, err := r.db.Query(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("get user roles: %w", err)
	}
	defer rows.Close()

	var roles []Role
	for rows.Next() {
		var role Role
		if err := rows.Scan(&role.ID, &role.Name, &role.Slug, &role.Description); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}

// BlacklistToken stores a revoked token JTI in a separate table for refresh token blacklisting.
// Redis is the primary blacklist store; this is the DB fallback/audit.
func (r *Repository) BlacklistToken(ctx context.Context, jti string, expiresAt time.Time) error {
	const q = `
		INSERT INTO token_blacklist (jti, expires_at)
		VALUES ($1, $2)
		ON CONFLICT (jti) DO NOTHING
	`
	_, err := r.db.Exec(ctx, q, jti, expiresAt)
	return err
}

// ListUsers retrieves all users with their primary role.
func (r *Repository) ListUsers(ctx context.Context, search, roleSlug string) ([]UserListItem, error) {
	q := `
		SELECT u.id, u.email, u.full_name, COALESCE(u.phone, ''), u.is_active, u.customer_id,
		       u.last_login_at, u.created_at,
		       r.id, r.name, r.slug, r.description
		FROM users u
		LEFT JOIN user_roles ur ON ur.user_id = u.id
		LEFT JOIN roles r ON r.id = ur.role_id
		WHERE u.deleted_at IS NULL
	`
	args := []interface{}{}
	argIdx := 1

	if search != "" {
		q += fmt.Sprintf(" AND (u.email ILIKE $%d OR u.full_name ILIKE $%d OR u.phone ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	if roleSlug != "" {
		q += fmt.Sprintf(" AND r.slug = $%d", argIdx)
		args = append(args, roleSlug)
		argIdx++
	}

	q += " ORDER BY u.created_at DESC"

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []UserListItem
	for rows.Next() {
		var u UserListItem
		var customerID *uuid.UUID
		var roleID *uuid.UUID
		var roleName, roleSlug, roleDesc *string

		if err := rows.Scan(
			&u.ID, &u.Email, &u.FullName, &u.Phone, &u.IsActive, &customerID,
			&u.LastLoginAt, &u.CreatedAt,
			&roleID, &roleName, &roleSlug, &roleDesc,
		); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		u.CustomerID = customerID

		if roleID != nil && roleName != nil && roleSlug != nil {
			desc := ""
			if roleDesc != nil {
				desc = *roleDesc
			}
			u.Role = &Role{
				ID:          *roleID,
				Name:        *roleName,
				Slug:        *roleSlug,
				Description: desc,
			}
		}

		users = append(users, u)
	}

	return users, rows.Err()
}

// CreateUser creates a new user and assigns a role.
func (r *Repository) CreateUser(ctx context.Context, email, passwordHash, fullName, phone string, roleID, creatorID uuid.UUID) (*UserListItem, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	const insertUser = `
		INSERT INTO users (email, password_hash, full_name, phone, is_active)
		VALUES ($1, $2, $3, $4, TRUE)
		RETURNING id, email, full_name, COALESCE(phone, ''), is_active, created_at
	`
	var u UserListItem
	err = tx.QueryRow(ctx, insertUser, email, passwordHash, fullName, phone).Scan(
		&u.ID, &u.Email, &u.FullName, &u.Phone, &u.IsActive, &u.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}

	// Assign role
	const insertRole = `
		INSERT INTO user_roles (user_id, role_id, assigned_by)
		VALUES ($1, $2, $3)
	`
	var assignedBy *uuid.UUID
	if creatorID != uuid.Nil {
		var exists bool
		_ = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, creatorID).Scan(&exists)
		if exists {
			assignedBy = &creatorID
		}
	}
	if _, err := tx.Exec(ctx, insertRole, u.ID, roleID, assignedBy); err != nil {
		return nil, fmt.Errorf("assign role: %w", err)
	}

	// Fetch role info
	var role Role
	err = tx.QueryRow(ctx, `SELECT id, name, slug, COALESCE(description, '') FROM roles WHERE id = $1`, roleID).Scan(
		&role.ID, &role.Name, &role.Slug, &role.Description,
	)
	if err == nil {
		u.Role = &role
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &u, nil
}

// UpdateUser updates user details and optionally reassigns their role.
func (r *Repository) UpdateUser(ctx context.Context, id uuid.UUID, fullName, phone string, isActive bool, roleID *uuid.UUID, updaterID uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	const updateUser = `
		UPDATE users
		SET full_name = $1, phone = $2, is_active = $3, updated_at = NOW()
		WHERE id = $4 AND deleted_at IS NULL
	`
	res, err := tx.Exec(ctx, updateUser, fullName, phone, isActive, id)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}

	if roleID != nil && *roleID != uuid.Nil {
		if _, err := tx.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1`, id); err != nil {
			return fmt.Errorf("delete old role: %w", err)
		}
		var assignedBy *uuid.UUID
		if updaterID != uuid.Nil {
			var exists bool
			_ = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, updaterID).Scan(&exists)
			if exists {
				assignedBy = &updaterID
			}
		}
		if _, err := tx.Exec(ctx, `INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)`, id, *roleID, assignedBy); err != nil {
			return fmt.Errorf("assign new role: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// DeleteUser soft deletes a user.
func (r *Repository) DeleteUser(ctx context.Context, id uuid.UUID) error {
	const q = `
		UPDATE users
		SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`
	res, err := r.db.Exec(ctx, q, id)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

// ListRoles returns all system roles available for assignment.
func (r *Repository) ListRoles(ctx context.Context) ([]Role, error) {
	const q = `
		SELECT id, name, slug, COALESCE(description, '')
		FROM roles
		ORDER BY name ASC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	defer rows.Close()

	var roles []Role
	for rows.Next() {
		var role Role
		if err := rows.Scan(&role.ID, &role.Name, &role.Slug, &role.Description); err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}
