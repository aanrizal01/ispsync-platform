package passpoint

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateProfile(ctx context.Context, p *Profile) error {
	const q = `
		INSERT INTO passpoint_profiles (
			id, name, operator_friendly_name, domain_name, realm, roaming_consortium_ois,
			eap_method, inner_auth, venue_name, venue_group, venue_type, is_default, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
		)
	`
	_, err := r.db.Exec(ctx, q,
		p.ID, p.Name, p.OperatorFriendlyName, p.DomainName, p.Realm, p.RoamingConsortiumOIs,
		p.EAPMethod, p.InnerAuth, p.VenueName, p.VenueGroup, p.VenueType, p.IsDefault, p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func (r *Repository) GetProfileByID(ctx context.Context, id uuid.UUID) (*Profile, error) {
	const q = `
		SELECT id, name, operator_friendly_name, domain_name, realm, roaming_consortium_ois,
		       eap_method, inner_auth, venue_name, venue_group, venue_type, is_default, created_at, updated_at
		FROM passpoint_profiles
		WHERE id = $1
	`
	var p Profile
	err := r.db.QueryRow(ctx, q, id).Scan(
		&p.ID, &p.Name, &p.OperatorFriendlyName, &p.DomainName, &p.Realm, &p.RoamingConsortiumOIs,
		&p.EAPMethod, &p.InnerAuth, &p.VenueName, &p.VenueGroup, &p.VenueType, &p.IsDefault, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("query profile by id: %w", err)
	}
	return &p, nil
}

func (r *Repository) GetDefaultProfile(ctx context.Context) (*Profile, error) {
	const q = `
		SELECT id, name, operator_friendly_name, domain_name, realm, roaming_consortium_ois,
		       eap_method, inner_auth, venue_name, venue_group, venue_type, is_default, created_at, updated_at
		FROM passpoint_profiles
		WHERE is_default = TRUE
		LIMIT 1
	`
	var p Profile
	err := r.db.QueryRow(ctx, q).Scan(
		&p.ID, &p.Name, &p.OperatorFriendlyName, &p.DomainName, &p.Realm, &p.RoamingConsortiumOIs,
		&p.EAPMethod, &p.InnerAuth, &p.VenueName, &p.VenueGroup, &p.VenueType, &p.IsDefault, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("query default profile: %w", err)
	}
	return &p, nil
}

func (r *Repository) ListProfiles(ctx context.Context) ([]Profile, error) {
	const q = `
		SELECT id, name, operator_friendly_name, domain_name, realm, roaming_consortium_ois,
		       eap_method, inner_auth, venue_name, venue_group, venue_type, is_default, created_at, updated_at
		FROM passpoint_profiles
		ORDER BY is_default DESC, name ASC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list profiles: %w", err)
	}
	defer rows.Close()

	var profiles []Profile
	for rows.Next() {
		var p Profile
		if err := rows.Scan(
			&p.ID, &p.Name, &p.OperatorFriendlyName, &p.DomainName, &p.Realm, &p.RoamingConsortiumOIs,
			&p.EAPMethod, &p.InnerAuth, &p.VenueName, &p.VenueGroup, &p.VenueType, &p.IsDefault, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan profile: %w", err)
		}
		profiles = append(profiles, p)
	}
	return profiles, nil
}

func (r *Repository) CreateCredential(ctx context.Context, c *Credential) error {
	const q = `
		INSERT INTO passpoint_credentials (
			id, customer_id, profile_id, username, password, status,
			last_authenticated_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		)
	`
	_, err := r.db.Exec(ctx, q,
		c.ID, c.CustomerID, c.ProfileID, c.Username, c.Password, c.Status,
		c.LastAuthenticatedAt, c.CreatedAt, c.UpdatedAt,
	)
	return err
}

func (r *Repository) GetCredentialByID(ctx context.Context, id uuid.UUID) (*Credential, error) {
	const q = `
		SELECT c.id, c.customer_id, cust.full_name, cust.customer_number,
		       c.profile_id, p.name, c.username, c.password, c.status,
		       c.last_authenticated_at, c.created_at, c.updated_at
		FROM passpoint_credentials c
		JOIN customers cust ON cust.id = c.customer_id
		JOIN passpoint_profiles p ON p.id = c.profile_id
		WHERE c.id = $1
	`
	var cred Credential
	err := r.db.QueryRow(ctx, q, id).Scan(
		&cred.ID, &cred.CustomerID, &cred.CustomerName, &cred.CustomerNumber,
		&cred.ProfileID, &cred.ProfileName, &cred.Username, &cred.Password, &cred.Status,
		&cred.LastAuthenticatedAt, &cred.CreatedAt, &cred.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("query credential by id: %w", err)
	}
	return &cred, nil
}

func (r *Repository) ListCredentialsByCustomer(ctx context.Context, customerID uuid.UUID) ([]Credential, error) {
	const q = `
		SELECT c.id, c.customer_id, cust.full_name, cust.customer_number,
		       c.profile_id, p.name, c.username, c.password, c.status,
		       c.last_authenticated_at, c.created_at, c.updated_at
		FROM passpoint_credentials c
		JOIN customers cust ON cust.id = c.customer_id
		JOIN passpoint_profiles p ON p.id = c.profile_id
		WHERE c.customer_id = $1
		ORDER BY c.created_at DESC
	`
	rows, err := r.db.Query(ctx, q, customerID)
	if err != nil {
		return nil, fmt.Errorf("list customer credentials: %w", err)
	}
	defer rows.Close()

	var creds []Credential
	for rows.Next() {
		var cred Credential
		if err := rows.Scan(
			&cred.ID, &cred.CustomerID, &cred.CustomerName, &cred.CustomerNumber,
			&cred.ProfileID, &cred.ProfileName, &cred.Username, &cred.Password, &cred.Status,
			&cred.LastAuthenticatedAt, &cred.CreatedAt, &cred.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan credential: %w", err)
		}
		creds = append(creds, cred)
	}
	return creds, nil
}

func (r *Repository) ListCredentials(ctx context.Context, limit, offset int) ([]Credential, int64, error) {
	const countQ = `SELECT COUNT(*) FROM passpoint_credentials`
	var total int64
	if err := r.db.QueryRow(ctx, countQ).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count credentials: %w", err)
	}

	const q = `
		SELECT c.id, c.customer_id, cust.full_name, cust.customer_number,
		       c.profile_id, p.name, c.username, c.password, c.status,
		       c.last_authenticated_at, c.created_at, c.updated_at
		FROM passpoint_credentials c
		JOIN customers cust ON cust.id = c.customer_id
		JOIN passpoint_profiles p ON p.id = c.profile_id
		ORDER BY c.created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Query(ctx, q, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list credentials: %w", err)
	}
	defer rows.Close()

	var creds []Credential
	for rows.Next() {
		var cred Credential
		if err := rows.Scan(
			&cred.ID, &cred.CustomerID, &cred.CustomerName, &cred.CustomerNumber,
			&cred.ProfileID, &cred.ProfileName, &cred.Username, &cred.Password, &cred.Status,
			&cred.LastAuthenticatedAt, &cred.CreatedAt, &cred.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan credential: %w", err)
		}
		creds = append(creds, cred)
	}
	return creds, total, nil
}

func (r *Repository) UpdateCredentialStatus(ctx context.Context, id uuid.UUID, status string) error {
	const q = `
		UPDATE passpoint_credentials
		SET status = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.db.Exec(ctx, q, status, id)
	return err
}
