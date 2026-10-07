-- Migration: 000046_add_tenant_slug_to_passpoint.up.sql
ALTER TABLE passpoint_orders ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'gogiga';
CREATE INDEX IF NOT EXISTS idx_passpoint_orders_tenant_slug ON passpoint_orders(tenant_slug);

ALTER TABLE passpoint_credentials ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'gogiga';
CREATE INDEX IF NOT EXISTS idx_passpoint_credentials_tenant_slug ON passpoint_credentials(tenant_slug);

UPDATE passpoint_credentials c
SET tenant_slug = cust.tenant_slug
FROM customers cust
WHERE c.customer_id = cust.id AND cust.tenant_slug IS NOT NULL;

UPDATE passpoint_orders po
SET tenant_slug = COALESCE(a.tenant_slug, c.tenant_slug, 'gogiga')
FROM passpoint_orders o
LEFT JOIN agents a ON a.id = COALESCE(o.paid_by_agent_id, o.agent_id)
LEFT JOIN passpoint_credentials c ON c.id = o.credential_id
WHERE po.id = o.id;
