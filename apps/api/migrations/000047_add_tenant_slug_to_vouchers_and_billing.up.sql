-- Migration: 000047_add_tenant_slug_to_vouchers_and_billing.up.sql
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'gogiga';
CREATE INDEX IF NOT EXISTS idx_vouchers_tenant_slug ON vouchers(tenant_slug);

ALTER TABLE voucher_batches ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'gogiga';
CREATE INDEX IF NOT EXISTS idx_voucher_batches_tenant_slug ON voucher_batches(tenant_slug);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'gogiga';
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_slug ON subscriptions(tenant_slug);

UPDATE subscriptions s
SET tenant_slug = c.tenant_slug
FROM customers c
WHERE s.customer_id = c.id AND c.tenant_slug IS NOT NULL;

ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'gogiga';
CREATE INDEX IF NOT EXISTS idx_credit_notes_tenant_slug ON credit_notes(tenant_slug);

UPDATE credit_notes cn
SET tenant_slug = c.tenant_slug
FROM customers c
WHERE cn.customer_id = c.id AND c.tenant_slug IS NOT NULL;
