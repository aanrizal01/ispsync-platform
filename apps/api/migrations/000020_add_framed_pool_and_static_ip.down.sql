-- Migration: 000020 Rollback — Remove Framed-Pool from plans and Static-IP from access_accounts

DROP INDEX IF EXISTS idx_access_accounts_static_ip;
DROP INDEX IF EXISTS idx_plans_framed_pool;

ALTER TABLE access_accounts DROP COLUMN IF EXISTS static_ip;
ALTER TABLE plans DROP COLUMN IF EXISTS framed_pool;
