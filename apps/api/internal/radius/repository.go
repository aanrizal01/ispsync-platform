package radius

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/pagination"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// SESSIONS

func (r *Repository) ListActiveSessions(ctx context.Context, tenantSlug string, params pagination.Params, search string) ([]Session, int, error) {
	where := "WHERE acctstoptime IS NULL"
	args := []interface{}{}
	argIdx := 1

	if tenantSlug != "" && tenantSlug != "superadmin" {
		where += fmt.Sprintf(` AND (
			username IN (
				SELECT a.identity FROM access_accounts a JOIN customers c ON a.customer_id = c.id WHERE c.tenant_slug = $%d
				UNION
				SELECT v.code FROM vouchers v WHERE v.tenant_slug = $%d
				UNION
				SELECT p.username FROM passpoint_credentials p WHERE p.tenant_slug = $%d
			)
			OR nasipaddress::TEXT IN (
				SELECT nasname FROM nas WHERE tenant_slug = $%d
			)
		)`, argIdx, argIdx, argIdx, argIdx)
		args = append(args, tenantSlug)
		argIdx++
	}

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
	if n.TenantSlug == "" {
		n.TenantSlug = "dev"
	}
	const q = `
		INSERT INTO nas (nasname, shortname, type, ports, secret, description, tenant_slug, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`
	return r.db.QueryRow(ctx, q,
		n.NasName, n.ShortName, n.Type, n.Ports, n.Secret, n.Description, n.TenantSlug, n.CreatedAt,
	).Scan(&n.ID)
}

func (r *Repository) ListNAS(ctx context.Context, tenantSlug string) ([]NAS, error) {
	where := ""
	var args []any
	if tenantSlug != "" && tenantSlug != "superadmin" {
		where = "WHERE tenant_slug = $1"
		args = append(args, tenantSlug)
	}
	q := fmt.Sprintf(`
		SELECT id, nasname, shortname, type, ports, secret, description, COALESCE(tenant_slug, 'dev'), created_at
		FROM nas
		%s
		ORDER BY created_at DESC
	`, where)
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []NAS
	for rows.Next() {
		var n NAS
		if err := rows.Scan(
			&n.ID, &n.NasName, &n.ShortName, &n.Type, &n.Ports, &n.Secret, &n.Description, &n.TenantSlug, &n.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, n)
	}
	return list, nil
}

func (r *Repository) GetNASByIP(ctx context.Context, tenantSlug string, ip string) (*NAS, error) {
	where := "WHERE nasname = $1"
	args := []any{ip}
	if tenantSlug != "" && tenantSlug != "superadmin" {
		where += " AND tenant_slug = $2"
		args = append(args, tenantSlug)
	}
	q := fmt.Sprintf(`
		SELECT id, nasname, shortname, type, ports, secret, description, COALESCE(tenant_slug, 'dev'), created_at
		FROM nas
		%s
		LIMIT 1
	`, where)
	var n NAS
	err := r.db.QueryRow(ctx, q, args...).Scan(
		&n.ID, &n.NasName, &n.ShortName, &n.Type, &n.Ports, &n.Secret, &n.Description, &n.TenantSlug, &n.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &n, nil
}

func (r *Repository) DeleteNAS(ctx context.Context, tenantSlug string, id int) error {
	var q string
	var args []any
	if tenantSlug != "" && tenantSlug != "superadmin" {
		q = "DELETE FROM nas WHERE id = $1 AND tenant_slug = $2"
		args = []any{id, tenantSlug}
	} else {
		q = "DELETE FROM nas WHERE id = $1"
		args = []any{id}
	}
	tag, err := r.db.Exec(ctx, q, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("NAS router tidak ditemukan")
	}
	return nil
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

func (r *Repository) ListAuthLogs(ctx context.Context, tenantSlug string, params pagination.Params, search string) ([]AuthLog, int, error) {
	where := "WHERE 1=1"
	args := []any{}
	argIdx := 1

	nasJoinOn := "n.nasname = p.nasipaddress::TEXT"
	if tenantSlug != "" && tenantSlug != "superadmin" {
		where += fmt.Sprintf(` AND (
			p.username IN (
				SELECT a.identity FROM access_accounts a JOIN customers c ON a.customer_id = c.id WHERE c.tenant_slug = $%d
				UNION
				SELECT v.code FROM vouchers v WHERE v.tenant_slug = $%d
				UNION
				SELECT pc.username FROM passpoint_credentials pc WHERE pc.tenant_slug = $%d
			)
			OR p.nasipaddress::TEXT IN (
				SELECT nasname FROM nas WHERE tenant_slug = $%d
			)
		)`, argIdx, argIdx, argIdx, argIdx)
		args = append(args, tenantSlug)
		nasJoinOn += fmt.Sprintf(" AND n.tenant_slug = $%d", argIdx)
		argIdx++
	}

	if search = strings.TrimSpace(search); search != "" {
		searchParam := "%" + search + "%"
		where += fmt.Sprintf(" AND (p.username ILIKE $%d OR COALESCE(p.callingstationid, '') ILIKE $%d OR COALESCE(p.nasipaddress::TEXT, '') ILIKE $%d OR COALESCE(n.shortname, '') ILIKE $%d OR COALESCE(n.description, '') ILIKE $%d OR p.reply ILIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx, argIdx)
		args = append(args, searchParam)
		argIdx++
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM radpostauth p
		LEFT JOIN nas n ON %s
		%s
	`, nasJoinOn, where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf(`
		SELECT p.id, p.username, p.reply, p.authdate, p.nasipaddress::TEXT,
		       COALESCE(n.shortname, n.nasname, p.nasipaddress::TEXT) AS nas_shortname,
		       COALESCE(p.callingstationid, (
		           SELECT s.callingstationid 
		           FROM radius_sessions s 
		           WHERE s.username = p.username 
		           ORDER BY s.acctstarttime DESC LIMIT 1
		       ), (
		           SELECT v.buyer_mac 
		           FROM vouchers v 
		           WHERE v.code = p.username LIMIT 1
		       )) AS callingstationid,
		       p.pass
		FROM radpostauth p
		LEFT JOIN nas n ON %s
		%s
		ORDER BY p.authdate DESC
		LIMIT $%d OFFSET $%d
	`, nasJoinOn, where, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)
	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []AuthLog
	for rows.Next() {
		var l AuthLog
		if err := rows.Scan(&l.ID, &l.Username, &l.Reply, &l.AuthDate, &l.NasIPAddress, &l.NasShortName, &l.CallingStationID, &l.Pass); err != nil {
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

func parsePasspointRateLimit(speedLimit string) string {
	cleaned := strings.ToLower(strings.TrimSpace(speedLimit))
	if cleaned == "" {
		return "15M/15M"
	}
	if strings.Contains(cleaned, "/") {
		return speedLimit
	}
	re := regexp.MustCompile(`(\d+)`)
	m := re.FindString(cleaned)
	if m != "" {
		return fmt.Sprintf("%sM/%sM", m, m)
	}
	return "15M/15M"
}

func (r *Repository) SyncPasspointUser(ctx context.Context, username, password, speedLimit string, simultaneousUse int) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Password in radcheck
	if password != "" {
		_, _ = tx.Exec(ctx, "DELETE FROM radcheck WHERE username = $1 AND attribute = 'Cleartext-Password'", username)
		const insertPass = `INSERT INTO radcheck (username, attribute, op, value) VALUES ($1, 'Cleartext-Password', ':=', $2)`
		if _, err := tx.Exec(ctx, insertPass, username, password); err != nil {
			return fmt.Errorf("insert radcheck password: %w", err)
		}
	}

	// 2. Simultaneous-Use (default 1)
	if simultaneousUse <= 0 {
		simultaneousUse = 1
	}
	_, _ = tx.Exec(ctx, "DELETE FROM radcheck WHERE username = $1 AND attribute = 'Simultaneous-Use'", username)
	const insertSimul = `INSERT INTO radcheck (username, attribute, op, value) VALUES ($1, 'Simultaneous-Use', ':=', $2)`
	if _, err := tx.Exec(ctx, insertSimul, username, fmt.Sprintf("%d", simultaneousUse)); err != nil {
		return fmt.Errorf("insert radcheck simultaneous-use: %w", err)
	}

	// 3. User Group
	_, _ = tx.Exec(ctx, "DELETE FROM radusergroup WHERE username = $1", username)
	const insertGroup = `INSERT INTO radusergroup (username, groupname, priority) VALUES ($1, 'PASSPOINT_USER', 1)`
	if _, err := tx.Exec(ctx, insertGroup, username); err != nil {
		return fmt.Errorf("insert radusergroup: %w", err)
	}

	// 4. Rate Limit
	rateLimit := parsePasspointRateLimit(speedLimit)
	_, _ = tx.Exec(ctx, "DELETE FROM radreply WHERE username = $1 AND attribute = 'Mikrotik-Rate-Limit'", username)
	const insertRate = `INSERT INTO radreply (username, attribute, op, value) VALUES ($1, 'Mikrotik-Rate-Limit', ':=', $2)`
	if _, err := tx.Exec(ctx, insertRate, username, rateLimit); err != nil {
		return fmt.Errorf("insert radreply rate limit: %w", err)
	}

	return tx.Commit(ctx)
}

