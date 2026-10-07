-- Migration: 000047_add_tenant_slug_to_vouchers_and_billing.down.sql
DROP INDEX IF EXISTS idx_credit_notes_tenant_slug;
ALTER TABLE credit_notes DROP COLUMN IF EXISTS tenant_slug;

DROP INDEX IF EXISTS idx_subscriptions_tenant_slug;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS tenant_slug;

DROP INDEX IF EXISTS idx_voucher_batches_tenant_slug;
ALTER TABLE voucher_batches DROP COLUMN IF EXISTS tenant_slug;

DROP INDEX IF EXISTS idx_vouchers_tenant_slug;
ALTER TABLE vouchers DROP COLUMN IF EXISTS tenant_slug;
