-- Migration: 000026 Down — Revert Scratch Voucher Blanko System

DROP INDEX IF EXISTS idx_vouchers_activated_agent;
DROP INDEX IF EXISTS idx_vouchers_is_blank;
DROP INDEX IF EXISTS idx_vouchers_serial_number;

ALTER TABLE vouchers
    DROP COLUMN IF EXISTS activated_at,
    DROP COLUMN IF EXISTS activated_by_agent_id,
    DROP COLUMN IF EXISTS is_blank,
    DROP COLUMN IF EXISTS serial_number;

ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_status_check;
ALTER TABLE vouchers ADD CONSTRAINT vouchers_status_check 
    CHECK (status IN ('CREATED', 'UNUSED', 'ACTIVE', 'EXPIRED', 'DEPLETED', 'REVOKED'));
