-- Migration: 000016 — Plan Groups & Cluster Area Pricing Assignment
-- Enables grouping plans by geographic cluster and assigning cluster coverage to specific plan packages.

CREATE TABLE IF NOT EXISTS plan_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    cluster_code    VARCHAR(10) NOT NULL DEFAULT '000',
    cluster_area    VARCHAR(100) NOT NULL DEFAULT 'Umum',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_groups_code ON plan_groups (code);
CREATE INDEX IF NOT EXISTS idx_plan_groups_cluster_code ON plan_groups (cluster_code);
CREATE INDEX IF NOT EXISTS idx_plan_groups_cluster_area ON plan_groups (cluster_area);

-- Alter plans table to link with plan_groups
ALTER TABLE plans ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES plan_groups(id) ON DELETE SET NULL;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS package_group VARCHAR(100) NOT NULL DEFAULT 'UMUM';

CREATE INDEX IF NOT EXISTS idx_plans_group_id ON plans (group_id);
CREATE INDEX IF NOT EXISTS idx_plans_package_group ON plans (package_group);

-- Seed initial standard cluster groups
INSERT INTO plan_groups (id, name, code, description, cluster_code, cluster_area, is_active)
VALUES 
    ('b0000001-0000-0000-0000-000000000000', 'Group Standar / Umum', 'GRP-DEFAULT', 'Paket standar retail nasional', '000', 'Nasional', true)
ON CONFLICT (code) DO NOTHING;

-- Default all existing plans to GRP-DEFAULT
UPDATE plans 
SET group_id = 'b0000001-0000-0000-0000-000000000000',
    package_group = 'UMUM'
WHERE group_id IS NULL;
