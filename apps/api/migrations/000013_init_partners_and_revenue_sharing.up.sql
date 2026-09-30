-- Migration: 000013 — Partner & Revenue Sharing System
-- Tables: partners, revenue_shares, partner_settlements

CREATE TABLE partners (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    VARCHAR(32) NOT NULL UNIQUE,      -- e.g. "PTR-SBY-01"
    name                    VARCHAR(255) NOT NULL,
    company_name            VARCHAR(255),
    contact_person          VARCHAR(255) NOT NULL,
    phone                   VARCHAR(50) NOT NULL,
    email                   VARCHAR(255),
    share_type              VARCHAR(32) NOT NULL DEFAULT 'PERCENTAGE'
                            CHECK (share_type IN ('PERCENTAGE', 'FLAT_FEE')),
    partner_share_bps       INT NOT NULL DEFAULT 7000,        -- Basis points: 7000 = 70.00%
    isp_share_bps           INT NOT NULL DEFAULT 3000,        -- Basis points: 3000 = 30.00%
    flat_fee_amount         BIGINT NOT NULL DEFAULT 0,        -- Flat core bandwidth fee if share_type is FLAT_FEE
    balance                 BIGINT NOT NULL DEFAULT 0,        -- Accumulated withdrawable balance in IDR
    bank_name               VARCHAR(100),
    bank_account_number     VARCHAR(64),
    bank_account_holder     VARCHAR(255),
    status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED')),
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partners_code ON partners (code);
CREATE INDEX idx_partners_status ON partners (status);

-- Connect customers & routers to partners
ALTER TABLE customers 
    ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX idx_customers_partner_id ON customers (partner_id);

ALTER TABLE network_devices 
    ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX idx_network_devices_partner_id ON network_devices (partner_id);

-- Connect users to partner (for Partner Portal login)
ALTER TABLE users 
    ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX idx_users_partner_id ON users (partner_id);

-- Revenue Shares record per paid invoice
CREATE TABLE revenue_shares (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id              UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    invoice_id              UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    gross_amount            BIGINT NOT NULL DEFAULT 0,        -- Total invoice amount paid
    partner_amount          BIGINT NOT NULL DEFAULT 0,        -- Partner profit share
    isp_amount              BIGINT NOT NULL DEFAULT 0,        -- Core ISP bandwidth share
    share_type              VARCHAR(32) NOT NULL DEFAULT 'PERCENTAGE',
    status                  VARCHAR(32) NOT NULL DEFAULT 'CREDITED'
                            CHECK (status IN ('CREDITED', 'REVERSED')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_shares_partner_id ON revenue_shares (partner_id);
CREATE INDEX idx_revenue_shares_invoice_id ON revenue_shares (invoice_id);

-- Partner Settlements (Pencairan Saldo / Penarikan Dana)
CREATE TABLE partner_settlements (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_number       VARCHAR(32) NOT NULL UNIQUE,      -- e.g. "STL-2026-0001"
    partner_id              UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    amount                  BIGINT NOT NULL DEFAULT 0,
    status                  VARCHAR(32) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID')),
    bank_name               VARCHAR(100) NOT NULL,
    bank_account_number     VARCHAR(64) NOT NULL,
    bank_account_holder     VARCHAR(255) NOT NULL,
    proof_url               TEXT,
    notes                   TEXT,
    requested_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at            TIMESTAMPTZ,
    processed_by            UUID REFERENCES users(id)
);

CREATE INDEX idx_partner_settlements_partner_id ON partner_settlements (partner_id);
CREATE INDEX idx_partner_settlements_status ON partner_settlements (status);

-- Seed Role 'partner_admin'
INSERT INTO roles (name, slug, description, is_system) VALUES
    ('Partner Admin', 'partner_admin', 'Administrator portal mitra ISP reseller', TRUE);
