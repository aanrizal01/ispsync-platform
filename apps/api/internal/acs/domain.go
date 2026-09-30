package acs

import (
	"time"

	"github.com/google/uuid"
)

type VendorType string

const (
	VendorZTE       VendorType = "ZTE"
	VendorHuawei    VendorType = "HUAWEI"
	VendorFiberhome VendorType = "FIBERHOME"
	VendorVSOL      VendorType = "VSOL"
	VendorOther     VendorType = "OTHER"
)

type OpticalStatus string

const (
	OpticalExcellent   OpticalStatus = "EXCELLENT"    // -15 dBm to -23 dBm
	OpticalNormal      OpticalStatus = "NORMAL"       // -23 dBm to -26 dBm
	OpticalWarning     OpticalStatus = "WARNING"      // -26 dBm to -28 dBm
	OpticalCriticalLOS OpticalStatus = "CRITICAL_LOS" // < -28 dBm
)

type ConnectionStatus string

const (
	StatusOnline  ConnectionStatus = "ONLINE"
	StatusOffline ConnectionStatus = "OFFLINE"
)

type CustomerONT struct {
	ID               uuid.UUID        `json:"id"`
	CustomerID       uuid.UUID        `json:"customer_id"`
	CustomerName     string           `json:"customer_name,omitempty"`
	CustomerPhone    string           `json:"customer_phone,omitempty"`
	AccessAccountID  *uuid.UUID       `json:"access_account_id,omitempty"`
	SerialNumber     string           `json:"serial_number"`
	MACAddress       string           `json:"mac_address"`
	Vendor           VendorType       `json:"vendor"`
	Model            string           `json:"model"`
	HardwareVersion  string           `json:"hardware_version"`
	SoftwareVersion  string           `json:"software_version"`
	WiFiSSID         string           `json:"wifi_ssid"`
	WiFiPassword     string           `json:"wifi_password"`
	WiFiSecurity     string           `json:"wifi_security"`
	WiFiChannel      int              `json:"wifi_channel"`
	IsWiFiEnabled    bool             `json:"is_wifi_enabled"`
	RxOpticalPower   float64          `json:"rx_optical_power"` // in dBm
	TxOpticalPower   float64          `json:"tx_optical_power"` // in dBm
	OpticalStatus    OpticalStatus    `json:"optical_status"`
	ConnectionStatus ConnectionStatus `json:"connection_status"`
	IPAddress        string           `json:"ip_address"`
	UptimeSeconds    int64            `json:"uptime_seconds"`
	LastInformAt     time.Time        `json:"last_inform_at"`
	Notes            string           `json:"notes"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
}

type UpdateWiFiRequest struct {
	SSID     string `json:"ssid"`
	Password string `json:"password"`
}

type RegisterONTRequest struct {
	CustomerID   uuid.UUID  `json:"customer_id"`
	SerialNumber string     `json:"serial_number"`
	MACAddress   string     `json:"mac_address"`
	Vendor       VendorType `json:"vendor"`
	Model        string     `json:"model"`
	WiFiSSID     string     `json:"wifi_ssid"`
	WiFiPassword string     `json:"wifi_password"`
	Notes        string     `json:"notes"`
}
