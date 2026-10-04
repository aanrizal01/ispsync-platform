package repository

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
)

func TestJartaplokSharing(t *testing.T) {
	ctx := context.Background()
	s, err := NewSQLiteStorage(filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.db.Close() })
	mustExec := func(q string, a ...interface{}) {
		if _, err := s.db.Exec(q, a...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	for _, x := range [][]string{{"tp", "lessor"}, {"tc", "lessee"}, {"tx", "other"}} {
		mustExec("INSERT INTO tenants (id, slug, name, short_name, prefix_id) VALUES (?,?,?,?,?)", x[0], x[1], x[1], x[1], x[1])
	}
	mustExec("INSERT INTO odps (id, tenant_id, code, name, latitude, longitude, total_ports, used_ports, status) VALUES ('o1','tp','ODP-A','A',0,0,8,2,'ACTIVE')")

	if _, err := s.CreateJartaplokAgreement(ctx, "tp", "lessor", "Area", 10000); !errors.Is(err, ErrJartaplokInvalid) {
		t.Fatalf("self lease must fail: %v", err)
	}
	if _, err := s.CreateJartaplokAgreement(ctx, "tp", "nope", "Area", 10000); !errors.Is(err, ErrJartaplokInvalid) {
		t.Fatalf("unknown client must fail: %v", err)
	}
	ag, err := s.CreateJartaplokAgreement(ctx, "tp", "lessee", "Area X", 25000)
	if err != nil {
		t.Fatal(err)
	}
	// Hanya 6 port tersedia (8 total - 2 dipakai provider).
	if err := s.AddSharedODP(ctx, "tp", ag.ID, "odp-a", 7); !errors.Is(err, ErrJartaplokInvalid) {
		t.Fatalf("over capacity must fail: %v", err)
	}
	// Tenant lain tidak boleh mengubah perjanjian.
	if err := s.AddSharedODP(ctx, "tx", ag.ID, "ODP-A", 2); !errors.Is(err, ErrJartaplokInvalid) {
		t.Fatalf("foreign provider must fail: %v", err)
	}
	if err := s.AddSharedODP(ctx, "tp", ag.ID, "odp-a", 2); err != nil {
		t.Fatal(err)
	}
	list, _ := s.ListJartaplokAgreements(ctx, "tc")
	var found bool
	for _, a := range list {
		if a.ID == ag.ID {
			found = true
			if a.AllocatedPorts != 2 || a.TotalSharedODPs != 1 || a.MonthlyBill != 50000 {
				t.Fatalf("unexpected totals: %+v", a)
			}
		}
	}
	if !found {
		t.Fatal("lessee must see agreement")
	}
	// Penyewa memakai port; port ke-3 ditolak.
	for i := 0; i < 2; i++ {
		ok, err := s.ConsumeSharedODPPort(ctx, "tc", "ODP-A")
		if !ok || err != nil {
			t.Fatalf("consume %d: %v %v", i, ok, err)
		}
	}
	if ok, err := s.ConsumeSharedODPPort(ctx, "tc", "ODP-A"); !ok || !errors.Is(err, ErrSharedODPFull) {
		t.Fatalf("expected full: %v %v", ok, err)
	}
	// Tenant lain bukan penyewa: ODP tidak dianggap sewaan.
	if ok, _ := s.ConsumeSharedODPPort(ctx, "tx", "ODP-A"); ok {
		t.Fatal("non-lessee must not consume")
	}
	// Tidak bisa dikurangi di bawah port terpakai.
	if err := s.AddSharedODP(ctx, "tp", ag.ID, "ODP-A", 1); !errors.Is(err, ErrJartaplokInvalid) {
		t.Fatalf("shrink below used must fail: %v", err)
	}
	// Setelah ditangguhkan, tidak bisa konsumsi.
	if err := s.SetJartaplokAgreementStatus(ctx, "tp", ag.ID, "SUSPENDED"); err != nil {
		t.Fatal(err)
	}
	if ok, _ := s.ConsumeSharedODPPort(ctx, "tc", "ODP-A"); ok {
		t.Fatal("suspended agreement must not allow consume")
	}
	if err := s.SetJartaplokAgreementStatus(ctx, "tx", ag.ID, "ACTIVE"); !errors.Is(err, ErrJartaplokInvalid) {
		t.Fatalf("foreign status change must fail: %v", err)
	}
}
