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
    ('b0000001-0000-0000-0000-000000000000', 'Group Standar / Umum', 'GRP-DEFAULT', 'Paket standar ritel nasional GoGiga', '000', 'Umum', true),
    ('b0000002-0000-0000-0000-000000000001', 'Cluster 001 - Biaro & Agam', 'GRP-001', 'Paket khusus wilayah coverage Cluster 001 Golden Net Biaro', '001', 'Golden Net Biaro', true),
    ('b0000003-0000-0000-0000-000000000002', 'Cluster 002 - Payakumbuh', 'GRP-002', 'Paket khusus wilayah coverage Cluster 002 Payakumbuh', '002', 'Golden Payakumbuh', true),
    ('b0000004-0000-0000-0000-000000000003', 'Cluster 003 - Sungai Geringging', 'GRP-003', 'Paket khusus wilayah coverage Cluster 003 Sungai Geringging', '003', 'Golden Sungai Geringging', true),
    ('b0000005-0000-0000-0000-000000000004', 'Cluster 004 - Harau (Koto Tuo)', 'GRP-004', 'Paket khusus wilayah coverage Cluster 004 Harau / Kantor Pusat', '004', 'Harau', true)
ON CONFLICT (code) DO NOTHING;

-- Default all existing plans to GRP-DEFAULT
UPDATE plans 
SET group_id = 'b0000001-0000-0000-0000-000000000000',
    package_group = 'UMUM'
WHERE group_id IS NULL;
