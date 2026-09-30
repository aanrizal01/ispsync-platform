-- Revert: 000024 — Add Voucher Channel and Online Availability

DROP INDEX IF EXISTS idx_vouchers_order_id;
DROP INDEX IF EXISTS idx_vouchers_channel;
ALTER TABLE vouchers DROP COLUMN IF EXISTS order_id;
ALTER TABLE vouchers DROP COLUMN IF EXISTS buyer_phone;
ALTER TABLE vouchers DROP COLUMN IF EXISTS channel;
ALTER TABLE vouchers ALTER COLUMN batch_id SET NOT NULL;
DROP INDEX IF EXISTS idx_voucher_templates_online;
ALTER TABLE voucher_templates DROP COLUMN IF EXISTS is_available_online;
