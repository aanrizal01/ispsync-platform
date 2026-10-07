-- Migration: 000045_add_tenant_slug_to_expenses.down.sql
DROP INDEX IF EXISTS idx_expenses_tenant_slug;
ALTER TABLE expenses DROP COLUMN IF EXISTS tenant_slug;
