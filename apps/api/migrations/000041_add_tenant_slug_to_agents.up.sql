ALTER TABLE agents ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'dev';
CREATE INDEX IF NOT EXISTS idx_agents_tenant_slug ON agents(tenant_slug);
