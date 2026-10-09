-- Migration 000053: IPAM settings tenant isolation
-- Seed dev-specific keys from existing global records so that dev retains its configuration
-- while allowing new tenants (e.g. gbd, ispku, ispmu) to operate with their own clean default settings.

INSERT INTO app_settings (key, value, updated_at)
SELECT 'ipam_settings_dev', value, updated_at
FROM app_settings WHERE key = 'ipam_settings'
ON CONFLICT (key) DO NOTHING;
