package voucher

import (
	"strings"
	"testing"

	"github.com/gigabill/isp/pkg/crypto"
)

func TestGenerateVoucherCodeFormat(t *testing.T) {
	// Tanpa prefix
	code, err := crypto.GenerateVoucherCode("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	parts := strings.Split(code, "-")
	if len(parts) != 3 {
		t.Fatalf("expected 3 parts separated by hyphen, got %d in %s", len(parts), code)
	}
	for _, p := range parts {
		if len(p) != 4 {
			t.Errorf("expected part length 4, got %d in part '%s'", len(p), p)
		}
	}

	// Dengan prefix
	codeWithPrefix, err := crypto.GenerateVoucherCode("HOTSPOT")
	if err != nil {
		t.Fatalf("unexpected error with prefix: %v", err)
	}
	if !strings.HasPrefix(codeWithPrefix, "HOTSPOT-") {
		t.Fatalf("expected prefix HOTSPOT-, got %s", codeWithPrefix)
	}
}

func TestGenerateVoucherCodeCollisionResistance(t *testing.T) {
	const count = 1000
	seen := make(map[string]bool, count)

	for i := 0; i < count; i++ {
		code, err := crypto.GenerateVoucherCode("TEST")
		if err != nil {
			t.Fatalf("error generating code at index %d: %v", i, err)
		}
		if seen[code] {
			t.Fatalf("collision detected for code: %s at index %d", code, i)
		}
		seen[code] = true
	}
}

func TestGeneratePassword(t *testing.T) {
	pwd, err := crypto.GeneratePassword(8)
	if err != nil {
		t.Fatalf("error generating password: %v", err)
	}
	if len(pwd) != 8 {
		t.Fatalf("expected length 8, got %d", len(pwd))
	}

	// Pastikan tidak ada karakter ambigu 0, O, l, 1, I
	ambiguous := "0Ol1I"
	for _, c := range ambiguous {
		if strings.ContainsRune(pwd, c) {
			t.Errorf("password contains ambiguous char '%c': %s", c, pwd)
		}
	}
}

func TestGenerateCustomVoucherCode(t *testing.T) {
	// Numeric
	code, err := crypto.GenerateCustomVoucherCode(crypto.VoucherCodeOptions{
		Length:   6,
		CharType: "numeric",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(code) != 6 {
		t.Errorf("expected length 6, got %d (%s)", len(code), code)
	}
	for _, r := range code {
		if r < '0' || r > '9' {
			t.Errorf("expected only digits, got char '%c'", r)
		}
	}

	// Alpha upper with prefix (e.g. vc123123 without hyphen)
	codeWithPrefix, err := crypto.GenerateCustomVoucherCode(crypto.VoucherCodeOptions{
		Prefix:   "vc",
		Length:   6,
		CharType: "numeric",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.HasPrefix(codeWithPrefix, "vc") {
		t.Errorf("expected prefix vc, got %s", codeWithPrefix)
	}
	if strings.Contains(codeWithPrefix, "-") {
		t.Errorf("expected no hyphen in code, got %s", codeWithPrefix)
	}
	randomPart := strings.TrimPrefix(codeWithPrefix, "vc")
	if len(randomPart) != 6 {
		t.Errorf("expected random part length 6, got %d (%s)", len(randomPart), randomPart)
	}
}

func TestGenerateNumericCode12Digits(t *testing.T) {
	code, err := crypto.GenerateNumericCode(12)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(code) != 12 {
		t.Fatalf("expected length 12, got %d (%s)", len(code), code)
	}
	for _, ch := range code {
		if ch < '0' || ch > '9' {
			t.Errorf("expected numeric digit, got non-numeric character '%c' in %s", ch, code)
		}
	}

	// Collision test for 500 codes
	seen := make(map[string]bool)
	for i := 0; i < 500; i++ {
		c, err := crypto.GenerateNumericCode(12)
		if err != nil {
			t.Fatalf("error: %v", err)
		}
		if seen[c] {
			t.Fatalf("collision detected on numeric code: %s", c)
		}
		seen[c] = true
	}
}

