-- Migration: 000022 Down — Revert CIR (Min) Bandwidth Limit-At

ALTER TABLE plans 
    DROP COLUMN IF EXISTS min_download_kbps,
    DROP COLUMN IF EXISTS min_upload_kbps;

ALTER TABLE voucher_templates 
    DROP COLUMN IF EXISTS min_download_kbps,
    DROP COLUMN IF EXISTS min_upload_kbps;
