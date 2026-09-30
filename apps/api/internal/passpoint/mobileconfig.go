package passpoint

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// GenerateAppleMobileConfig generates a valid Apple XML Configuration Profile (.mobileconfig)
// for automated iOS and macOS Passpoint / Hotspot 2.0 WPA2/WPA3-Enterprise onboarding.
func GenerateAppleMobileConfig(p *Profile, c *Credential) []byte {
	profileUUID := uuid.New().String()
	payloadUUID := uuid.New().String()

	var oisXML strings.Builder
	for _, oi := range p.RoamingConsortiumOIs {
		oisXML.WriteString(fmt.Sprintf("\t\t\t\t<string>%s</string>\n", oi))
	}

	xml := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadDisplayName</key>
	<string>%s WiFi Passpoint</string>
	<key>PayloadIdentifier</key>
	<string>%s.passpoint.%s</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>%s</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>PayloadType</key>
			<string>com.apple.wifi.managed</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>PayloadIdentifier</key>
			<string>%s.passpoint.wifi.%s</string>
			<key>PayloadUUID</key>
			<string>%s</string>
			<key>PayloadDisplayName</key>
			<string>%s</string>
			<key>SSID_STR</key>
			<string>%s</string>
			<key>AutoJoin</key>
			<true/>
			<key>CaptiveBypass</key>
			<true/>
			<key>EncryptionType</key>
			<string>WPA2</string>
			<key>IsHotspot</key>
			<true/>
			<key>DomainName</key>
			<string>%s</string>
			<key>DisplayedOperatorName</key>
			<string>%s</string>
			<key>ServiceProviderRoamingEnabled</key>
			<true/>
			<key>RoamingConsortiumOIs</key>
			<array>
%s			</array>
			<key>NAIRealmNames</key>
			<array>
				<string>%s</string>
			</array>
			<key>EAPClientConfiguration</key>
			<dict>
				<key>AcceptEAPTypes</key>
				<array>
					<integer>21</integer> <!-- 21 = EAP-TTLS -->
				</array>
				<key>TTLSInnerAuthentication</key>
				<string>MSCHAPv2</string>
				<key>OuterIdentity</key>
				<string>anonymous@%s</string>
				<key>UserName</key>
				<string>%s</string>
				<key>UserPassword</key>
				<string>%s</string>
			</dict>
		</dict>
	</array>
</dict>
</plist>`,
		p.OperatorFriendlyName,
		p.DomainName, c.ID.String(),
		profileUUID,
		p.DomainName, c.ID.String(),
		payloadUUID,
		p.OperatorFriendlyName,
		p.Name,
		p.DomainName,
		p.OperatorFriendlyName,
		oisXML.String(),
		p.Realm,
		p.Realm,
		c.Username,
		c.Password,
	)

	return bytes.TrimSpace([]byte(xml))
}
