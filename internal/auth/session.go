// Package auth menyediakan token sesi bertanda tangan HMAC (stateless) untuk login staf.
package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"os"
	"strings"
	"time"
)

// TokenTTL masa berlaku sesi staf.
const TokenTTL = 12 * time.Hour

// Claims isi token sesi.
type Claims struct {
	UserID   string `json:"uid"`
	TenantID string `json:"tid"`
	Username string `json:"usr"`
	Role     string `json:"rol"` // peran DB: OWNER, NOC, SALES, TECHNICIAN, FINANCE
	Exp      int64  `json:"exp"`
}

// LoadSecret membaca SESSION_SECRET. Bila kosong, dibuat acak per proses
// (semua sesi hangus saat restart) dan peringatan dicatat.
func LoadSecret() []byte {
	if s := strings.TrimSpace(os.Getenv("SESSION_SECRET")); len(s) >= 32 {
		return []byte(s)
	}
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		log.Fatalf("gagal membuat session secret: %v", err)
	}
	log.Println("PERINGATAN: SESSION_SECRET (>=32 karakter) belum diset; memakai secret acak, sesi hangus saat restart")
	return []byte(hex.EncodeToString(b))
}

func sign(secret []byte, payload string) string {
	m := hmac.New(sha256.New, secret)
	m.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

// Issue membuat token baru untuk claims (Exp diisi otomatis).
func Issue(secret []byte, c Claims) (string, error) {
	c.Exp = time.Now().Add(TokenTTL).Unix()
	raw, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	payload := base64.RawURLEncoding.EncodeToString(raw)
	return "v1." + payload + "." + sign(secret, payload), nil
}

// Verify memeriksa tanda tangan dan masa berlaku token.
func Verify(secret []byte, token string) (*Claims, error) {
	parts := strings.Split(strings.TrimSpace(token), ".")
	if len(parts) != 3 || parts[0] != "v1" {
		return nil, errors.New("format token tidak valid")
	}
	if !hmac.Equal([]byte(sign(secret, parts[1])), []byte(parts[2])) {
		return nil, errors.New("tanda tangan token tidak valid")
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, errors.New("payload token rusak")
	}
	var c Claims
	if err := json.Unmarshal(raw, &c); err != nil {
		return nil, errors.New("payload token rusak")
	}
	if c.Exp < time.Now().Unix() {
		return nil, errors.New("sesi berakhir")
	}
	return &c, nil
}

// DisplayRole memetakan peran DB ke nama peran yang dipakai antarmuka.
func DisplayRole(dbRole string) string {
	switch strings.ToUpper(dbRole) {
	case "OWNER":
		return "SUPER_ADMIN"
	case "NOC":
		return "ADMIN_NOC"
	default:
		return strings.ToUpper(dbRole)
	}
}
