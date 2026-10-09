-- Migration 000054: Isolate plans, plan_groups, and passpoint_packages per tenant
-- 1. Add tenant_slug columns with indices
ALTER TABLE plans ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) NOT NULL DEFAULT 'dev';
ALTER TABLE plan_groups ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) NOT NULL DEFAULT 'dev';
ALTER TABLE passpoint_packages ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) NOT NULL DEFAULT 'dev';

CREATE INDEX IF NOT EXISTS idx_plans_tenant_slug ON plans (tenant_slug);
CREATE INDEX IF NOT EXISTS idx_plan_groups_tenant_slug ON plan_groups (tenant_slug);
CREATE INDEX IF NOT EXISTS idx_passpoint_packages_tenant_slug ON passpoint_packages (tenant_slug);

-- Update primary key on passpoint_packages to allow tenant isolation
ALTER TABLE passpoint_packages DROP CONSTRAINT IF EXISTS passpoint_packages_pkey;
ALTER TABLE passpoint_packages ADD CONSTRAINT passpoint_packages_pkey PRIMARY KEY (tenant_slug, id);

-- 2. Clean up orphan/debris plans and prices from deleted tenants (ispmu, dev)
DELETE FROM plan_prices WHERE plan_id IN (
    SELECT id FROM plans WHERE name IN ('Paket Warga 15 Mbps', 'Paket Bisnis 30 Mbps', 'Dev HyperSpeed 1 Gbps')
);
DELETE FROM plans WHERE name IN ('Paket Warga 15 Mbps', 'Paket Bisnis 30 Mbps', 'Dev HyperSpeed 1 Gbps');

-- 3. Scope surviving ISP plans to ispku
UPDATE plans SET tenant_slug = 'ispku' WHERE name IN ('Paket Home 20 Mbps', 'Paket Gamer 50 Mbps', 'Paket Kantor 100 Mbps');
UPDATE plan_groups SET tenant_slug = 'ispku';

-- 4. Scope seed passpoint packages to dev so new tenants start with clean isolated catalog
UPDATE passpoint_packages SET tenant_slug = 'dev' WHERE id IN ('pkg-passpoint-7d', 'pkg-passpoint-30d', 'pkg-passpoint-90d');
