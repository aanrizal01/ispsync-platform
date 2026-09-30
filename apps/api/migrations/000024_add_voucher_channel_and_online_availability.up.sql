-- Migration: 000024 — Add Voucher Channel and Online Availability
-- Modifies voucher_templates and vouchers to support online self-service purchasing

ALTER TABLE voucher_templates 
ADD COLUMN IF NOT EXISTS is_available_online BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_voucher_templates_online ON voucher_templates (is_available_online) WHERE is_available_online = TRUE;

ALTER TABLE vouchers 
ALTER COLUMN batch_id DROP NOT NULL;

ALTER TABLE vouchers 
ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'OFFLINE';

ALTER TABLE vouchers 
ADD COLUMN IF NOT EXISTS buyer_phone VARCHAR(32);

ALTER TABLE vouchers 
ADD COLUMN IF NOT EXISTS order_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_vouchers_channel ON vouchers (channel);
CREATE INDEX IF NOT EXISTS idx_vouchers_order_id ON vouchers (order_id);
