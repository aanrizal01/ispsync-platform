-- ─────────────────────────────────────────
-- CUSTOMER ONTS (TR-069 / ACS Managed Devices)
-- Supports ZTE, Huawei, Fiberhome, VSOL, and generic XPON ONTs
-- ─────────────────────────────────────────

CREATE TABLE customer_onts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    access_account_id   UUID REFERENCES access_accounts(id) ON DELETE SET NULL,
    serial_number       VARCHAR(64) NOT NULL UNIQUE,     -- FSAN / PON Serial (e.g. ZTEGC1234567, HWTC12345678)
    mac_address         VARCHAR(32),
    vendor              VARCHAR(32) NOT NULL DEFAULT 'ZTE'
                        CHECK (vendor IN ('ZTE', 'HUAWEI', 'FIBERHOME', 'VSOL', 'OTHER')),
    model               VARCHAR(64) NOT NULL DEFAULT 'F609',
    hardware_version    VARCHAR(64),
    software_version    VARCHAR(64),
    
    -- WiFi Configuration Cache
    wifi_ssid           VARCHAR(64) NOT NULL DEFAULT 'GigaNet-Home',
    wifi_password       VARCHAR(64) NOT NULL DEFAULT 'internet123',
    wifi_security       VARCHAR(32) NOT NULL DEFAULT 'WPA2-PSK',
    wifi_channel        INT NOT NULL DEFAULT 6,
    is_wifi_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Optical Signal / Fiber Telemetry
    rx_optical_power    NUMERIC(6,2) NOT NULL DEFAULT -19.50, -- in dBm (e.g. -19.50)
    tx_optical_power    NUMERIC(6,2) NOT NULL DEFAULT 2.10,   -- in dBm (e.g. 2.10)
    optical_status      VARCHAR(32) NOT NULL DEFAULT 'NORMAL'
                        CHECK (optical_status IN ('EXCELLENT', 'NORMAL', 'WARNING', 'CRITICAL_LOS')),

    -- Management / TR-069 Status
    connection_status   VARCHAR(32) NOT NULL DEFAULT 'ONLINE'
                        CHECK (connection_status IN ('ONLINE', 'OFFLINE')),
    ip_address          VARCHAR(45),
    uptime_seconds      BIGINT NOT NULL DEFAULT 86400,
    last_inform_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_onts_customer_id ON customer_onts (customer_id);
CREATE INDEX idx_customer_onts_serial ON customer_onts (serial_number);
CREATE INDEX idx_customer_onts_vendor ON customer_onts (vendor);
CREATE INDEX idx_customer_onts_status ON customer_onts (connection_status);

-- Auto seed sample ONT for first customer if exists
DO $$
DECLARE
    v_cust_id UUID;
BEGIN
    SELECT id INTO v_cust_id FROM customers LIMIT 1;
    IF v_cust_id IS NOT NULL THEN
        INSERT INTO customer_onts (
            customer_id, serial_number, mac_address, vendor, model, 
            wifi_ssid, wifi_password, rx_optical_power, optical_status, connection_status
        ) VALUES (
            v_cust_id, 'ZTEGC90AB123', 'A4:15:88:99:AA:BB', 'ZTE', 'F609v3',
            'GigaNet-Keluarga', 'wifiRumah2026', -19.40, 'EXCELLENT', 'ONLINE'
        ) ON CONFLICT (serial_number) DO NOTHING;
    END IF;
END $$;
