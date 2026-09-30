-- Migration: 000004 — Customer Domain
-- Table: customers, customer_addresses, customer_contacts, customer_devices

-- Sequence for human-readable customer number e.g. CUS-2024-00001
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START WITH 10001;

CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_number VARCHAR(32) NOT NULL UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    email           CITEXT,
    phone           VARCHAR(50) NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'LEAD' 
                    CHECK (status IN ('LEAD', 'ACTIVE', 'SUSPENDED', 'TERMINATED')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_customers_customer_number ON customers (customer_number);
CREATE INDEX idx_customers_email ON customers (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_phone ON customers (phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_status ON customers (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_created_at ON customers (created_at DESC);

-- Link users.customer_id to customers table
ALTER TABLE users 
    ADD CONSTRAINT fk_users_customer 
    FOREIGN KEY (customer_id) REFERENCES customers(id) 
    ON DELETE SET NULL;

CREATE TABLE customer_addresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_type    VARCHAR(32) NOT NULL DEFAULT 'INSTALLATION'
                    CHECK (address_type IN ('BILLING', 'INSTALLATION', 'MAILING')),
    street          TEXT NOT NULL,
    city            VARCHAR(100) NOT NULL,
    district        VARCHAR(100),
    province        VARCHAR(100),
    postal_code     VARCHAR(20),
    country         VARCHAR(100) NOT NULL DEFAULT 'Indonesia',
    is_primary      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses (customer_id);

CREATE TABLE customer_contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_type    VARCHAR(32) NOT NULL DEFAULT 'PHONE'
                    CHECK (contact_type IN ('PHONE', 'EMAIL', 'WHATSAPP')),
    value           VARCHAR(255) NOT NULL,
    label           VARCHAR(100),
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_contacts_customer_id ON customer_contacts (customer_id);

CREATE TABLE customer_devices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    access_account_id   UUID, -- FK to access_accounts added in 000005
    mac_address         VARCHAR(32) NOT NULL,
    device_name         VARCHAR(100),
    device_type         VARCHAR(50),
    os_type             VARCHAR(50),
    passpoint_capable   BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_customer_devices_mac ON customer_devices (customer_id, mac_address);
