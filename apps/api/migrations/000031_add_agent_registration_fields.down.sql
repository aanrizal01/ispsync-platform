-- Revert Migration: 000031 — Add Agent Registration Fields and Verification Status

DROP INDEX IF EXISTS idx_agents_id_card;

ALTER TABLE agents
    DROP COLUMN IF EXISTS business_photo_url,
    DROP COLUMN IF EXISTS ktp_url,
    DROP COLUMN IF EXISTS id_card_number,
    DROP COLUMN IF EXISTS address;

ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_status_check;
ALTER TABLE agents ADD CONSTRAINT agents_status_check 
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED'));
