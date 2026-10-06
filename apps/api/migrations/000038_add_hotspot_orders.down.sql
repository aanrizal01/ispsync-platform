-- Migration: 000038 Down
DROP TABLE IF EXISTS hotspot_orders;
ALTER TABLE vouchers DROP COLUMN IF EXISTS is_mac_locked;
ALTER TABLE voucher_batches DROP COLUMN IF EXISTS is_mac_locked;
