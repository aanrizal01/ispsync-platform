-- Migration: 000008 — Voucher Domain
-- Tables: voucher_templates, voucher_batches, vouchers

CREATE SEQUENCE IF NOT EXISTS voucher_batch_seq START WITH 1001;

CREATE TABLE voucher_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    price               BIGINT NOT NULL DEFAULT 0,
    currency            VARCHAR(3) NOT NULL DEFAULT 'IDR',
    duration_minutes    INT NOT NULL DEFAULT 60,         -- 60 min = 1 hour validity once used
    data_limit_bytes    BIGINT NOT NULL DEFAULT 0,       -- 0 = unlimited data
    download_kbps       BIGINT NOT NULL DEFAULT 5000,    -- 5 Mbps default
    upload_kbps         BIGINT NOT NULL DEFAULT 2000,    -- 2 Mbps default
    validity_days       INT NOT NULL DEFAULT 30,         -- Unused voucher expires in 30 days
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voucher_templates_active ON voucher_templates (is_active);

CREATE TABLE voucher_batches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number        VARCHAR(32) NOT NULL UNIQUE,
    template_id         UUID NOT NULL REFERENCES voucher_templates(id) ON DELETE RESTRICT,
    quantity            INT NOT NULL DEFAULT 1,
    notes               TEXT,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voucher_batches_template ON voucher_batches (template_id);
CREATE INDEX idx_voucher_batches_created_at ON voucher_batches (created_at DESC);

CREATE TABLE vouchers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(64) NOT NULL UNIQUE,
    password            VARCHAR(64) NOT NULL,
    batch_id            UUID NOT NULL REFERENCES voucher_batches(id) ON DELETE CASCADE,
    template_id         UUID NOT NULL REFERENCES voucher_templates(id) ON DELETE RESTRICT,
    customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'UNUSED'
                        CHECK (status IN ('CREATED', 'UNUSED', 'ACTIVE', 'EXPIRED', 'DEPLETED', 'REVOKED')),
    time_limit_seconds  BIGINT NOT NULL DEFAULT 3600,
    data_limit_bytes    BIGINT NOT NULL DEFAULT 0,
    used_seconds        BIGINT NOT NULL DEFAULT 0,
    used_bytes          BIGINT NOT NULL DEFAULT 0,
    first_used_at       TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,                     -- Calculated upon first use or batch creation
    revoked_at          TIMESTAMPTZ,
    revoked_reason      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vouchers_code ON vouchers (code);
CREATE INDEX idx_vouchers_batch_id ON vouchers (batch_id);
CREATE INDEX idx_vouchers_status ON vouchers (status);
CREATE INDEX idx_vouchers_expires_at ON vouchers (expires_at);
