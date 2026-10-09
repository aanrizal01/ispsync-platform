-- Migration: 000050_add_missing_permissions_to_admin.up.sql

-- 1. Insert missing permissions
INSERT INTO permissions (name, slug, module, action) VALUES
    ('View Partners',           'partners:read',       'partners',      'read'),
    ('Manage Partners',         'partners:write',      'partners',      'write'),
    ('View Billing & Expenses', 'billing:read',        'billing',       'read'),
    ('Manage Expenses',         'billing:write',       'billing',       'write'),
    ('View Notifications',      'notifications:read',  'notifications', 'read'),
    ('Manage Notifications',    'notifications:write', 'notifications', 'write'),
    ('Manage Network & ODP',    'network:write',       'network',       'write')
ON CONFLICT (slug) DO NOTHING;

-- 2. Grant all operational permissions to 'admin' role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'admin'
  AND p.slug IN (
    'partners:read', 'partners:write',
    'billing:read', 'billing:write',
    'notifications:read', 'notifications:write',
    'network:write'
  )
ON CONFLICT DO NOTHING;

-- 3. Grant billing & expense permissions to 'billing' role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'billing'
  AND p.slug IN ('billing:read', 'billing:write')
ON CONFLICT DO NOTHING;

-- 4. Grant read permissions to 'readonly' role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'readonly'
  AND p.slug IN ('partners:read', 'billing:read', 'notifications:read')
ON CONFLICT DO NOTHING;
