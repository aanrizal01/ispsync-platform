ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'dev';
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_slug ON invoices(tenant_slug);
