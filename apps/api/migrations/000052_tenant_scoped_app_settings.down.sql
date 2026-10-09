-- Migration 000052 down: Tenant scoped app settings
DELETE FROM app_settings WHERE key IN (
    'invoice_template_dev',
    'domain_settings_dev',
    'payment_gateway_dev',
    'notification_settings_dev',
    'billing_addons_dev',
    'security_settings_dev'
);
