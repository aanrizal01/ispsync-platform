DROP INDEX IF EXISTS idx_network_devices_tenant_slug;
ALTER TABLE network_devices DROP COLUMN IF EXISTS tenant_slug;
