package radius

import (
	"time"
)

type NAS struct {
	ID          int       `json:"id"`
	NasName     string    `json:"nasname"` // IP or Hostname
	ShortName   *string   `json:"shortname,omitempty"`
	Type        string    `json:"type"`    // mikrotik, cisco, juniper, other
	Ports       *int      `json:"ports,omitempty"`
	Secret      string    `json:"secret"`
	Description *string   `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type Session struct {
	RadAcctID        int64      `json:"radacctid"`
	AcctSessionID    string     `json:"acctsessionid"`
	AcctUniqueID     string     `json:"acctuniqueid"`
	Username         string     `json:"username"`
	GroupName        string     `json:"groupname"`
	NasIPAddress     string     `json:"nasipaddress"`
	NasPortID        *string    `json:"nasportid,omitempty"`
	AcctStartTime    time.Time  `json:"acctstarttime"`
	AcctUpdateTime   *time.Time `json:"acctupdatetime,omitempty"`
	AcctStopTime     *time.Time `json:"acctstoptime,omitempty"`
	AcctSessionTime  int64      `json:"acctsessiontime"` // In seconds
	AcctInputOctets  int64      `json:"acctinputoctets"` // Upload bytes
	AcctOutputOctets int64      `json:"acctoutputoctets"`// Download bytes
	CallingStationID string     `json:"callingstationid"`// MAC address
	FramedIPAddress  *string    `json:"framedipaddress,omitempty"`
	IsActive         bool       `json:"is_active"`
}

type AuthLog struct {
	ID           int64     `json:"id"`
	Username     string    `json:"username"`
	Reply        string    `json:"reply"` // Access-Accept / Access-Reject
	AuthDate     time.Time `json:"authdate"`
	NasIPAddress *string   `json:"nasipaddress,omitempty"`
}

// Request / Response DTOs

type CreateNASRequest struct {
	NasName     string  `json:"nasname" validate:"required"`
	ShortName   *string `json:"shortname"`
	Type        string  `json:"type" validate:"required,oneof=mikrotik cisco juniper other"`
	Secret      string  `json:"secret" validate:"required,min=4"`
	Description *string `json:"description"`
}

type DisconnectSessionRequest struct {
	NasIPAddress  string `json:"nas_ip_address" validate:"required"`
	Username      string `json:"username" validate:"required"`
	FramedIP      string `json:"framed_ip"`
	AcctSessionID string `json:"acct_session_id"`
}
