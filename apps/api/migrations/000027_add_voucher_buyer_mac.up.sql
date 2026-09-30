-- Migration: 000027 — Add buyer_mac to vouchers for device binding anti-theft
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS buyer_mac VARCHAR(32);
CREATE INDEX IF NOT EXISTS idx_vouchers_buyer_mac ON vouchers (buyer_mac);
