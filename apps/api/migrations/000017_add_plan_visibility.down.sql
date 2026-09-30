DROP INDEX IF EXISTS idx_plans_is_visible;
ALTER TABLE plans DROP COLUMN IF EXISTS is_visible;
