-- Migration: 000010 — Passpoint / Hotspot 2.0 Domain
-- Tables: passpoint_profiles, passpoint_credentials

CREATE TABLE passpoint_profiles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(100) NOT NULL,
    operator_friendly_name  VARCHAR(100) NOT NULL,        -- e.g. "GigaBill Passpoint"
    domain_name             VARCHAR(100) NOT NULL,        -- e.g. "wifi.isp.local"
    realm                   VARCHAR(100) NOT NULL,        -- NAI Realm e.g. "isp.local"
    roaming_consortium_ois  TEXT[],                       -- e.g. ARRAY['BAA2D00000', '001BC50460'] (OpenRoaming, etc)
    eap_method              VARCHAR(32) NOT NULL DEFAULT 'EAP-TTLS'
                            CHECK (eap_method IN ('EAP-TTLS', 'EAP-TLS', 'EAP-PEAP')),
    inner_auth              VARCHAR(32) NOT NULL DEFAULT 'MSCHAPv2'
                            CHECK (inner_auth IN ('MSCHAPv2', 'PAP', 'CHAP')),
    venue_name              VARCHAR(100),
    venue_group             INT DEFAULT 2,                -- 2 = Business, 1 = Assembly, etc
    venue_type              INT DEFAULT 8,                -- 8 = Research & Development, etc
    is_default              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_passpoint_profiles_domain ON passpoint_profiles (domain_name);

CREATE TABLE passpoint_credentials (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    profile_id          UUID NOT NULL REFERENCES passpoint_profiles(id) ON DELETE RESTRICT,
    username            VARCHAR(128) NOT NULL UNIQUE,     -- e.g. "cus-1001@wifi.isp.local"
    password            VARCHAR(128) NOT NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
    last_authenticated_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_passpoint_credentials_customer ON passpoint_credentials (customer_id);
CREATE INDEX idx_passpoint_credentials_username ON passpoint_credentials (username);

-- Seed default Passpoint profile
INSERT INTO passpoint_profiles (
    name, operator_friendly_name, domain_name, realm, roaming_consortium_ois, eap_method, inner_auth, is_default
) VALUES (
    'GigaBill Default Passpoint',
    'GigaBill High-Speed WiFi',
    'wifi.gigabill.local',
    'gigabill.local',
    ARRAY['BAA2D00000', '5A03BA0000'],
    'EAP-TTLS',
    'MSCHAPv2',
    TRUE
) ON CONFLICT DO NOTHING;
