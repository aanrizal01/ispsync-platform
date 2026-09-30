package system

import "time"

type ServiceStatus struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Category    string    `json:"category"` // "database", "network", "core", "service"
	Status      string    `json:"status"`   // "OPERATIONAL", "DEGRADED", "DOWN"
	LatencyMs   float64   `json:"latency_ms"`
	Target      string    `json:"target"`
	Description string    `json:"description"`
	Details     string    `json:"details,omitempty"`
	LastChecked time.Time `json:"last_checked"`
}

type SystemStatusResponse struct {
	OverallStatus string          `json:"overall_status"` // "HEALTHY", "DEGRADED", "CRITICAL"
	CheckedAt     time.Time       `json:"checked_at"`
	Services      []ServiceStatus `json:"services"`
	Metrics       SystemMetrics   `json:"metrics"`
}

type SystemMetrics struct {
	ActiveRadiusSessions int     `json:"active_radius_sessions"`
	TotalNasRouters      int     `json:"total_nas_routers"`
	TotalCustomers       int     `json:"total_customers"`
	TotalActiveSubs      int     `json:"total_active_subs"`
	DbConnectionsOpen    int     `json:"db_connections_open"`
	DbConnectionsIdle    int     `json:"db_connections_idle"`
	ServerUptimeSeconds  int64   `json:"server_uptime_seconds"`
	ServerUptimeHuman    string  `json:"server_uptime_human"`
}
