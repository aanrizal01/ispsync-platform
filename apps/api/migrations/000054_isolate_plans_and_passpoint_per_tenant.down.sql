DROP INDEX IF EXISTS idx_passpoint_packages_tenant_slug;
DROP INDEX IF EXISTS idx_plan_groups_tenant_slug;
DROP INDEX IF EXISTS idx_plans_tenant_slug;

ALTER TABLE passpoint_packages DROP COLUMN IF EXISTS tenant_slug;
ALTER TABLE plan_groups DROP COLUMN IF EXISTS tenant_slug;
ALTER TABLE plans DROP COLUMN IF EXISTS tenant_slug;
