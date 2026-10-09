package radius

import (
	"crypto/md5"
	"encoding/binary"
	"net"
	"testing"
	"time"
)

func TestRFC3576PacketEncode(t *testing.T) {
	secret := "myRadiusSecret123"
	pkt := NewRFC3576Packet(CodeDisconnectRequest, secret)
	pkt.Identifier = 42

	pkt.AddString(AttrUserName, "user01@ispsync.id")
	pkt.AddString(AttrAcctSessionID, "sess-8899")
	pkt.AddIP(AttrFramedIPAddress, net.ParseIP("10.10.20.55"))
	pkt.AddUint32(AttrEventTimestamp, 1700000000)

	encoded, err := pkt.Encode()
	if err != nil {
		t.Fatalf("unexpected encode error: %v", err)
	}

	if len(encoded) < 20 {
		t.Fatalf("encoded packet too short: %d bytes", len(encoded))
	}

	if encoded[0] != CodeDisconnectRequest {
		t.Errorf("expected code %d, got %d", CodeDisconnectRequest, encoded[0])
	}

	if encoded[1] != 42 {
		t.Errorf("expected identifier 42, got %d", encoded[1])
	}

	totalLen := binary.BigEndian.Uint16(encoded[2:4])
	if int(totalLen) != len(encoded) {
		t.Errorf("header length mismatch: header says %d, actual %d", totalLen, len(encoded))
	}

	// Verify RFC 3576 Section 2.1 Request Authenticator:
	// MD5(Code + Identifier + Length + 16 zero octets + Attributes + Shared Secret)
	checkBuf := make([]byte, len(encoded))
	copy(checkBuf, encoded)
	for i := 4; i < 20; i++ {
		checkBuf[i] = 0
	}

	h := md5.New()
	h.Write(checkBuf)
	h.Write([]byte(secret))
	expectedAuth := h.Sum(nil)

	actualAuth := encoded[4:20]
	for i := 0; i < 16; i++ {
		if actualAuth[i] != expectedAuth[i] {
			t.Fatalf("request authenticator mismatch at byte %d: expected %x, got %x", i, expectedAuth, actualAuth)
		}
	}
}

func TestSendRFC3576DisconnectUDP(t *testing.T) {
	// Start mock UDP server on localhost
	addr, err := net.ResolveUDPAddr("udp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to resolve UDP addr: %v", err)
	}

	serverConn, err := net.ListenUDP("udp", addr)
	if err != nil {
		t.Fatalf("failed to listen UDP: %v", err)
	}
	defer serverConn.Close()

	port := serverConn.LocalAddr().(*net.UDPAddr).Port
	secret := "test-secret"
	targetUser := "sub-juniper-01"
	targetSession := "sess-12345"

	receivedChan := make(chan []byte, 1)
	go func() {
		buf := make([]byte, 1024)
		n, clientAddr, readErr := serverConn.ReadFrom(buf)
		if readErr == nil && n >= 20 {
			receivedChan <- buf[:n]
			// Respond with Disconnect-ACK (Code 41)
			ack := make([]byte, 20)
			ack[0] = CodeDisconnectACK
			ack[1] = buf[1] // mirror identifier
			binary.BigEndian.PutUint16(ack[2:4], 20)
			_, _ = serverConn.WriteTo(ack, clientAddr)
		}
	}()

	err = SendRFC3576Disconnect("127.0.0.1", port, secret, targetUser, targetSession, "10.0.0.1", 2*time.Second)
	if err != nil {
		t.Fatalf("SendRFC3576Disconnect returned error: %v", err)
	}

	select {
	case data := <-receivedChan:
		if data[0] != CodeDisconnectRequest {
			t.Errorf("received packet code was %d, expected %d", data[0], CodeDisconnectRequest)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for UDP packet")
	}
}
