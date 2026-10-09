-- Migration 000056: Isolate audit_logs per tenant
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) NOT NULL DEFAULT 'dev';
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_slug ON audit_logs (tenant_slug);

-- Update historical audit logs
UPDATE audit_logs SET tenant_slug = 'superadmin' WHERE action = 'AdminUserSeeded';
UPDATE audit_logs SET tenant_slug = 'dev' WHERE actor_email LIKE '%dev%' OR actor_email = 'private@ispsync.id';
