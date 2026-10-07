ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'dev';
CREATE INDEX IF NOT EXISTS idx_customers_tenant_slug ON customers(tenant_slug);
