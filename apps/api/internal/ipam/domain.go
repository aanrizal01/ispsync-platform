package ipam

import "time"

type IPAMSettings struct {
	Enabled         bool      `json:"enabled"`
	ServerURL       string    `json:"server_url"`
	AppID           string    `json:"app_id"`
	AppCode         string    `json:"app_code"` // Token / API Key
	DefaultSubnetID int       `json:"default_subnet_id"`
	AutoSync        bool      `json:"auto_sync"`
	UpdatedAt       time.Time `json:"updated_at,omitempty"`
}

type Subnet struct {
	ID          int    `json:"id"`
	Subnet      string `json:"subnet"`
	Mask        string `json:"mask"`
	Description string `json:"description"`
	SectionID   int    `json:"sectionId"`
	VLANID      int    `json:"vlanId"`
	CIDR        string `json:"cidr"`
}

type SubnetUsage struct {
	Used        int     `json:"used"`
	MaxHosts    int     `json:"maxhosts"`
	FreeHosts   int     `json:"freehosts"`
	FreePercent float64 `json:"freehosts_percent"`
}

type TestResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Code    int    `json:"code,omitempty"`
}

type FirstFreeResponse struct {
	SubnetID int    `json:"subnet_id"`
	IP       string `json:"ip"`
}
