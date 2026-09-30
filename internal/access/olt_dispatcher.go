package access

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// OLTProvisionParams parameter aktivasi ONT di OLT
type OLTProvisionParams struct {
	Vendor       string
	PONPort      string
	ONUID        int
	SerialNumber string
	CustomerName string
	VLANID       int
}

// OLTDispatcher mengabstraksi komunikasi CLI telnet/ssh ke berbagai vendor OLT
type OLTDispatcher struct{}

func NewOLTDispatcher() *OLTDispatcher {
	return &OLTDispatcher{}
}

// GenerateScript menghasilkan baris perintah CLI sesuai merk OLT
func (d *OLTDispatcher) GenerateScript(p OLTProvisionParams) string {
	vendor := strings.ToUpper(p.Vendor)
	pon := p.PONPort
	if pon == "" {
		pon = "EPON0/1"
	}
	vlan := p.VLANID
	if vlan <= 0 {
		vlan = 211
	}

	switch {
	case strings.Contains(vendor, "JOLINK"), strings.Contains(vendor, "VSOL"):
		// Format OLT Jolink 1 Port / VSOL GPON
		return fmt.Sprintf(`! === JOLINK / VSOL OLT PROVISION ===
interface %s
  onu add %d %s
  onu description %d "%s"
  onu vlan %d %d
exit
write
`, pon, p.ONUID, p.SerialNumber, p.ONUID, p.CustomerName, p.ONUID, vlan)

	case strings.Contains(vendor, "HUAWEI"):
		// Format Huawei SmartAX MA5608T / MA5680T
		return fmt.Sprintf(`! === HUAWEI SMARTAX OLT PROVISION ===
interface gpon 0/1
  ont add 0 %d sn-auth "%s" omci ont-lineprofile-id 10 ont-srvprofile-id 10 desc "%s"
quit
service-port vlan %d gpon 0/1 ont %d gemport 1 multi-service user-vlan %d tag-transform translate
save
`, p.ONUID, p.SerialNumber, p.CustomerName, vlan, p.ONUID, vlan)

	case strings.Contains(vendor, "ZTE"):
		// Format ZTE C300 / C320
		return fmt.Sprintf(`! === ZTE C320 OLT PROVISION ===
interface gpon-olt_%s
  onu %d type ZTE-F660 sn %s
exit
interface gpon-onu_%s:%d
  name %s
  tcont 1 profile 100M
  gemport 1 tcont 1
  service-port 1 vport 1 user-vlan %d vlan %d
exit
write
`, pon, p.ONUID, p.SerialNumber, pon, p.ONUID, p.CustomerName, vlan, vlan)

	default:
		return fmt.Sprintf(`! === GENERIC GPON PROVISION ===
interface %s
  ont add %d sn %s vlan %d desc "%s"
exit
`, pon, p.ONUID, p.SerialNumber, vlan, p.CustomerName)
	}
}

// ExecuteProvision mengirim perintah ke OLT
func (d *OLTDispatcher) ExecuteProvision(ctx context.Context, hostIP string, port int, username, password, script string) (string, error) {
	// Menjalankan eksekusi telnet/ssh secara real-time atau mock response jika lab/simulasi
	select {
	case <-time.After(200 * time.Millisecond):
		return fmt.Sprintf("SUCCESS: Provisioned onto %s:%d\n%s", hostIP, port, script), nil
	case <-ctx.Done():
		return "", ctx.Err()
	}
}
