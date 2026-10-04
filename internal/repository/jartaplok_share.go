package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"ispsync/internal/domain"

	"github.com/google/uuid"
)

var (
	ErrJartaplokInvalid = errors.New("jartaplok: permintaan tidak valid")
	ErrSharedODPFull    = errors.New("jartaplok: kuota port ODP sewa sudah penuh")
)

// jartaplokDB adalah implementasi bersama (Postgres & SQLite); ph menghasilkan placeholder ke-n.
type jartaplokDB struct {
	db *sql.DB
	ph func(n int) string
}

func pgPH(n int) string     { return fmt.Sprintf("$%d", n) }
func sqlitePH(n int) string { return "?" }

func (j jartaplokDB) recompute(ctx context.Context, tx *sql.Tx, agreementID string) error {
	_, err := tx.ExecContext(ctx, `UPDATE jartaplok_agreements SET
		total_shared_odps = (SELECT COUNT(*) FROM jartaplok_shared_odps WHERE agreement_id = `+j.ph(1)+`),
		allocated_ports = (SELECT COALESCE(SUM(allocated_ports),0) FROM jartaplok_shared_odps WHERE agreement_id = `+j.ph(2)+`),
		used_ports = (SELECT COALESCE(SUM(used_ports),0) FROM jartaplok_shared_odps WHERE agreement_id = `+j.ph(3)+`)
		WHERE id = `+j.ph(4), agreementID, agreementID, agreementID, agreementID)
	return err
}

func (j jartaplokDB) createAgreement(ctx context.Context, providerID, clientSlug, scope string, rate float64) (*domain.JartaplokAgreement, error) {
	clientSlug = strings.ToLower(strings.TrimSpace(clientSlug))
	scope = strings.TrimSpace(scope)
	if clientSlug == "" || scope == "" || rate < 0 {
		return nil, ErrJartaplokInvalid
	}
	var clientID, providerSlug string
	if err := j.db.QueryRowContext(ctx, "SELECT id FROM tenants WHERE slug = "+j.ph(1), clientSlug).Scan(&clientID); err != nil {
		return nil, fmt.Errorf("%w: tenant penyewa tidak ditemukan", ErrJartaplokInvalid)
	}
	if clientID == providerID {
		return nil, fmt.Errorf("%w: penyewa tidak boleh sama dengan pemilik infrastruktur", ErrJartaplokInvalid)
	}
	if err := j.db.QueryRowContext(ctx, "SELECT slug FROM tenants WHERE id = "+j.ph(1), providerID).Scan(&providerSlug); err != nil {
		return nil, err
	}
	id := uuid.New().String()
	no := fmt.Sprintf("JTP-%s-%s-%s-%s", strings.ToUpper(providerSlug), strings.ToUpper(clientSlug), time.Now().Format("200601"), strings.ToUpper(id[:4]))
	_, err := j.db.ExecContext(ctx, `INSERT INTO jartaplok_agreements (id, agreement_no, provider_tenant_id, client_tenant_id, scope_area, settlement_rate_per_port, status)
		VALUES (`+j.ph(1)+`,`+j.ph(2)+`,`+j.ph(3)+`,`+j.ph(4)+`,`+j.ph(5)+`,`+j.ph(6)+`,'ACTIVE')`, id, no, providerID, clientID, scope, rate)
	if err != nil {
		return nil, err
	}
	return &domain.JartaplokAgreement{ID: id, AgreementNo: no, ProviderTenantID: providerID, ProviderTenantSlug: providerSlug,
		ClientTenantID: clientID, ClientTenantSlug: clientSlug, ScopeArea: scope, SettlementRatePerPort: rate, Status: "ACTIVE", CreatedAt: time.Now()}, nil
}

// addSharedODP menyewakan `ports` port dari ODP milik provider ke perjanjian. Kapasitas dicek terhadap
// total port ODP dikurangi port terpakai provider dan port yang sudah disewakan di perjanjian lain.
func (j jartaplokDB) addSharedODP(ctx context.Context, providerID, agreementID, odpCode string, ports int) error {
	if ports <= 0 {
		return fmt.Errorf("%w: jumlah port harus > 0", ErrJartaplokInvalid)
	}
	tx, err := j.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var provider, status string
	if err := tx.QueryRowContext(ctx, "SELECT provider_tenant_id, status FROM jartaplok_agreements WHERE id = "+j.ph(1), agreementID).Scan(&provider, &status); err != nil || provider != providerID {
		return fmt.Errorf("%w: perjanjian tidak ditemukan", ErrJartaplokInvalid)
	}
	if status != "ACTIVE" {
		return fmt.Errorf("%w: perjanjian tidak aktif", ErrJartaplokInvalid)
	}
	var odpID string
	var total, used int
	if err := tx.QueryRowContext(ctx, "SELECT id, total_ports, used_ports FROM odps WHERE tenant_id = "+j.ph(1)+" AND UPPER(code) = UPPER("+j.ph(2)+")", providerID, strings.TrimSpace(odpCode)).Scan(&odpID, &total, &used); err != nil {
		return fmt.Errorf("%w: ODP %q tidak ditemukan di infrastruktur Anda", ErrJartaplokInvalid, odpCode)
	}
	var leasedElsewhere int
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(SUM(s.allocated_ports),0) FROM jartaplok_shared_odps s
		JOIN jartaplok_agreements a ON a.id = s.agreement_id
		WHERE s.odp_id = `+j.ph(1)+` AND a.status = 'ACTIVE' AND s.agreement_id <> `+j.ph(2), odpID, agreementID).Scan(&leasedElsewhere); err != nil {
		return err
	}
	if ports > total-used-leasedElsewhere {
		return fmt.Errorf("%w: port tersedia untuk disewakan hanya %d", ErrJartaplokInvalid, max(total-used-leasedElsewhere, 0))
	}
	var existing int
	_ = tx.QueryRowContext(ctx, "SELECT used_ports FROM jartaplok_shared_odps WHERE agreement_id = "+j.ph(1)+" AND odp_id = "+j.ph(2), agreementID, odpID).Scan(&existing)
	if ports < existing {
		return fmt.Errorf("%w: port terpakai penyewa %d, tidak bisa dikurangi di bawahnya", ErrJartaplokInvalid, existing)
	}
	res, err := tx.ExecContext(ctx, "UPDATE jartaplok_shared_odps SET allocated_ports = "+j.ph(1)+" WHERE agreement_id = "+j.ph(2)+" AND odp_id = "+j.ph(3), ports, agreementID, odpID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		if _, err := tx.ExecContext(ctx, "INSERT INTO jartaplok_shared_odps (id, agreement_id, odp_id, allocated_ports, used_ports) VALUES ("+j.ph(1)+","+j.ph(2)+","+j.ph(3)+","+j.ph(4)+",0)", uuid.New().String(), agreementID, odpID, ports); err != nil {
			return err
		}
	}
	if err := j.recompute(ctx, tx, agreementID); err != nil {
		return err
	}
	return tx.Commit()
}

func (j jartaplokDB) setStatus(ctx context.Context, providerID, agreementID, status string) error {
	status = strings.ToUpper(strings.TrimSpace(status))
	if status != "ACTIVE" && status != "SUSPENDED" && status != "TERMINATED" {
		return fmt.Errorf("%w: status harus ACTIVE, SUSPENDED atau TERMINATED", ErrJartaplokInvalid)
	}
	res, err := j.db.ExecContext(ctx, "UPDATE jartaplok_agreements SET status = "+j.ph(1)+" WHERE id = "+j.ph(2)+" AND provider_tenant_id = "+j.ph(3), status, agreementID, providerID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return fmt.Errorf("%w: perjanjian tidak ditemukan", ErrJartaplokInvalid)
	}
	return nil
}

// consume memakai satu port pada ODP sewaan milik penyewa. found=false bila ODP bukan ODP sewaan penyewa.
func (j jartaplokDB) consume(ctx context.Context, clientID, odpCode string) (bool, error) {
	tx, err := j.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()
	var sid, aid string
	err = tx.QueryRowContext(ctx, `SELECT s.id, s.agreement_id FROM jartaplok_shared_odps s
		JOIN jartaplok_agreements a ON a.id = s.agreement_id
		JOIN odps o ON o.id = s.odp_id
		WHERE a.client_tenant_id = `+j.ph(1)+` AND a.status = 'ACTIVE' AND UPPER(o.code) = UPPER(`+j.ph(2)+`)
		ORDER BY (s.allocated_ports - s.used_ports) DESC LIMIT 1`, clientID, strings.TrimSpace(odpCode)).Scan(&sid, &aid)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	res, err := tx.ExecContext(ctx, "UPDATE jartaplok_shared_odps SET used_ports = used_ports + 1 WHERE id = "+j.ph(1)+" AND used_ports < allocated_ports", sid)
	if err != nil {
		return true, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return true, ErrSharedODPFull
	}
	if err := j.recompute(ctx, tx, aid); err != nil {
		return true, err
	}
	return true, tx.Commit()
}

// ── Postgres ──
func (s *PostgresStorage) jt() jartaplokDB { return jartaplokDB{s.db, pgPH} }
func (s *PostgresStorage) CreateJartaplokAgreement(ctx context.Context, providerID, clientSlug, scope string, rate float64) (*domain.JartaplokAgreement, error) {
	return s.jt().createAgreement(ctx, providerID, clientSlug, scope, rate)
}
func (s *PostgresStorage) AddSharedODP(ctx context.Context, providerID, agreementID, odpCode string, ports int) error {
	return s.jt().addSharedODP(ctx, providerID, agreementID, odpCode, ports)
}
func (s *PostgresStorage) SetJartaplokAgreementStatus(ctx context.Context, providerID, agreementID, status string) error {
	return s.jt().setStatus(ctx, providerID, agreementID, status)
}
func (s *PostgresStorage) ConsumeSharedODPPort(ctx context.Context, clientID, odpCode string) (bool, error) {
	return s.jt().consume(ctx, clientID, odpCode)
}

// ── SQLite ──
func (s *SQLiteStorage) jt() jartaplokDB { return jartaplokDB{s.db, sqlitePH} }
func (s *SQLiteStorage) CreateJartaplokAgreement(ctx context.Context, providerID, clientSlug, scope string, rate float64) (*domain.JartaplokAgreement, error) {
	return s.jt().createAgreement(ctx, providerID, clientSlug, scope, rate)
}
func (s *SQLiteStorage) AddSharedODP(ctx context.Context, providerID, agreementID, odpCode string, ports int) error {
	return s.jt().addSharedODP(ctx, providerID, agreementID, odpCode, ports)
}
func (s *SQLiteStorage) SetJartaplokAgreementStatus(ctx context.Context, providerID, agreementID, status string) error {
	return s.jt().setStatus(ctx, providerID, agreementID, status)
}
func (s *SQLiteStorage) ConsumeSharedODPPort(ctx context.Context, clientID, odpCode string) (bool, error) {
	return s.jt().consume(ctx, clientID, odpCode)
}
