-- Migration: 000012 — Multi-Channel Notification Engine
-- Tables: notification_templates, notifications

CREATE TABLE notification_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(64) UNIQUE NOT NULL,
    channel             VARCHAR(32) NOT NULL
                        CHECK (channel IN ('WHATSAPP', 'TELEGRAM', 'EMAIL', 'WEBHOOK')),
    subject             VARCHAR(255),
    body                TEXT NOT NULL,
    variables           JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_templates_code ON notification_templates (code);
CREATE INDEX idx_notification_templates_channel ON notification_templates (channel);

CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
    channel             VARCHAR(32) NOT NULL
                        CHECK (channel IN ('WHATSAPP', 'TELEGRAM', 'EMAIL', 'WEBHOOK')),
    recipient           VARCHAR(255) NOT NULL,
    subject             VARCHAR(255),
    body                TEXT NOT NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    error_message       TEXT,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient);
CREATE INDEX idx_notifications_customer ON notifications (customer_id);
CREATE INDEX idx_notifications_channel ON notifications (channel);
CREATE INDEX idx_notifications_status ON notifications (status);
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);

-- Seed Default Notification Templates
INSERT INTO notification_templates (code, channel, subject, body, variables) VALUES
(
    'INVOICE_ISSUED_WA',
    'WHATSAPP',
    NULL,
    'Halo {{customer_name}}, tagihan internet Anda nomor {{invoice_number}} sebesar Rp {{amount}} telah terbit. Silakan lakukan pembayaran sebelum tanggal {{due_date}}. Tautan pembayaran: {{payment_url}} . Terima kasih telah menggunakan layanan kami.',
    '["customer_name", "invoice_number", "amount", "due_date", "payment_url"]'::jsonb
),
(
    'INVOICE_ISSUED_TG',
    'TELEGRAM',
    'Tagihan Internet Baru',
    'Halo <b>{{customer_name}}</b>,\n\nTagihan internet Anda dengan nomor <code>{{invoice_number}}</code> sebesar <b>Rp {{amount}}</b> telah diterbitkan.\nJatuh tempo: <b>{{due_date}}</b>.\n\nSilakan lakukan pembayaran melalui tautan berikut:\n<a href="{{payment_url}}">Bayar Sekarang</a>\n\nTerima kasih.',
    '["customer_name", "invoice_number", "amount", "due_date", "payment_url"]'::jsonb
),
(
    'PAYMENT_CONFIRMED_WA',
    'WHATSAPP',
    NULL,
    'Pembayaran invoice {{invoice_number}} sebesar Rp {{amount}} atas nama {{customer_name}} telah berhasil diterima. Layanan internet Anda tetap aktif. Terima kasih.',
    '["customer_name", "invoice_number", "amount"]'::jsonb
),
(
    'PAYMENT_CONFIRMED_TG',
    'TELEGRAM',
    'Pembayaran Diterima',
    '✅ <b>Pembayaran Berhasil</b>\n\nPelanggan: <b>{{customer_name}}</b>\nInvoice: <code>{{invoice_number}}</code>\nJumlah: <b>Rp {{amount}}</b>\n\nLayanan internet Anda tetap aktif normal. Terima kasih.',
    '["customer_name", "invoice_number", "amount"]'::jsonb
),
(
    'NOC_ROUTER_ALERT_TG',
    'TELEGRAM',
    '⚠️ Peringatan Router NOC',
    '🚨 <b>NOC ALERT: Router Offline / Error</b>\n\nNama Router: <b>{{router_name}}</b>\nAlamat IP: <code>{{ip_address}}</code>\nStatus: <b>{{status}}</b>\nWaktu: {{timestamp}}\n\nMohon tim teknisi segera melakukan pengecekan.',
    '["router_name", "ip_address", "status", "timestamp"]'::jsonb
)
ON CONFLICT (code) DO NOTHING;
