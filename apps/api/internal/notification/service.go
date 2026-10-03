package notification

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/gigabill/isp/internal/notification/providers/email"
	"github.com/gigabill/isp/internal/notification/providers/telegram"
	"github.com/gigabill/isp/internal/notification/providers/whatsapp"
	apperrors "github.com/gigabill/isp/internal/shared/errors"
)

type Service struct {
	repo       *Repository
	telegram   *telegram.Provider
	whatsapp   *whatsapp.Provider
	email      *email.Provider
	httpClient *http.Client
	logger     *slog.Logger
	waResolver func(ctx context.Context) (Sender, error)
}

func NewService(
	repo *Repository,
	telegram *telegram.Provider,
	whatsapp *whatsapp.Provider,
	email *email.Provider,
	logger *slog.Logger,
) *Service {
	return &Service{
		repo:       repo,
		telegram:   telegram,
		whatsapp:   whatsapp,
		email:      email,
		httpClient: &http.Client{Timeout: 10 * time.Second},
		logger:     logger,
	}
}

func (s *Service) SetWhatsAppResolver(fn func(ctx context.Context) (Sender, error)) {
	s.waResolver = fn
}

func (s *Service) SendNotification(ctx context.Context, req SendNotificationRequest) (*Notification, error) {
	now := time.Now()
	n := &Notification{
		ID:         uuid.New(),
		CustomerID: req.CustomerID,
		Channel:    req.Channel,
		Recipient:  req.Recipient,
		Subject:    &req.Subject,
		Body:       req.Body,
		Status:     StatusPending,
		CreatedAt:  now,
	}

	if err := s.repo.CreateNotification(ctx, n); err != nil {
		s.logger.Error("failed to create notification record", "error", err)
		return nil, apperrors.Internal(err)
	}

	// Dispatch to channel provider
	var sendErr error
	switch req.Channel {
	case ChannelTelegram:
		sendErr = s.telegram.Send(ctx, req.Recipient, req.Subject, req.Body)
	case ChannelWhatsApp:
		if s.waResolver != nil {
			if sender, err := s.waResolver(ctx); err == nil && sender != nil {
				sendErr = sender.Send(ctx, req.Recipient, req.Subject, req.Body)
				break
			}
		}
		sendErr = s.whatsapp.Send(ctx, req.Recipient, req.Subject, req.Body)
	case ChannelEmail:
		sendErr = s.email.Send(ctx, req.Recipient, req.Subject, req.Body)
	case ChannelWebhook:
		sendErr = s.sendWebhook(ctx, req.Recipient, req.Subject, req.Body)
	default:
		sendErr = fmt.Errorf("channel %s tidak didukung", req.Channel)
	}

	sentAt := time.Now()
	if sendErr != nil {
		errMsg := sendErr.Error()
		n.Status = StatusFailed
		n.ErrorMessage = &errMsg
		_ = s.repo.UpdateNotificationStatus(ctx, n.ID, StatusFailed, nil, &errMsg)
		s.logger.Error("notification dispatch failed",
			"channel", req.Channel,
			"recipient", req.Recipient,
			"error", sendErr,
		)
		return n, apperrors.Internal(sendErr)
	}

	n.Status = StatusSent
	n.SentAt = &sentAt
	_ = s.repo.UpdateNotificationStatus(ctx, n.ID, StatusSent, &sentAt, nil)
	s.logger.Info("notification dispatched successfully",
		"channel", req.Channel,
		"recipient", req.Recipient,
	)

	return n, nil
}

func (s *Service) DispatchTemplate(ctx context.Context, req DispatchTemplateRequest) (*Notification, error) {
	tmpl, err := s.repo.GetTemplateByCode(ctx, req.TemplateCode)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tmpl == nil {
		return nil, apperrors.NotFound("Template notifikasi tidak ditemukan atau tidak aktif")
	}

	subject := ""
	if tmpl.Subject != nil {
		subject = interpolateVariables(*tmpl.Subject, req.Data)
	}
	body := interpolateVariables(tmpl.Body, req.Data)

	return s.SendNotification(ctx, SendNotificationRequest{
		CustomerID: req.CustomerID,
		Channel:    tmpl.Channel,
		Recipient:  req.Recipient,
		Subject:    subject,
		Body:       body,
	})
}

func (s *Service) ListTemplates(ctx context.Context) ([]Template, error) {
	return s.repo.ListTemplates(ctx)
}

func (s *Service) UpdateTemplate(ctx context.Context, code string, req UpdateTemplateRequest) error {
	return s.repo.UpdateTemplate(ctx, code, req.Subject, req.Body, req.IsActive)
}

func (s *Service) ListNotifications(ctx context.Context, limit, offset int, channel *Channel, status *Status) ([]Notification, int64, error) {
	return s.repo.ListNotifications(ctx, limit, offset, channel, status)
}

func (s *Service) sendWebhook(ctx context.Context, webhookURL string, subject, body string) error {
	payload := fmt.Sprintf(`{"subject": %q, "body": %q, "timestamp": %q}`, subject, body, time.Now().Format(time.RFC3339))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, bytes.NewReader([]byte(payload)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("webhook returned status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

func interpolateVariables(text string, data map[string]string) string {
	for k, v := range data {
		placeholder := fmt.Sprintf("{{%s}}", k)
		text = strings.ReplaceAll(text, placeholder, v)
	}
	return text
}
