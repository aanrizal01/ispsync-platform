-- Migration: 000051_add_tenant_slug_to_roles.down.sql

DELETE FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE slug = 'admin' LIMIT 1)
  AND permission_id = (SELECT id FROM permissions WHERE slug = 'admin:roles' LIMIT 1);

DROP INDEX IF EXISTS idx_roles_tenant_slug_slug;
DROP INDEX IF EXISTS idx_roles_tenant_slug;

-- Re-add global constraint if clean
ALTER TABLE roles ADD CONSTRAINT roles_slug_key UNIQUE (slug);
ALTER TABLE roles DROP COLUMN IF EXISTS tenant_slug;
