-- Migration: 000022 — Add CIR (Min) Bandwidth Limit-At to Plans and Voucher Templates
-- Enables "Up to" bandwidth sharing with guaranteed minimum speed

ALTER TABLE plans 
    ADD COLUMN IF NOT EXISTS min_download_kbps BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS min_upload_kbps BIGINT NOT NULL DEFAULT 0;

ALTER TABLE voucher_templates 
    ADD COLUMN IF NOT EXISTS min_download_kbps BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS min_upload_kbps BIGINT NOT NULL DEFAULT 0;
