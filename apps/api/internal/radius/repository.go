package radius

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gigabill/isp/internal/shared/pagination"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// SESSIONS

func (r *Repository) ListActiveSessions(ctx context.Context, params pagination.Params, search string) ([]Session, int, error) {
	where := "WHERE acctstoptime IS NULL"
	args := []interface{}{}
	argIdx := 1

	if search != "" {
		where += fmt.Sprintf(" AND (username ILIKE $%d OR callingstationid ILIKE $%d OR framedipaddress::TEXT ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM radius_sessions %s", where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	orderBy := "ORDER BY acctstarttime DESC"
	if params.Sort != "" {
		orderBy = fmt.Sprintf("ORDER BY %s %s", params.Sort, params.Order)
	}

	dataQuery := fmt.Sprintf(`
		SELECT radacctid, acctsessionid, acctuniqueid, username, groupname,
		       nasipaddress::TEXT, nasportid, acctstarttime, acctupdatetime,
		       acctstoptime, COALESCE(acctsessiontime, 0),
		       COALESCE(acctinputoctets, 0), COALESCE(acctoutputoctets, 0),
		       callingstationid, framedipaddress::TEXT
		FROM radius_sessions
		%s
		%s
		LIMIT $%d OFFSET $%d
	`, where, orderBy, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var s Session
		err := rows.Scan(
			&s.RadAcctID, &s.AcctSessionID, &s.AcctUniqueID, &s.Username, &s.GroupName,
			&s.NasIPAddress, &s.NasPortID, &s.AcctStartTime, &s.AcctUpdateTime,
			&s.AcctStopTime, &s.AcctSessionTime,
			&s.AcctInputOctets, &s.AcctOutputOctets,
			&s.CallingStationID, &s.FramedIPAddress,
		)
		if err != nil {
			return nil, 0, err
		}
		s.IsActive = s.AcctStopTime == nil
		sessions = append(sessions, s)
	}

	return sessions, total, nil
}

func (r *Repository) MarkSessionTerminated(ctx context.Context, acctSessionID, username string) error {
	const q = `
		UPDATE radius_sessions
		SET acctstoptime = NOW(), acctterminatecause = 'Admin-Reset'
		WHERE acctsessionid = $1 AND username = $2 AND acctstoptime IS NULL
	`
	_, err := r.db.Exec(ctx, q, acctSessionID, username)
	return err
}

// NAS ROUTERS

func (r *Repository) CreateNAS(ctx context.Context, n *NAS) error {
	const q = `
		INSERT INTO nas (nasname, shortname, type, ports, secret, description, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	return r.db.QueryRow(ctx, q,
		n.NasName, n.ShortName, n.Type, n.Ports, n.Secret, n.Description, n.CreatedAt,
	).Scan(&n.ID)
}

func (r *Repository) ListNAS(ctx context.Context) ([]NAS, error) {
	const q = `
		SELECT id, nasname, shortname, type, ports, secret, description, created_at
		FROM nas
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []NAS
	for rows.Next() {
		var n NAS
		if err := rows.Scan(
			&n.ID, &n.NasName, &n.ShortName, &n.Type, &n.Ports, &n.Secret, &n.Description, &n.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, n)
	}
	return list, nil
}

func (r *Repository) GetNASByIP(ctx context.Context, ip string) (*NAS, error) {
	const q = `
		SELECT id, nasname, shortname, type, ports, secret, description, created_at
		FROM nas
		WHERE nasname = $1
		LIMIT 1
	`
	var n NAS
	err := r.db.QueryRow(ctx, q, ip).Scan(
		&n.ID, &n.NasName, &n.ShortName, &n.Type, &n.Ports, &n.Secret, &n.Description, &n.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &n, nil
}

// SINKRONISASI USER/VOUCHER KE RADCHECK & RADREPLY

func (r *Repository) SyncUserCredential(ctx context.Context, username, password, groupname string) error {
	return r.SyncUserCredentialWithIP(ctx, username, password, groupname, "")
}

func (r *Repository) SyncUserCredentialWithIP(ctx context.Context, username, password, groupname, staticIP string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Update Cleartext-Password if provided
	if password != "" {
		_, _ = tx.Exec(ctx, "DELETE FROM radcheck WHERE username = $1 AND attribute = 'Cleartext-Password'", username)
		const insertCheck = `
			INSERT INTO radcheck (username, attribute, op, value)
			VALUES ($1, 'Cleartext-Password', ':=', $2)
		`
		_, err = tx.Exec(ctx, insertCheck, username, password)
		if err != nil {
			return fmt.Errorf("insert radcheck: %w", err)
		}
	}

	// 2. Map to group if provided
	if groupname != "" {
		_, _ = tx.Exec(ctx, "DELETE FROM radusergroup WHERE username = $1", username)
		const insertGroup = `
			INSERT INTO radusergroup (username, groupname, priority)
			VALUES ($1, $2, 1)
		`
		_, err = tx.Exec(ctx, insertGroup, username, groupname)
		if err != nil {
			return fmt.Errorf("insert radusergroup: %w", err)
		}
	}

	// 3. Set Framed-IP-Address in radreply if static IP is provided
	_, _ = tx.Exec(ctx, "DELETE FROM radreply WHERE username = $1 AND attribute = 'Framed-IP-Address'", username)
	if staticIP != "" {
		const insertReply = `
			INSERT INTO radreply (username, attribute, op, value)
			VALUES ($1, 'Framed-IP-Address', ':=', $2)
		`
		_, err = tx.Exec(ctx, insertReply, username, staticIP)
		if err != nil {
			return fmt.Errorf("insert radreply framed ip: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) DeleteUserCredential(ctx context.Context, username string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, _ = tx.Exec(ctx, "DELETE FROM radcheck WHERE username = $1", username)
	_, _ = tx.Exec(ctx, "DELETE FROM radreply WHERE username = $1", username)
	_, _ = tx.Exec(ctx, "DELETE FROM radusergroup WHERE username = $1", username)

	return tx.Commit(ctx)
}

// AUDIT LOGS (RADPOSTAUTH)

func (r *Repository) ListAuthLogs(ctx context.Context, params pagination.Params) ([]AuthLog, int, error) {
	var total int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM radpostauth").Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	const q = `
		SELECT id, username, reply, authdate, nasipaddress::TEXT
		FROM radpostauth
		ORDER BY authdate DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Query(ctx, q, params.Limit, params.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []AuthLog
	for rows.Next() {
		var l AuthLog
		if err := rows.Scan(&l.ID, &l.Username, &l.Reply, &l.AuthDate, &l.NasIPAddress); err != nil {
			return nil, 0, err
		}
		logs = append(logs, l)
	}
	return logs, total, nil
}

// GetActiveSessionsByUsername finds all active RADIUS sessions for a specific username.
func (r *Repository) GetActiveSessionsByUsername(ctx context.Context, username string) ([]Session, error) {
	const q = `
		SELECT radacctid, acctsessionid, acctuniqueid, username, groupname,
		       nasipaddress::TEXT, nasportid, acctstarttime, acctupdatetime,
		       acctstoptime, COALESCE(acctsessiontime, 0),
		       COALESCE(acctinputoctets, 0), COALESCE(acctoutputoctets, 0),
		       callingstationid, framedipaddress::TEXT
		FROM radius_sessions
		WHERE username = $1 AND acctstoptime IS NULL
		ORDER BY acctstarttime DESC
	`
	rows, err := r.db.Query(ctx, q, username)
	if err != nil {
		return nil, fmt.Errorf("query active sessions by user: %w", err)
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var s Session
		if err := rows.Scan(
			&s.RadAcctID, &s.AcctSessionID, &s.AcctUniqueID, &s.Username, &s.GroupName,
			&s.NasIPAddress, &s.NasPortID, &s.AcctStartTime, &s.AcctUpdateTime,
			&s.AcctStopTime, &s.AcctSessionTime,
			&s.AcctInputOctets, &s.AcctOutputOctets,
			&s.CallingStationID, &s.FramedIPAddress,
		); err != nil {
			return nil, err
		}
		s.IsActive = true
		sessions = append(sessions, s)
	}
	return sessions, nil
}

// SetUserGroup switches a user's assigned group in radusergroup (e.g. from plan profile to ISOLIR).
func (r *Repository) SetUserGroup(ctx context.Context, username, groupname string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, _ = tx.Exec(ctx, "DELETE FROM radusergroup WHERE username = $1", username)

	if groupname != "" {
		const q = `
			INSERT INTO radusergroup (username, groupname, priority)
			VALUES ($1, $2, 1)
		`
		if _, err := tx.Exec(ctx, q, username, groupname); err != nil {
			return fmt.Errorf("set radusergroup: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// UpsertGroupProfile configures bandwidth limits (Max and optional Min CIR) and optional IP Pool for a profile group in radgroupreply.
func (r *Repository) UpsertGroupProfile(ctx context.Context, groupname string, downloadKbps, uploadKbps int64, framedPool string, minDownloadKbps, minUploadKbps int64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Clean existing Mikrotik-Rate-Limit for this group
	_, _ = tx.Exec(ctx, "DELETE FROM radgroupreply WHERE groupname = $1 AND attribute = 'Mikrotik-Rate-Limit'", groupname)

	var rateLimitStr string
	if minUploadKbps > 0 || minDownloadKbps > 0 {
		rateLimitStr = fmt.Sprintf("%dk/%dk 0/0 0/0 0/0 8 %dk/%dk", uploadKbps, downloadKbps, minUploadKbps, minDownloadKbps)
	} else {
		rateLimitStr = fmt.Sprintf("%dk/%dk", uploadKbps, downloadKbps)
	}

	const q = `
		INSERT INTO radgroupreply (groupname, attribute, op, value)
		VALUES ($1, 'Mikrotik-Rate-Limit', ':=', $2)
	`
	if _, err := tx.Exec(ctx, q, groupname, rateLimitStr); err != nil {
		return fmt.Errorf("upsert radgroupreply rate limit: %w", err)
	}

	// Clean & insert Framed-Pool if specified
	_, _ = tx.Exec(ctx, "DELETE FROM radgroupreply WHERE groupname = $1 AND attribute = 'Framed-Pool'", groupname)
	if framedPool != "" {
		const poolQ = `
			INSERT INTO radgroupreply (groupname, attribute, op, value)
			VALUES ($1, 'Framed-Pool', ':=', $2)
		`
		if _, err := tx.Exec(ctx, poolQ, groupname, framedPool); err != nil {
			return fmt.Errorf("upsert radgroupreply framed pool: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// UpsertGroupRateLimit configures bandwidth limits for a profile group in radgroupreply.
func (r *Repository) UpsertGroupRateLimit(ctx context.Context, groupname string, downloadKbps, uploadKbps int64) error {
	return r.UpsertGroupProfile(ctx, groupname, downloadKbps, uploadKbps, "", 0, 0)
}

// SetUserRateLimit sets rate limit specifically for an individual user/voucher in radreply.
func (r *Repository) SetUserRateLimit(ctx context.Context, username string, downloadKbps, uploadKbps, minDownloadKbps, minUploadKbps int64) error {
	var rateLimitStr string
	if minUploadKbps > 0 || minDownloadKbps > 0 {
		rateLimitStr = fmt.Sprintf("%dk/%dk 0/0 0/0 0/0 8 %dk/%dk", uploadKbps, downloadKbps, minUploadKbps, minDownloadKbps)
	} else {
		rateLimitStr = fmt.Sprintf("%dk/%dk", uploadKbps, downloadKbps)
	}

	_, _ = r.db.Exec(ctx, "DELETE FROM radreply WHERE username = $1 AND attribute = 'Mikrotik-Rate-Limit'", username)
	const q = `
		INSERT INTO radreply (username, attribute, op, value)
		VALUES ($1, 'Mikrotik-Rate-Limit', ':=', $2)
	`
	_, err := r.db.Exec(ctx, q, username, rateLimitStr)
	return err
}

// EnsureIsolirGroup sets up the default ISOLIR profile in radgroupreply if not present.
func (r *Repository) EnsureIsolirGroup(ctx context.Context) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var count int
	_ = tx.QueryRow(ctx, "SELECT COUNT(*) FROM radgroupreply WHERE groupname = 'ISOLIR'").Scan(&count)
	if count == 0 {
		_, _ = tx.Exec(ctx, "INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES ('ISOLIR', 'Mikrotik-Address-List', ':=', 'ISOLIR')")
		_, _ = tx.Exec(ctx, "INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES ('ISOLIR', 'Mikrotik-Rate-Limit', ':=', '128k/128k')")
	}

	return tx.Commit(ctx)
}

