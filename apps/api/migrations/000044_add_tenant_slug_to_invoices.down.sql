DROP INDEX IF EXISTS idx_invoices_tenant_slug;
ALTER TABLE invoices DROP COLUMN IF EXISTS tenant_slug;
