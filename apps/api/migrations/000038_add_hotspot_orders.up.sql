-- Migration: 000038 — Add hotspot orders and mac lock support
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_mac_locked BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE voucher_batches ADD COLUMN IF NOT EXISTS is_mac_locked BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS hotspot_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(64) UNIQUE NOT NULL,
    template_id UUID REFERENCES voucher_templates(id) ON DELETE SET NULL,
    package_name VARCHAR(128) NOT NULL,
    amount BIGINT NOT NULL,
    original_price BIGINT NOT NULL DEFAULT 0,
    discount_amount BIGINT NOT NULL DEFAULT 0,
    customer_phone VARCHAR(32) NOT NULL DEFAULT '',
    payment_method VARCHAR(32) NOT NULL DEFAULT 'qris',
    payment_url TEXT,
    snap_token TEXT,
    client_ip VARCHAR(64) NOT NULL DEFAULT '',
    client_mac VARCHAR(32) NOT NULL DEFAULT '',
    promo_code VARCHAR(32) NOT NULL DEFAULT '',
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    agent_commission BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    voucher_code VARCHAR(64),
    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotspot_orders_order_id ON hotspot_orders (order_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_orders_status ON hotspot_orders (status);
CREATE INDEX IF NOT EXISTS idx_hotspot_orders_customer_phone ON hotspot_orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_hotspot_orders_agent_id ON hotspot_orders (agent_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_orders_created_at ON hotspot_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hotspot_orders_voucher_code ON hotspot_orders (voucher_code);
