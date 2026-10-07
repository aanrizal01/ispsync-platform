-- Migration: 000045_add_tenant_slug_to_expenses.up.sql
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'dev';
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_slug ON expenses (tenant_slug);
