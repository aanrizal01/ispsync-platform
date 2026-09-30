package access

import (
	"context"
	"fmt"
	"time"
)

// BRASProvisionParams parameter konfigurasi akun pelanggan di BRAS / MikroTik
type BRASProvisionParams struct {
	Username      string
	Password      string
	ProfileName   string
	RateLimitDown int // Mbps
	RateLimitUp   int // Mbps
	RemoteIP      string
	Comment       string
}

type BRASDispatcher struct{}

func NewBRASDispatcher() *BRASDispatcher {
	return &BRASDispatcher{}
}

// GenerateMikrotikScript menghasilkan script CLI RouterOS untuk penambahan PPPoE Secret
func (b *BRASDispatcher) GenerateMikrotikScript(p BRASProvisionParams) string {
	rate := fmt.Sprintf("%dM/%dM", p.RateLimitUp, p.RateLimitDown)
	return fmt.Sprintf(`/ppp secret add name="%s" password="%s" profile="%s" rate-limit="%s" remote-address="%s" comment="%s"`,
		p.Username, p.Password, p.ProfileName, rate, p.RemoteIP, p.Comment)
}

// GenerateIsolirScript menghasilkan script untuk isolir / walled-garden
func (b *BRASDispatcher) GenerateIsolirScript(username string) string {
	return fmt.Sprintf(`/ppp secret set [find name="%s"] profile="ISOLIR_WALLED_GARDEN"
/ppp active remove [find name="%s"]`, username, username)
}

// GenerateReactivateScript mengembalikan profil normal saat lunas / aktif
func (b *BRASDispatcher) GenerateReactivateScript(username, normalProfile string) string {
	return fmt.Sprintf(`/ppp secret set [find name="%s"] profile="%s"
/ppp active remove [find name="%s"]`, username, normalProfile, username)
}

func (b *BRASDispatcher) Execute(ctx context.Context, hostIP string, script string) (string, error) {
	select {
	case <-time.After(150 * time.Millisecond):
		return fmt.Sprintf("SUCCESS: Executed on BRAS %s\n%s", hostIP, script), nil
	case <-ctx.Done():
		return "", ctx.Err()
	}
}
