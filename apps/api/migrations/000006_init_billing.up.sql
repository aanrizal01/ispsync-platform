-- Migration: 000006 — Billing Domain
-- Tables: invoices, invoice_items, credit_notes, refunds

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 10001;

CREATE TABLE invoices (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number          VARCHAR(32) NOT NULL UNIQUE,
    customer_id             UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    subscription_id         UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    plan_price_id           UUID REFERENCES plan_prices(id) ON DELETE RESTRICT,
    status                  VARCHAR(32) NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'CANCELLED')),
    billing_period_start    TIMESTAMPTZ,
    billing_period_end      TIMESTAMPTZ,
    issue_date              TIMESTAMPTZ,
    due_date                TIMESTAMPTZ NOT NULL,
    subtotal                BIGINT NOT NULL DEFAULT 0,
    tax_amount              BIGINT NOT NULL DEFAULT 0,
    discount_amount         BIGINT NOT NULL DEFAULT 0,
    late_fee_amount         BIGINT NOT NULL DEFAULT 0,
    credit_applied          BIGINT NOT NULL DEFAULT 0,
    total_amount            BIGINT NOT NULL DEFAULT 0,
    amount_paid             BIGINT NOT NULL DEFAULT 0,
    amount_due              BIGINT NOT NULL DEFAULT 0,
    currency                VARCHAR(3) NOT NULL DEFAULT 'IDR',
    notes                   TEXT,
    issued_by               UUID REFERENCES users(id),
    voided_at               TIMESTAMPTZ,
    void_reason             TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_customer_id ON invoices (customer_id);
CREATE INDEX idx_invoices_subscription_id ON invoices (subscription_id);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_invoices_due_date ON invoices (due_date) WHERE status IN ('ISSUED', 'PARTIALLY_PAID');
CREATE INDEX idx_invoices_created_at ON invoices (created_at DESC);

CREATE TABLE invoice_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id          UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_type           VARCHAR(32) NOT NULL DEFAULT 'SUBSCRIPTION'
                        CHECK (item_type IN ('SUBSCRIPTION', 'INSTALLATION', 'ACTIVATION', 'LATE_FEE', 'CREDIT', 'TAX', 'DISCOUNT', 'OTHER')),
    description         TEXT NOT NULL,
    quantity            INT NOT NULL DEFAULT 1,
    unit_price          BIGINT NOT NULL DEFAULT 0,
    tax_percent         INT NOT NULL DEFAULT 0,
    discount_percent    INT NOT NULL DEFAULT 0,
    total               BIGINT NOT NULL DEFAULT 0,
    period_start        TIMESTAMPTZ,
    period_end          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items (invoice_id);

CREATE TABLE credit_notes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    reason              TEXT NOT NULL,
    amount              BIGINT NOT NULL DEFAULT 0,
    currency            VARCHAR(3) NOT NULL DEFAULT 'IDR',
    status              VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED')),
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_notes_customer_id ON credit_notes (customer_id);

CREATE TABLE refunds (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id          UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount              BIGINT NOT NULL DEFAULT 0,
    reason              TEXT NOT NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    refunded_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
