-- Migration: 000046_add_tenant_slug_to_passpoint.down.sql
DROP INDEX IF EXISTS idx_passpoint_credentials_tenant_slug;
ALTER TABLE passpoint_credentials DROP COLUMN IF EXISTS tenant_slug;

DROP INDEX IF EXISTS idx_passpoint_orders_tenant_slug;
ALTER TABLE passpoint_orders DROP COLUMN IF EXISTS tenant_slug;
