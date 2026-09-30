-- Migration: 000005 — Plan, Pricing (Snapshot/Versioned), Subscription, Access Account Domain

-- ─────────────────────────────────────────
-- PLANS
-- ─────────────────────────────────────────
CREATE TABLE plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    plan_type           VARCHAR(32) NOT NULL DEFAULT 'HOME'
                        CHECK (plan_type IN ('HOME', 'BUSINESS', 'HOTSPOT', 'VOUCHER', 'PASSPOINT')),
    download_kbps       BIGINT NOT NULL,
    upload_kbps         BIGINT NOT NULL,
    billing_cycle       VARCHAR(32) NOT NULL DEFAULT 'MONTHLY'
                        CHECK (billing_cycle IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'PREPAID')),
    grace_period_days   INT NOT NULL DEFAULT 3,
    status              VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEPRECATED')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_status ON plans (status);
CREATE INDEX idx_plans_type ON plans (plan_type);

-- ─────────────────────────────────────────
-- PLAN PRICES (Versioned / Immutable Snapshot)
-- ─────────────────────────────────────────
CREATE TABLE plan_prices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id             UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    monthly_price       BIGINT NOT NULL DEFAULT 0,       -- stored as integer in lowest currency unit (e.g. Rupiah)
    installation_fee    BIGINT NOT NULL DEFAULT 0,
    activation_fee      BIGINT NOT NULL DEFAULT 0,
    tax_percent         INT NOT NULL DEFAULT 1100,       -- 1100 = 11.00%
    late_fee_percent    INT NOT NULL DEFAULT 500,        -- 500 = 5.00%
    currency            VARCHAR(3) NOT NULL DEFAULT 'IDR',
    effective_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until     TIMESTAMPTZ,                     -- NULL means current active price
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_prices_plan_id ON plan_prices (plan_id);
CREATE INDEX idx_plan_prices_effective ON plan_prices (plan_id, effective_from, effective_until);

-- ─────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────
CREATE TABLE subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    plan_id             UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    plan_price_id       UUID NOT NULL REFERENCES plan_prices(id) ON DELETE RESTRICT,
    status              VARCHAR(32) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED', 'EXPIRED')),
    start_date          TIMESTAMPTZ,
    end_date            TIMESTAMPTZ,
    next_billing_date   TIMESTAMPTZ,
    billing_cycle       VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
    auto_renewal        BOOLEAN NOT NULL DEFAULT TRUE,
    grace_period_days   INT NOT NULL DEFAULT 3,
    cancelled_at        TIMESTAMPTZ,
    cancellation_reason TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_customer_id ON subscriptions (customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions (next_billing_date) WHERE status IN ('ACTIVE', 'GRACE');

-- ─────────────────────────────────────────
-- ACCESS ACCOUNTS (Vendor-Neutral AAA Accounts)
-- ─────────────────────────────────────────
CREATE TABLE access_accounts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id             UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    subscription_id         UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    access_type             VARCHAR(32) NOT NULL DEFAULT 'PPPOE'
                            CHECK (access_type IN ('PPPOE', 'HOTSPOT', 'VOUCHER', 'PASSPOINT', 'IPOE')),
    identity                VARCHAR(128) NOT NULL UNIQUE, -- Username/Identity for RADIUS / Session
    password_hash           TEXT,                         -- Bcrypt or cleartext depending on AAA requirement
    display_name            VARCHAR(128),
    status                  VARCHAR(32) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED', 'EXPIRED')),
    nas_port_type           VARCHAR(32),
    simultaneous_use_limit  INT NOT NULL DEFAULT 1,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_accounts_customer_id ON access_accounts (customer_id);
CREATE INDEX idx_access_accounts_subscription ON access_accounts (subscription_id);
CREATE INDEX idx_access_accounts_status ON access_accounts (status);
CREATE INDEX idx_access_accounts_type ON access_accounts (access_type);

-- Link customer_devices to access_accounts
ALTER TABLE customer_devices
    ADD CONSTRAINT fk_customer_devices_access_account
    FOREIGN KEY (access_account_id) REFERENCES access_accounts(id)
    ON DELETE SET NULL;
