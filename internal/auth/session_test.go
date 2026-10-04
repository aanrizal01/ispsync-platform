package auth

import (
	"testing"
	"time"
)

func TestIssueVerify(t *testing.T) {
	secret := []byte("0123456789abcdef0123456789abcdef")
	tok, err := Issue(secret, Claims{UserID: "u1", TenantID: "t1", Username: "owner", Role: "OWNER"})
	if err != nil {
		t.Fatal(err)
	}
	c, err := Verify(secret, tok)
	if err != nil || c.TenantID != "t1" || c.Role != "OWNER" {
		t.Fatalf("verify gagal: %+v %v", c, err)
	}
	if _, err := Verify([]byte("secret-lain-secret-lain-secret-lain"), tok); err == nil {
		t.Fatal("secret berbeda harus ditolak")
	}
	if _, err := Verify(secret, tok+"x"); err == nil {
		t.Fatal("token diubah harus ditolak")
	}
	if _, err := Verify(secret, "sess_abc"); err == nil {
		t.Fatal("token palsu harus ditolak")
	}
}

func TestExpired(t *testing.T) {
	secret := []byte("0123456789abcdef0123456789abcdef")
	tok, _ := Issue(secret, Claims{TenantID: "t1", Role: "NOC"})
	c, _ := Verify(secret, tok)
	if c.Exp <= time.Now().Unix() {
		t.Fatal("exp harus di masa depan")
	}
}
