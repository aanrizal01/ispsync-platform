DROP INDEX IF EXISTS idx_nas_tenant_slug;
ALTER TABLE nas DROP COLUMN IF EXISTS tenant_slug;
