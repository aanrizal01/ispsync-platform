-- Migration: 000049_add_tenant_slug_to_users.down.sql
DROP INDEX IF EXISTS idx_users_tenant_slug;
ALTER TABLE users DROP COLUMN IF EXISTS tenant_slug;
