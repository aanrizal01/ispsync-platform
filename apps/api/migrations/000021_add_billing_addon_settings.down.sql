-- Migration: 000021 Rollback — Remove Billing Addon Settings
DELETE FROM app_settings WHERE key = 'billing_addons';
