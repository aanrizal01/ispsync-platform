-- Migration: 000030 — Passpoint Orders & Counter Payment System
-- Table: passpoint_orders

CREATE TABLE IF NOT EXISTS passpoint_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(64) NOT NULL UNIQUE,
    cashier_code VARCHAR(32) NOT NULL UNIQUE,
    order_type VARCHAR(32) NOT NULL DEFAULT 'NEW_ACCESS', -- NEW_ACCESS, RENEWAL
    package_id VARCHAR(64) NOT NULL,
    package_name VARCHAR(128) NOT NULL,
    duration_days INT NOT NULL DEFAULT 30,
    customer_name VARCHAR(128) NOT NULL DEFAULT '',
    customer_phone VARCHAR(32) NOT NULL DEFAULT '',
    customer_email VARCHAR(128) NOT NULL DEFAULT '',
    original_price BIGINT NOT NULL DEFAULT 0,
    discount_amount BIGINT NOT NULL DEFAULT 0,
    admin_fee BIGINT NOT NULL DEFAULT 0,
    final_price BIGINT NOT NULL DEFAULT 0,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    promo_code VARCHAR(32) NOT NULL DEFAULT '',
    agent_commission BIGINT NOT NULL DEFAULT 0,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'QRIS', -- QRIS, COUNTER, MANUAL_COUNTER
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',      -- PENDING, PAID, EXPIRED, CANCELLED
    credential_id UUID REFERENCES passpoint_credentials(id) ON DELETE SET NULL,
    paid_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passpoint_orders_order_id ON passpoint_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_passpoint_orders_cashier_code ON passpoint_orders(cashier_code);
CREATE INDEX IF NOT EXISTS idx_passpoint_orders_phone ON passpoint_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_passpoint_orders_status ON passpoint_orders(status);
