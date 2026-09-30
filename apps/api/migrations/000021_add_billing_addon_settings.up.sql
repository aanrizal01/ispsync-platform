CREATE TABLE IF NOT EXISTS app_settings (key VARCHAR(100) PRIMARY KEY, value JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
-- Migration: 000021 — Add Billing Addon Settings (Default Public IP: Rp 50.000/bln)
INSERT INTO app_settings (key, value, updated_at)
VALUES (
    'billing_addons',
    '{"public_ip_monthly_price": 50000, "public_ip_description": "Sewa Add-on IP Publik Statik"}'::jsonb,
    NOW()
)
ON CONFLICT (key) DO NOTHING;
