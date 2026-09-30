// Package crypto provides cryptographic utilities for password hashing,
// secure token generation, and encryption.
// IMPORTANT: Never log passwords, tokens, or keys.
package crypto

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const (
	// BcryptCost is the bcrypt work factor. 12 is minimum for production.
	BcryptCost = 12

	// DefaultTokenBytes is the default number of random bytes for token generation.
	DefaultTokenBytes = 32
)

// HashPassword hashes a plaintext password using bcrypt.
// Returns error if the password is too long (bcrypt limit: 72 bytes).
func HashPassword(password string) (string, error) {
	if len(password) > 72 {
		return "", fmt.Errorf("password exceeds bcrypt maximum length of 72 bytes")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
}

// CheckPassword compares a plaintext password against a bcrypt hash.
// Returns nil if they match.
func CheckPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

// GenerateToken generates a cryptographically secure random token
// encoded as URL-safe base64 (no padding).
func GenerateToken(nBytes int) (string, error) {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate random token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// GenerateSecret generates a cryptographically secure random secret
// encoded as hex string. Suitable for RADIUS shared secrets, HMAC keys.
func GenerateSecret(nBytes int) (string, error) {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate secret: %w", err)
	}
	return fmt.Sprintf("%x", b), nil
}

type VoucherCodeOptions struct {
	Prefix   string
	Length   int
	CharType string // "numeric", "alpha_lower", "alpha_upper", "alphanumeric_lower", "alphanumeric_upper", "alphanumeric_mixed"
}

// GenerateCustomVoucherCode generates a voucher code with custom charset, length, and prefix.
func GenerateCustomVoucherCode(opts VoucherCodeOptions) (string, error) {
	length := opts.Length
	if length <= 0 {
		length = 6
	}
	if length > 32 {
		length = 32
	}

	var charset string
	switch opts.CharType {
	case "numeric":
		charset = "0123456789"
	case "alpha_lower":
		charset = "abcdefghijklmnopqrstuvwxyz"
	case "alpha_upper":
		charset = "ABCDEFGHJKLMNPQRSTUVWXYZ"
	case "alphanumeric_lower":
		charset = "abcdefghjkmnpqrstuvwxyz23456789"
	case "alphanumeric_mixed":
		charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
	case "alphanumeric_upper":
		fallthrough
	default:
		charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	}

	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate custom voucher code: %w", err)
	}

	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}

	code := string(b)
	cleanPrefix := strings.TrimSpace(opts.Prefix)
	if cleanPrefix != "" {
		code = cleanPrefix + code
	}

	return code, nil
}

// GenerateVoucherCode generates a human-readable voucher code using
// cryptographically secure random bytes. Format: XXXX-XXXX-XXXX
// Uses base32 (uppercase, no ambiguous characters) for readability.
func GenerateVoucherCode(prefix string) (string, error) {
	b := make([]byte, 8) // 8 bytes → ~13 base32 chars
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate voucher code: %w", err)
	}

	// Use Crockford base32 (no I, L, O, U — avoids ambiguity)
	encoded := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)
	encoded = strings.ToUpper(encoded)

	// Take first 12 chars and format as XXXX-XXXX-XXXX
	if len(encoded) < 12 {
		encoded = strings.Repeat("A", 12-len(encoded)) + encoded
	}
	code := encoded[:4] + "-" + encoded[4:8] + "-" + encoded[8:12]

	if prefix != "" {
		code = strings.ToUpper(prefix) + "-" + code
	}

	return code, nil
}

// GenerateProvisioningToken generates a short-lived provisioning token
// for Passpoint credential delivery. Returns a URL-safe base64 token.
func GenerateProvisioningToken() (string, error) {
	return GenerateToken(DefaultTokenBytes)
}

// GeneratePassword generates a random strong password of the given length.
// Uses a charset that avoids ambiguous characters (0, O, l, 1, I).
func GeneratePassword(length int) (string, error) {
	const charset = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#%^&*"
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate password: %w", err)
	}
	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}
	return string(b), nil
}

// GenerateNumericCode generates a cryptographically secure random numeric string of given length (e.g. 12 digits).
func GenerateNumericCode(length int) (string, error) {
	if length <= 0 {
		length = 12
	}
	const digits = "0123456789"
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate numeric code: %w", err)
	}
	for i := range b {
		b[i] = digits[int(b[i])%10]
	}
	return string(b), nil
}
