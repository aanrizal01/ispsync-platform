package network

import (
	"time"

	"github.com/gigabill/isp/internal/radius"
)

// Re-export constants and functions from package radius for backward compatibility
const (
	CodeDisconnectRequest = radius.CodeDisconnectRequest
	CodeDisconnectACK     = radius.CodeDisconnectACK
	CodeDisconnectNAK     = radius.CodeDisconnectNAK
	CodeCoARequest        = radius.CodeCoARequest
	CodeCoAACK            = radius.CodeCoAACK
	CodeCoANAK            = radius.CodeCoANAK

	DefaultCoAPort = radius.DefaultCoAPort

	AttrUserName        = radius.AttrUserName
	AttrNASIPAddress    = radius.AttrNASIPAddress
	AttrFramedIPAddress = radius.AttrFramedIPAddress
	AttrClass           = radius.AttrClass
	AttrNASIdentifier   = radius.AttrNASIdentifier
	AttrAcctSessionID   = radius.AttrAcctSessionID
	AttrEventTimestamp  = radius.AttrEventTimestamp
	AttrErrorCause      = radius.AttrErrorCause
)

// SendRFC3576Disconnect transmits an RFC 3576 / RFC 5176 Disconnect-Request packet over UDP to target IP (port 3799).
func SendRFC3576Disconnect(targetIP string, port int, secret string, username, sessionID, framedIP string, timeout time.Duration) error {
	return radius.SendRFC3576Disconnect(targetIP, port, secret, username, sessionID, framedIP, timeout)
}
