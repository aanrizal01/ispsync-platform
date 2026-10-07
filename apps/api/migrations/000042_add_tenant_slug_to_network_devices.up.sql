ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'dev';
CREATE INDEX IF NOT EXISTS idx_network_devices_tenant_slug ON network_devices(tenant_slug);
