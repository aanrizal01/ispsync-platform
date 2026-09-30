-- Migration: 000020 — Add Framed-Pool to plans and Static-IP to access_accounts

ALTER TABLE plans ADD COLUMN IF NOT EXISTS framed_pool VARCHAR(64) DEFAULT NULL;
ALTER TABLE access_accounts ADD COLUMN IF NOT EXISTS static_ip VARCHAR(64) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_plans_framed_pool ON plans (framed_pool) WHERE framed_pool IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_access_accounts_static_ip ON access_accounts (static_ip) WHERE static_ip IS NOT NULL;
