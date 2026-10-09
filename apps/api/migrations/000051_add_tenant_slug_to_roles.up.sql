-- Migration: 000051_add_tenant_slug_to_roles.up.sql

-- 1. Add tenant_slug column to roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT '';

-- 2. Drop global unique slug constraint so different tenants can define their own roles
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_slug_key;

-- 3. Create scoped unique index on (tenant_slug, slug)
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_tenant_slug_slug ON roles (tenant_slug, slug);
CREATE INDEX IF NOT EXISTS idx_roles_tenant_slug ON roles (tenant_slug);

-- 4. Grant admin:roles permission to admin role so tenant admins can manage roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'admin' AND p.slug = 'admin:roles'
ON CONFLICT DO NOTHING;
