-- Migration: 000002 — Auth & RBAC tables
-- Users, roles, permissions, and their join tables.
-- SECURITY: password_hash column is never included in SELECT * queries in application code.

-- ─────────────────────────────────────────
-- PERMISSIONS
-- ─────────────────────────────────────────
CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,                      -- human-readable: "Manage Customers"
    slug        TEXT NOT NULL UNIQUE,               -- machine: "customers:write"
    module      TEXT NOT NULL,                      -- "customers"
    action      TEXT NOT NULL,                      -- "write"
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permissions_module ON permissions (module);
CREATE INDEX idx_permissions_slug   ON permissions (slug);

-- ─────────────────────────────────────────
-- ROLES
-- ─────────────────────────────────────────
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,   -- system roles cannot be deleted
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roles_slug ON roles (slug);

-- ─────────────────────────────────────────
-- ROLE ↔ PERMISSION (join)
-- ─────────────────────────────────────────
CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT NOT NULL UNIQUE,             -- case-insensitive email
    password_hash   TEXT NOT NULL,                      -- bcrypt, never logged
    full_name       TEXT NOT NULL,
    phone           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    customer_id     UUID,                               -- FK added after customers table (Phase 3)
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ                         -- soft delete
);

CREATE INDEX idx_users_email      ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_customer   ON users (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_users_is_active  ON users (is_active) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────
-- USER ↔ ROLE (join)
-- ─────────────────────────────────────────
CREATE TABLE user_roles (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- ─────────────────────────────────────────
-- TOKEN BLACKLIST (for refresh token revocation)
-- Redis is primary; this is DB-level audit trail
-- ─────────────────────────────────────────
CREATE TABLE token_blacklist (
    jti         TEXT PRIMARY KEY,
    revoked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

-- Auto-clean expired blacklist entries via index (manual cleanup job)
CREATE INDEX idx_token_blacklist_expires ON token_blacklist (expires_at);

-- ─────────────────────────────────────────
-- SEED: Built-in system roles
-- ─────────────────────────────────────────
INSERT INTO roles (name, slug, description, is_system) VALUES
    ('Super Admin',    'super_admin', 'Full system access',                        TRUE),
    ('Admin',          'admin',       'Manage customers, billing, and network',     TRUE),
    ('Billing Staff',  'billing',     'Manage invoices and payments',               TRUE),
    ('Support Staff',  'support',     'Read-only access + session management',      TRUE),
    ('Customer',       'customer',    'Customer portal access (own data only)',      TRUE),
    ('Read Only',      'readonly',    'System-wide read-only access',               TRUE);

-- ─────────────────────────────────────────
-- SEED: Permissions
-- ─────────────────────────────────────────
INSERT INTO permissions (name, slug, module, action) VALUES
    -- Wildcard (super admin)
    ('All Access', '*', '*', '*'),

    -- Customers
    ('View Customers',   'customers:read',   'customers', 'read'),
    ('Manage Customers', 'customers:write',  'customers', 'write'),
    ('Delete Customers', 'customers:delete', 'customers', 'delete'),

    -- Plans
    ('View Plans',   'plans:read',  'plans', 'read'),
    ('Manage Plans', 'plans:write', 'plans', 'write'),

    -- Subscriptions
    ('View Subscriptions',   'subscriptions:read',  'subscriptions', 'read'),
    ('Manage Subscriptions', 'subscriptions:write', 'subscriptions', 'write'),

    -- Invoices
    ('View Invoices',   'invoices:read',  'invoices', 'read'),
    ('Manage Invoices', 'invoices:write', 'invoices', 'write'),
    ('Void Invoices',   'invoices:void',  'invoices', 'void'),

    -- Payments
    ('View Payments',   'payments:read',  'payments', 'read'),
    ('Record Payments', 'payments:write', 'payments', 'write'),

    -- Vouchers
    ('View Vouchers',   'vouchers:read',   'vouchers', 'read'),
    ('Manage Vouchers', 'vouchers:write',  'vouchers', 'write'),
    ('Revoke Vouchers', 'vouchers:revoke', 'vouchers', 'revoke'),

    -- Passpoint
    ('View Passpoint',   'passpoint:read',  'passpoint', 'read'),
    ('Manage Passpoint', 'passpoint:write', 'passpoint', 'write'),

    -- RADIUS
    ('View RADIUS',   'radius:read',  'radius', 'read'),
    ('Manage RADIUS', 'radius:write', 'radius', 'write'),

    -- Network
    ('View Network',          'network:read',       'network', 'read'),
    ('Disconnect Sessions',   'network:disconnect', 'network', 'disconnect'),

    -- Reports
    ('View Reports', 'reports:read', 'reports', 'read'),

    -- Admin / Settings
    ('Manage Users', 'admin:users',    'admin', 'users'),
    ('Manage Roles', 'admin:roles',    'admin', 'roles'),
    ('View Audit Log', 'admin:audit',  'admin', 'audit');

-- ─────────────────────────────────────────
-- SEED: Assign permissions to built-in roles
-- ─────────────────────────────────────────
-- Super Admin: all access via wildcard
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'super_admin' AND p.slug = '*';

-- Admin: everything except admin:roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'admin'
  AND p.slug IN (
    'customers:read','customers:write','customers:delete',
    'plans:read','plans:write',
    'subscriptions:read','subscriptions:write',
    'invoices:read','invoices:write','invoices:void',
    'payments:read','payments:write',
    'vouchers:read','vouchers:write','vouchers:revoke',
    'passpoint:read','passpoint:write',
    'radius:read','radius:write',
    'network:read','network:disconnect',
    'reports:read',
    'admin:users','admin:audit'
  );

-- Billing: invoices and payments
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'billing'
  AND p.slug IN (
    'customers:read',
    'subscriptions:read',
    'invoices:read','invoices:write','invoices:void',
    'payments:read','payments:write',
    'reports:read'
  );

-- Support: read-only + disconnect
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'support'
  AND p.slug IN (
    'customers:read',
    'plans:read',
    'subscriptions:read',
    'invoices:read',
    'payments:read',
    'vouchers:read',
    'radius:read',
    'network:read','network:disconnect'
  );

-- Readonly: all :read permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'readonly'
  AND p.action = 'read';

-- Customer: portal access (own data enforced at service layer)
-- No permissions inserted here — portal access controlled by customer_id in JWT
