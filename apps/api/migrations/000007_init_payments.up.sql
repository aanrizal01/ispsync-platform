-- Migration: 000007 — Payment Domain
-- Tables: payments, payment_allocations

CREATE SEQUENCE IF NOT EXISTS payment_number_seq START WITH 10001;

CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number      VARCHAR(32) NOT NULL UNIQUE,
    customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id          UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_method      VARCHAR(32) NOT NULL DEFAULT 'MANUAL'
                        CHECK (payment_method IN ('MANUAL', 'QRIS', 'VA_BCA', 'VA_BNI', 'VA_MANDIRI', 'VA_BRI', 'MIDTRANS', 'XENDIT')),
    external_id         VARCHAR(255),                  -- Gateway order_id or transaction_id
    status              VARCHAR(32) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED')),
    amount              BIGINT NOT NULL DEFAULT 0,
    currency            VARCHAR(3) NOT NULL DEFAULT 'IDR',
    paid_at             TIMESTAMPTZ,
    notes               TEXT,
    receipt_url         TEXT,
    gateway_response    JSONB,                         -- Raw immutable gateway response
    idempotency_key     VARCHAR(255) UNIQUE,           -- Enforce exactly-once processing
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_customer_id ON payments (customer_id);
CREATE INDEX idx_payments_invoice_id ON payments (invoice_id);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_external_id ON payments (external_id);
CREATE INDEX idx_payments_created_at ON payments (created_at DESC);

CREATE TABLE payment_allocations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id          UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id          UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount              BIGINT NOT NULL DEFAULT 0,
    allocated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_allocations_payment ON payment_allocations (payment_id);
CREATE INDEX idx_payment_allocations_invoice ON payment_allocations (invoice_id);
