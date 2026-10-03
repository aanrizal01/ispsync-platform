-- Migration: 000031 — Add Agent Registration Fields and Verification Status
-- Tables: agents

-- Update status check constraint to include PENDING and REJECTED
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_status_check;
ALTER TABLE agents ADD CONSTRAINT agents_status_check 
    CHECK (status IN ('ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED', 'TERMINATED'));

-- Add registration identity and verification document fields
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS id_card_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS ktp_url TEXT,
    ADD COLUMN IF NOT EXISTS business_photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_agents_id_card ON agents (id_card_number);
