DROP INDEX IF EXISTS idx_agents_tenant_slug;
ALTER TABLE agents DROP COLUMN IF EXISTS tenant_slug;
