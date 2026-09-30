DROP INDEX IF EXISTS idx_vouchers_buyer_mac;
ALTER TABLE vouchers DROP COLUMN IF EXISTS buyer_mac;
