-- Migration: 000026 — Add Scratch Voucher Blanko System
-- Modifies: vouchers table to support unassigned blank scratch vouchers with Serial Numbers (SN)

-- 1. Allow template_id to be NULL for blank vouchers before agent injection
ALTER TABLE vouchers ALTER COLUMN template_id DROP NOT NULL;
ALTER TABLE voucher_batches ALTER COLUMN template_id DROP NOT NULL;

-- 2. Update status constraint to include 'BLANK'
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_status_check;
ALTER TABLE vouchers ADD CONSTRAINT vouchers_status_check 
    CHECK (status IN ('BLANK', 'CREATED', 'UNUSED', 'ACTIVE', 'EXPIRED', 'DEPLETED', 'REVOKED'));

-- 3. Add Serial Number and Blanko Tracking Columns
ALTER TABLE vouchers 
    ADD COLUMN IF NOT EXISTS serial_number VARCHAR(32) UNIQUE,
    ADD COLUMN IF NOT EXISTS is_blank BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS activated_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- 4. Create Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_vouchers_serial_number ON vouchers (serial_number);
CREATE INDEX IF NOT EXISTS idx_vouchers_is_blank ON vouchers (is_blank);
CREATE INDEX IF NOT EXISTS idx_vouchers_activated_agent ON vouchers (activated_by_agent_id);

-- 5. Sequence for Auto-Generating Serial Numbers
CREATE SEQUENCE IF NOT EXISTS voucher_sn_seq START WITH 260000000001;

