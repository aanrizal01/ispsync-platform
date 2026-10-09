-- Migration: 000050_add_missing_permissions_to_admin.down.sql

DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE slug IN (
        'partners:read', 'partners:write',
        'billing:read', 'billing:write',
        'notifications:read', 'notifications:write',
        'network:write'
    )
);

DELETE FROM permissions WHERE slug IN (
    'partners:read', 'partners:write',
    'billing:read', 'billing:write',
    'notifications:read', 'notifications:write',
    'network:write'
);
