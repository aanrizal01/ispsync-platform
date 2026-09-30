-- Migration: 000026 — Add Agent Loket Admin Fee
ALTER TABLE agents ADD COLUMN IF NOT EXISTS loket_admin_fee BIGINT NOT NULL DEFAULT 2500;
