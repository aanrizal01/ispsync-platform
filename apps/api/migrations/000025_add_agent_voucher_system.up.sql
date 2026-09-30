-- Migration: 000025 — Add Agent Voucher System
-- Tables: agents, agent_balance_mutations, agent_daily_promos, agent_topup_requests
-- Modifies: vouchers

CREATE TABLE IF NOT EXISTS agents (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID REFERENCES users(id) ON DELETE SET NULL,
    code                    VARCHAR(32) NOT NULL UNIQUE,       -- e.g. "AGN-001"
    name                    VARCHAR(255) NOT NULL,
    company_name            VARCHAR(255),
    phone                   VARCHAR(50) NOT NULL,
    email                   VARCHAR(255),
    balance                 BIGINT NOT NULL DEFAULT 0,         -- Saldo agen dalam IDR
    offline_cashback_pct    NUMERIC(5,2) NOT NULL DEFAULT 20.00, -- Default cashback offline 20%
    online_cashback_pct     NUMERIC(5,2) NOT NULL DEFAULT 15.00, -- Default komisi online 15%
    online_discount_pct     NUMERIC(5,2) NOT NULL DEFAULT 5.00,  -- Default diskon pelanggan 5%
    bank_name               VARCHAR(100),
    bank_account_number     VARCHAR(64),
    bank_account_holder     VARCHAR(255),
    status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED')),
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_code ON agents (code);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents (status);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents (user_id);

-- Riwayat Mutasi Saldo Agen (Ledger)
CREATE TABLE IF NOT EXISTS agent_balance_mutations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id                UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    mutation_type           VARCHAR(32) NOT NULL,              -- TOPUP_MANUAL, TOPUP_BANK_TRANSFER, VOUCHER_OFFLINE_BUY, VOUCHER_ONLINE_COMMISSION, WITHDRAWAL, ADJUSTMENT
    amount                  BIGINT NOT NULL,                   -- Nominal perubahan (+ untuk kredit, - untuk debit)
    balance_before          BIGINT NOT NULL,
    balance_after           BIGINT NOT NULL,
    reference_id            VARCHAR(100),                      -- batch_id, order_id, request_id
    description             TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_mutations_agent_id ON agent_balance_mutations (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_mutations_created_at ON agent_balance_mutations (created_at DESC);

-- Permintaan Top-Up Transfer Bank oleh Agen (dengan konfirmasi Admin)
CREATE TABLE IF NOT EXISTS agent_topup_requests (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number          VARCHAR(32) NOT NULL UNIQUE,       -- e.g. "TOP-2026-0001"
    agent_id                UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    amount                  BIGINT NOT NULL,
    bank_name               VARCHAR(100) NOT NULL,
    bank_account_number     VARCHAR(64) NOT NULL,
    bank_account_holder     VARCHAR(255) NOT NULL,
    proof_url               TEXT,
    status                  VARCHAR(32) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    notes                   TEXT,
    admin_notes             TEXT,
    requested_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at            TIMESTAMPTZ,
    processed_by            UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_topup_agent_id ON agent_topup_requests (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_topup_status ON agent_topup_requests (status);

-- Kode Promo Harian Agen (Acak 6 Digit, berganti setiap hari)
CREATE TABLE IF NOT EXISTS agent_daily_promos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id                UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    promo_code              VARCHAR(16) NOT NULL UNIQUE,       -- Kode acak 6 digit e.g. "7K9P2X"
    valid_date              DATE NOT NULL,                     -- Tanggal berlaku
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agent_daily_promo UNIQUE (agent_id, valid_date)
);

CREATE INDEX IF NOT EXISTS idx_agent_daily_promos_code ON agent_daily_promos (promo_code);
CREATE INDEX IF NOT EXISTS idx_agent_daily_promos_date ON agent_daily_promos (valid_date);

-- Relasi Voucher dengan Agen dan Kode Promo
ALTER TABLE vouchers 
    ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS promo_code VARCHAR(16),
    ADD COLUMN IF NOT EXISTS discount_amount BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS agent_commission BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_vouchers_agent_id ON vouchers (agent_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_promo_code ON vouchers (promo_code);

-- Role 'voucher_agent' untuk Login Agen
INSERT INTO roles (name, slug, description, is_system) VALUES
    ('Agen Voucher', 'voucher_agent', 'Petugas / Mitra konter penjual voucher hotspot WiFi', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Permissions for Agent Management
INSERT INTO permissions (name, slug, module, action) VALUES 
    ('View Agents', 'agents:read', 'agents', 'read'), 
    ('Manage Agents', 'agents:write', 'agents', 'write') 
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.slug = 'admin' AND p.slug IN ('agents:read', 'agents:write') 
ON CONFLICT DO NOTHING;

