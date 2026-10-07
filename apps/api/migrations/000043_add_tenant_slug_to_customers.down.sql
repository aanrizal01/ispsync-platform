DROP INDEX IF EXISTS idx_customers_tenant_slug;
ALTER TABLE customers DROP COLUMN IF EXISTS tenant_slug;
