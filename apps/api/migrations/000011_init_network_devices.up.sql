-- Migration: 000011 — Network Devices & Router Adapters
-- Tables: network_devices, network_device_logs

CREATE TABLE network_devices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    vendor              VARCHAR(32) NOT NULL DEFAULT 'MIKROTIK'
                        CHECK (vendor IN ('MIKROTIK', 'JUNIPER', 'GENERIC')),
    model               VARCHAR(64),
    ip_address          INET NOT NULL,
    api_port            INT NOT NULL DEFAULT 443,
    auth_type           VARCHAR(32) NOT NULL DEFAULT 'BASIC'
                        CHECK (auth_type IN ('BASIC', 'TOKEN', 'SSH_KEY')),
    username            VARCHAR(64) NOT NULL,
    password_encrypted  TEXT NOT NULL,
    use_tls             BOOLEAN NOT NULL DEFAULT TRUE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    status              VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN'
                        CHECK (status IN ('ONLINE', 'OFFLINE', 'UNKNOWN', 'ERROR')),
    last_seen_at        TIMESTAMPTZ,
    metadata            JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_network_devices_ip ON network_devices (ip_address);
CREATE INDEX idx_network_devices_vendor ON network_devices (vendor);
CREATE INDEX idx_network_devices_status ON network_devices (status);

CREATE TABLE network_device_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id           UUID NOT NULL REFERENCES network_devices(id) ON DELETE CASCADE,
    action              VARCHAR(64) NOT NULL,  -- e.g. "SYNC_PPPOE", "PROVISION_QUEUE", "PING"
    status              VARCHAR(32) NOT NULL,  -- "SUCCESS", "FAILED"
    details             TEXT,
    executed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_network_device_logs_device ON network_device_logs (device_id, executed_at DESC);

-- Seed default MikroTik Edge Router
INSERT INTO network_devices (
    name, vendor, model, ip_address, api_port, auth_type, username, password_encrypted, use_tls, is_active, status
) VALUES (
    'Core-MikroTik-CCR2004',
    'MIKROTIK',
    'CCR2004-1G-12S+2XS',
    '192.168.88.1',
    443,
    'BASIC',
    'admin',
    'admin123',
    TRUE,
    TRUE,
    'ONLINE'
) ON CONFLICT DO NOTHING;
