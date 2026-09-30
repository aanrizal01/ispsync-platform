package email

import (
	"context"
	"fmt"
	"net/smtp"
	"strings"
)

// Provider implements notification.Sender for SMTP Email.
type Provider struct {
	host      string
	port      int
	username  string
	password  string
	fromName  string
	fromEmail string
}

func NewProvider(host string, port int, username, password, fromName, fromEmail string) *Provider {
	return &Provider{
		host:      host,
		port:      port,
		username:  username,
		password:  password,
		fromName:  fromName,
		fromEmail: fromEmail,
	}
}

func (p *Provider) Send(ctx context.Context, recipient string, subject string, body string) error {
	if p.host == "" {
		// Simulation mode when SMTP host is not configured
		return nil
	}

	auth := smtp.PlainAuth("", p.username, p.password, p.host)
	addr := fmt.Sprintf("%s:%d", p.host, p.port)

	fromHeader := fmt.Sprintf("%s <%s>", p.fromName, p.fromEmail)
	if p.fromName == "" {
		fromHeader = p.fromEmail
	}

	headers := make(map[string]string)
	headers["From"] = fromHeader
	headers["To"] = recipient
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	var msg strings.Builder
	for k, v := range headers {
		msg.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	msg.WriteString("\r\n")
	msg.WriteString(body)

	return smtp.SendMail(addr, auth, p.fromEmail, []string{recipient}, []byte(msg.String()))
}
