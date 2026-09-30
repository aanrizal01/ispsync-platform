package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	// Server
	Env        string
	ServerPort int
	ServerHost string

	// Database
	DatabaseURL          string
	DatabaseMaxOpenConns int
	DatabaseMaxIdleConns int
	DatabaseConnMaxLife  time.Duration

	// Redis
	RedisURL      string
	RedisPassword string
	RedisDB       int

	// JWT
	JWTPrivateKeyPath  string
	JWTPublicKeyPath   string
	JWTAccessTokenTTL  time.Duration
	JWTRefreshTokenTTL time.Duration

	// CORS
	AllowedOrigins []string

	// Rate limiting
	RateLimitRPM          int // requests per minute (unauthenticated)
	RateLimitAuthRPM      int // requests per minute (authenticated)

	// App
	AppName    string
	AppBaseURL string

	// Logging
	LogLevel  string
	LogFormat string // json | console

	// Migration
	MigrationsPath string

	// ISP Onboarding & NOC Service Integration
	ISPBaseURL     string
	ISPAdminKey    string
	ISPJartaplokKey string
}

// Load reads configuration from environment variables.
// It loads .env file if present (development), and falls back to OS env vars.
func Load() (*Config, error) {
	// Load .env file if it exists (ignore error — production won't have it)
	_ = godotenv.Load()

	cfg := &Config{
		Env:                   getEnv("ENV", "development"),
		ServerPort:            getEnvInt("SERVER_PORT", 8080),
		ServerHost:            getEnv("SERVER_HOST", "0.0.0.0"),
		DatabaseURL:           mustGetEnv("DATABASE_URL"),
		DatabaseMaxOpenConns:  getEnvInt("DB_MAX_OPEN_CONNS", 25),
		DatabaseMaxIdleConns:  getEnvInt("DB_MAX_IDLE_CONNS", 10),
		DatabaseConnMaxLife:   getEnvDuration("DB_CONN_MAX_LIFE", 5*time.Minute),
		RedisURL:              getEnv("REDIS_URL", "redis://localhost:6379"),
		RedisPassword:         getEnv("REDIS_PASSWORD", ""),
		RedisDB:               getEnvInt("REDIS_DB", 0),
		JWTPrivateKeyPath:     getEnv("JWT_PRIVATE_KEY_PATH", "./keys/private.pem"),
		JWTPublicKeyPath:      getEnv("JWT_PUBLIC_KEY_PATH", "./keys/public.pem"),
		JWTAccessTokenTTL:     getEnvDuration("JWT_ACCESS_TOKEN_TTL", 15*time.Minute),
		JWTRefreshTokenTTL:    getEnvDuration("JWT_REFRESH_TOKEN_TTL", 7*24*time.Hour),
		RateLimitRPM:          getEnvInt("RATE_LIMIT_RPM", 100),
		RateLimitAuthRPM:      getEnvInt("RATE_LIMIT_AUTH_RPM", 1000),
		AppName:               getEnv("APP_NAME", "ISP Billing Platform"),
		AppBaseURL:            getEnv("APP_BASE_URL", "http://localhost:8080"),
		LogLevel:              getEnv("LOG_LEVEL", "info"),
		LogFormat:             getEnv("LOG_FORMAT", "json"),
		MigrationsPath:        getEnv("MIGRATIONS_PATH", "migrations"),
		ISPBaseURL:            getEnv("ISP_BASE_URL", "http://127.0.0.1:8081"),
		ISPAdminKey:           getEnv("ISP_ADMIN_KEY", "isp-onboarding-admin-key"),
		ISPJartaplokKey:       getEnv("ISP_JARTAPLOK_KEY", "jartaplok2026"),
	}

	// Parse CORS origins from comma-separated string
	originsStr := getEnv("ALLOWED_ORIGINS", "http://localhost:3000")
	cfg.AllowedOrigins = splitCSV(originsStr)

	return cfg, nil
}

// IsDevelopment returns true when running in development mode.
func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

// IsProduction returns true when running in production mode.
func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

// ServerAddr returns the formatted host:port string for the HTTP server.
func (c *Config) ServerAddr() string {
	return fmt.Sprintf("%s:%d", c.ServerHost, c.ServerPort)
}

// ---- helpers ----

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("required environment variable %q is not set", key))
	}
	return v
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}

func splitCSV(s string) []string {
	var result []string
	for _, p := range splitRune(s, ',') {
		if t := trimSpace(p); t != "" {
			result = append(result, t)
		}
	}
	return result
}

func splitRune(s string, sep rune) []string {
	var parts []string
	start := 0
	for i, r := range s {
		if r == sep {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	parts = append(parts, s[start:])
	return parts
}

func trimSpace(s string) string {
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}
