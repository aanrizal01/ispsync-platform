DROP INDEX IF EXISTS idx_audit_logs_tenant_slug;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS tenant_slug;
