package radius

import (
	"crypto/md5"
	"encoding/binary"
	"fmt"
	"net"
	"strings"
	"time"
)

// RFC 3576 / RFC 5176 RADIUS Dynamic Authorization & Packet of Disconnect (PoD) Codes
const (
	CodeDisconnectRequest = 40
	CodeDisconnectACK     = 41
	CodeDisconnectNAK     = 42
	CodeCoARequest        = 43
	CodeCoAACK            = 44
	CodeCoANAK            = 45

	DefaultCoAPort = 3799
)

// Standard RADIUS Attribute Types according to RFC 2865 & RFC 3576
const (
	AttrUserName        byte = 1
	AttrNASIPAddress    byte = 4
	AttrFramedIPAddress byte = 8
	AttrClass           byte = 25
	AttrNASIdentifier   byte = 32
	AttrAcctSessionID   byte = 44
	AttrEventTimestamp  byte = 55
	AttrErrorCause      byte = 101
)

// RADIUSAttribute represents a Type-Length-Value (TLV) field in a RADIUS packet.
type RADIUSAttribute struct {
	Type  byte
	Value []byte
}

// RFC3576Packet encapsulates a RADIUS CoA / PoD packet.
type RFC3576Packet struct {
	Code       byte
	Identifier byte
	Secret     string
	Attributes []RADIUSAttribute
}

// NewRFC3576Packet creates an empty packet for the given code and secret.
func NewRFC3576Packet(code byte, secret string) *RFC3576Packet {
	return &RFC3576Packet{
		Code:       code,
		Identifier: byte(time.Now().UnixNano() & 0xFF),
		Secret:     secret,
		Attributes: make([]RADIUSAttribute, 0),
	}
}

// AddString appends a string attribute.
func (p *RFC3576Packet) AddString(attrType byte, val string) {
	p.Attributes = append(p.Attributes, RADIUSAttribute{
		Type:  attrType,
		Value: []byte(val),
	})
}

// AddIP appends an IPv4 attribute (4 bytes).
func (p *RFC3576Packet) AddIP(attrType byte, ip net.IP) {
	if ipv4 := ip.To4(); ipv4 != nil {
		p.Attributes = append(p.Attributes, RADIUSAttribute{
			Type:  attrType,
			Value: ipv4,
		})
	}
}

// AddUint32 appends a 32-bit big-endian unsigned integer attribute.
func (p *RFC3576Packet) AddUint32(attrType byte, val uint32) {
	b := make([]byte, 4)
	binary.BigEndian.PutUint32(b, val)
	p.Attributes = append(p.Attributes, RADIUSAttribute{
		Type:  attrType,
		Value: b,
	})
}

// Encode builds the binary RADIUS packet with Request Authenticator computed per RFC 3576 Section 2.1:
// Request Authenticator = MD5(Code + Identifier + Length + 16 zero octets + Attributes + Shared Secret)
func (p *RFC3576Packet) Encode() ([]byte, error) {
	attrLen := 0
	for _, a := range p.Attributes {
		if len(a.Value) > 253 {
			return nil, fmt.Errorf("attribute type %d exceeds max length 253", a.Type)
		}
		attrLen += 2 + len(a.Value) // Type (1) + Length (1) + Value
	}

	totalLen := 20 + attrLen
	if totalLen > 4096 {
		return nil, fmt.Errorf("radius packet length %d exceeds max 4096", totalLen)
	}

	buf := make([]byte, totalLen)
	buf[0] = p.Code
	buf[1] = p.Identifier
	binary.BigEndian.PutUint16(buf[2:4], uint16(totalLen))

	// Bytes 4..19 initialized to 16 zero octets for hashing
	for i := 4; i < 20; i++ {
		buf[i] = 0
	}

	// Pack attributes
	offset := 20
	for _, a := range p.Attributes {
		buf[offset] = a.Type
		buf[offset+1] = byte(2 + len(a.Value))
		copy(buf[offset+2:], a.Value)
		offset += 2 + len(a.Value)
	}

	// Compute Request Authenticator: MD5(Code + Identifier + Length + 16-zeroes + Attributes + Secret)
	h := md5.New()
	h.Write(buf)
	h.Write([]byte(p.Secret))
	authenticator := h.Sum(nil)

	// Copy 16-byte authenticator into packet header (bytes 4..19)
	copy(buf[4:20], authenticator)

	return buf, nil
}

// SendRFC3576Disconnect transmits an RFC 3576 / RFC 5176 Disconnect-Request packet over UDP to target IP (port 3799).
func SendRFC3576Disconnect(targetIP string, port int, secret string, username, sessionID, framedIP string, timeout time.Duration) error {
	cleanIP := strings.Split(strings.TrimSpace(targetIP), "/")[0]
	if cleanIP == "" {
		return fmt.Errorf("target ip address is required")
	}
	if port <= 0 {
		port = DefaultCoAPort
	}
	if timeout <= 0 {
		timeout = 3 * time.Second
	}

	packet := NewRFC3576Packet(CodeDisconnectRequest, secret)
	if username != "" {
		packet.AddString(AttrUserName, username)
	}
	if sessionID != "" {
		packet.AddString(AttrAcctSessionID, sessionID)
	}
	if framedIP != "" {
		if ip := net.ParseIP(framedIP); ip != nil {
			packet.AddIP(AttrFramedIPAddress, ip)
		}
	}
	packet.AddUint32(AttrEventTimestamp, uint32(time.Now().Unix()))

	data, err := packet.Encode()
	if err != nil {
		return fmt.Errorf("failed to encode rfc3576 disconnect packet: %w", err)
	}

	raddr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("%s:%d", cleanIP, port))
	if err != nil {
		return fmt.Errorf("failed to resolve udp target %s:%d: %w", cleanIP, port, err)
	}

	conn, err := net.DialUDP("udp", nil, raddr)
	if err != nil {
		return fmt.Errorf("failed to dial udp target %s:%d: %w", cleanIP, port, err)
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(timeout))

	if _, err := conn.Write(data); err != nil {
		return fmt.Errorf("failed to write rfc3576 packet to %s:%d: %w", cleanIP, port, err)
	}

	// Try reading response ACK/NAK if NAS responds
	respBuf := make([]byte, 1024)
	n, _, err := conn.ReadFrom(respBuf)
	if err == nil && n >= 20 {
		respCode := respBuf[0]
		if respCode == CodeDisconnectNAK {
			return fmt.Errorf("nas %s returned Disconnect-NAK (Code 42)", cleanIP)
		}
	}

	return nil
}
