package network

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Vendor string

const (
	VendorMikroTik Vendor = "MIKROTIK"
	VendorJuniper  Vendor = "JUNIPER"
	VendorGeneric  Vendor = "GENERIC"
)

type DeviceStatus string

const (
	StatusOnline  DeviceStatus = "ONLINE"
	StatusOffline DeviceStatus = "OFFLINE"
	StatusUnknown DeviceStatus = "UNKNOWN"
	StatusError   DeviceStatus = "ERROR"
)

type Device struct {
	ID                uuid.UUID      `json:"id"`
	TenantSlug        string         `json:"tenant_slug,omitempty"`
	Name              string         `json:"name"`
	Vendor            Vendor         `json:"vendor"`
	Model             *string        `json:"model,omitempty"`
	IPAddress         string         `json:"ip_address"`
	APIPort           int            `json:"api_port"`
	AuthType          string         `json:"auth_type"` // BASIC, TOKEN, SSH_KEY
	Username          string         `json:"username"`
	PasswordEncrypted string         `json:"-"`
	UseTLS            bool           `json:"use_tls"`
	IsActive          bool           `json:"is_active"`
	Status            DeviceStatus   `json:"status"`
	LastSeenAt        *time.Time     `json:"last_seen_at,omitempty"`
	Metadata          map[string]any `json:"metadata,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

type DeviceLog struct {
	ID          uuid.UUID `json:"id"`
	DeviceID    uuid.UUID `json:"device_id"`
	Action      string    `json:"action"`
	Status      string    `json:"status"`
	Details     *string   `json:"details,omitempty"`
	ExecutedAt  time.Time `json:"executed_at"`
}

type SystemInfo struct {
	Uptime       string `json:"uptime"`
	Version      string `json:"version"`
	CPULoad      int    `json:"cpu_load"`
	FreeMemory   int64  `json:"free_memory"`
	TotalMemory  int64  `json:"total_memory"`
	FreeHDD      int64  `json:"free_hdd"`
	TotalHDD     int64  `json:"total_hdd"`
	BoardName    string `json:"board_name"`
	Architecture string `json:"architecture"`
}

type PPPoEProfile struct {
	Name          string   `json:"name"`
	LocalAddress  string   `json:"local_address,omitempty"`
	RemoteAddress string   `json:"remote_address,omitempty"`
	RateLimit     string   `json:"rate_limit,omitempty"` // e.g. "10M/20M"
	DNSServers    []string `json:"dns_servers,omitempty"`
	OnlyOne       bool     `json:"only_one"`
}

type PPPoESecret struct {
	Username      string `json:"username"`
	Password      string `json:"password"`
	Profile       string `json:"profile"`
	Service       string `json:"service"` // "pppoe" or "any"
	RemoteAddress string `json:"remote_address,omitempty"`
	Comment       string `json:"comment,omitempty"`
	Disabled      bool   `json:"disabled"`
}

type SimpleQueue struct {
	Name           string `json:"name"`
	Target         string `json:"target"` // e.g. "192.168.10.50/32"
	MaxLimit       string `json:"max_limit"` // e.g. "10M/20M"
	BurstLimit     string `json:"burst_limit,omitempty"`
	BurstThreshold string `json:"burst_threshold,omitempty"`
	BurstTime      string `json:"burst_time,omitempty"`
	Priority       string `json:"priority,omitempty"`
	Comment        string `json:"comment,omitempty"`
	Disabled       bool   `json:"disabled"`
}

type WalledGardenEntry struct {
	DstHost string `json:"dst_host"`
	DstPort string `json:"dst_port,omitempty"`
	Path    string `json:"path,omitempty"`
	Action  string `json:"action"` // "allow"
	Comment string `json:"comment,omitempty"`
}

// DeviceAdapter is the vendor-neutral interface for network router operations.
type DeviceAdapter interface {
	Ping(ctx context.Context) error
	GetSystemInfo(ctx context.Context) (*SystemInfo, error)
	SyncPPPoEProfile(ctx context.Context, profile PPPoEProfile) error
	ProvisionPPPoEUser(ctx context.Context, secret PPPoESecret) error
	DeprovisionPPPoEUser(ctx context.Context, username string) error
	SetSimpleQueue(ctx context.Context, queue SimpleQueue) error
	RemoveSimpleQueue(ctx context.Context, name string) error
	AddWalledGarden(ctx context.Context, entry WalledGardenEntry) error
	DisconnectActiveSession(ctx context.Context, username string) error
}

// Request / Response DTOs

type CreateDeviceRequest struct {
	Name               string         `json:"name" validate:"required,min=2"`
	Vendor             Vendor         `json:"vendor" validate:"required,oneof=MIKROTIK JUNIPER GENERIC"`
	Model              *string        `json:"model"`
	IPAddress          string         `json:"ip_address" validate:"required,ip"`
	APIPort            int            `json:"api_port" validate:"required,min=1,max=65535"`
	AuthType           string         `json:"auth_type" validate:"required,oneof=BASIC TOKEN SSH_KEY"`
	Username           string         `json:"username" validate:"required"`
	Password           string         `json:"password" validate:"required"`
	UseTLS             bool           `json:"use_tls"`
	EnableRadius       bool           `json:"enable_radius"`
	RadiusSharedSecret *string        `json:"radius_shared_secret,omitempty"`
	Metadata           map[string]any `json:"metadata"`
}


type UpdateDeviceRequest struct {
	Name      string         `json:"name" validate:"required,min=2"`
	Model     *string        `json:"model"`
	IPAddress string         `json:"ip_address" validate:"required,ip"`
	APIPort   int            `json:"api_port" validate:"required,min=1,max=65535"`
	Username  string         `json:"username" validate:"required"`
	Password  *string        `json:"password,omitempty"`
	UseTLS    bool           `json:"use_tls"`
	IsActive  bool           `json:"is_active"`
	Metadata  map[string]any `json:"metadata"`
}

type TestConnectionResponse struct {
	Success    bool        `json:"success"`
	Message    string      `json:"message"`
	LatencyMS  int64       `json:"latency_ms"`
	SystemInfo *SystemInfo `json:"system_info,omitempty"`
}
