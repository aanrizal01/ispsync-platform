-- Migration 000052: Tenant scoped app settings
-- Seed dev-specific keys from existing global records so that dev retains its configuration
-- while allowing other tenants (e.g. gbd, ispku, ispmu) to operate with their own isolated settings.

INSERT INTO app_settings (key, value, updated_at)
SELECT 'invoice_template_dev', value, updated_at
FROM app_settings WHERE key = 'invoice_template'
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, updated_at)
SELECT 'domain_settings_dev', value, updated_at
FROM app_settings WHERE key = 'domain_settings'
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, updated_at)
SELECT 'payment_gateway_dev', value, updated_at
FROM app_settings WHERE key = 'payment_gateway'
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, updated_at)
SELECT 'notification_settings_dev', value, updated_at
FROM app_settings WHERE key = 'notification_settings'
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, updated_at)
SELECT 'billing_addons_dev', value, updated_at
FROM app_settings WHERE key = 'billing_addons'
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, updated_at)
SELECT 'security_settings_dev', value, updated_at
FROM app_settings WHERE key = 'security_settings'
ON CONFLICT (key) DO NOTHING;
