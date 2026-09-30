-- Migration: 000015 — GIS ODP & Fiber Network Infrastructure + ISP Onboarding
-- Enables full GIS spatial mapping with PostGIS for ODP nodes, fiber cables, and customer registrations.

-- 1. ODP NODES (Optical Distribution Points / FAT)
CREATE TABLE IF NOT EXISTS odp_nodes (
    id                  VARCHAR(64) PRIMARY KEY,
    code                VARCHAR(64) UNIQUE NOT NULL,
    name                VARCHAR(255) NOT NULL,
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    geom                GEOMETRY(Point, 4326),
    total_ports         INTEGER NOT NULL DEFAULT 8,
    used_ports          INTEGER NOT NULL DEFAULT 0,
    status              VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    cluster_area        VARCHAR(100) NOT NULL DEFAULT '',
    provider_id         VARCHAR(64) NOT NULL DEFAULT 'GNET-BIARO',
    provider_name       VARCHAR(100) NOT NULL DEFAULT 'PT. GNET BIARO AKSES',
    is_cluster_active   BOOLEAN NOT NULL DEFAULT TRUE,
    splitter_spec       VARCHAR(50) NOT NULL DEFAULT '1:8 PLC',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_odp_nodes_geom ON odp_nodes USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_odp_nodes_code ON odp_nodes(code);
CREATE INDEX IF NOT EXISTS idx_odp_nodes_provider ON odp_nodes(provider_id);
CREATE INDEX IF NOT EXISTS idx_odp_nodes_cluster ON odp_nodes(cluster_area);

-- Trigger to automatically populate geom from lat/lng
CREATE OR REPLACE FUNCTION update_odp_geom() RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_odp_geom ON odp_nodes;
CREATE TRIGGER trg_odp_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON odp_nodes
FOR EACH ROW EXECUTE FUNCTION update_odp_geom();

-- 2. FIBER ROUTES (Kabel Fiber Optik Backbone / Feeder / Distribusi GIS)
CREATE TABLE IF NOT EXISTS fiber_routes (
    id                  VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    route_code          VARCHAR(64) UNIQUE NOT NULL,
    route_name          VARCHAR(255) NOT NULL,
    cable_type          VARCHAR(32) NOT NULL DEFAULT 'DISTRIBUTION'
                        CHECK (cable_type IN ('BACKBONE', 'FEEDER', 'DISTRIBUTION', 'DROPCORE')),
    core_count          INTEGER NOT NULL DEFAULT 12,
    geom                GEOMETRY(LineString, 4326),
    start_node_id       VARCHAR(64),
    end_node_id         VARCHAR(64),
    cluster_area        VARCHAR(100) NOT NULL DEFAULT '',
    status              VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    color_hex           VARCHAR(16) NOT NULL DEFAULT '#10b981',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiber_routes_geom ON fiber_routes USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_fiber_routes_code ON fiber_routes(route_code);

-- 3. JARTAPLOK PARTNERS (Mitra B2B Jaringan Tetap Lokal)
CREATE TABLE IF NOT EXISTS jartaplok_partners (
    id                  VARCHAR(64) PRIMARY KEY,
    code                VARCHAR(64) UNIQUE NOT NULL,
    name                VARCHAR(255) NOT NULL,
    api_key             VARCHAR(128) UNIQUE NOT NULL,
    contact_phone       VARCHAR(64) NOT NULL,
    coverage_area       TEXT NOT NULL,
    service_type        VARCHAR(64) NOT NULL DEFAULT 'SEWA_PORT_FO',
    suspension_policy   VARCHAR(64) NOT NULL DEFAULT 'ALLOWED_WITH_WAIVER',
    pricing_model       VARCHAR(128) NOT NULL DEFAULT 'Sewa Port FO Pasif (Jartaplok)',
    rate_20m            INTEGER NOT NULL DEFAULT 0,
    rate_30m            INTEGER NOT NULL DEFAULT 0,
    rate_40m            INTEGER NOT NULL DEFAULT 0,
    rate_50m            INTEGER NOT NULL DEFAULT 50000,
    rate_100m           INTEGER NOT NULL DEFAULT 90000,
    rate_150m           INTEGER NOT NULL DEFAULT 135000,
    rate_200m           INTEGER NOT NULL DEFAULT 180000,
    rate_300m           INTEGER NOT NULL DEFAULT 270000,
    otc_fee             INTEGER NOT NULL DEFAULT 0,
    max_distance_meters DOUBLE PRECISION NOT NULL DEFAULT 250.0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PARTNERS (Retail Sales / Referral Partners)
CREATE TABLE IF NOT EXISTS partners (
    id                  VARCHAR(64) PRIMARY KEY,
    code                VARCHAR(64) UNIQUE NOT NULL,
    name                VARCHAR(255) NOT NULL,
    api_key             VARCHAR(128) UNIQUE NOT NULL,
    commission_rate     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    contact_phone       VARCHAR(64) NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. REGISTRATIONS (Pendaftaran Pelanggan Baru & Integrasi Billing)
CREATE TABLE IF NOT EXISTS registrations (
    id                      VARCHAR(64) PRIMARY KEY,
    registration_no         VARCHAR(64) UNIQUE NOT NULL,
    partner_id              VARCHAR(64),
    partner_code            VARCHAR(64),
    full_name               VARCHAR(255) NOT NULL,
    email                   VARCHAR(255),
    phone                   VARCHAR(50) NOT NULL,
    id_card_number          VARCHAR(64) NOT NULL,
    tax_id                  VARCHAR(64) DEFAULT '',
    address                 TEXT NOT NULL,
    latitude                DOUBLE PRECISION NOT NULL,
    longitude               DOUBLE PRECISION NOT NULL,
    geom                    GEOMETRY(Point, 4326),
    selected_plan_id        VARCHAR(64) NOT NULL,
    selected_plan_name      VARCHAR(255) NOT NULL,
    nearest_odp_id          VARCHAR(64),
    nearest_odp_code        VARCHAR(64),
    distance_to_odp_meters  DOUBLE PRECISION NOT NULL,
    status                  VARCHAR(64) NOT NULL DEFAULT 'SUBMITTED',
    ktp_photo_url           TEXT,
    house_photo_url         TEXT,
    site_pic_name           VARCHAR(255),
    site_pic_phone          VARCHAR(50),
    contract_signature_url  TEXT,
    contract_signed_at      TIMESTAMPTZ,
    activated_at            TIMESTAMPTZ,
    suspended_at            TIMESTAMPTZ,
    suspension_reason       TEXT,
    gigabill_customer_id    VARCHAR(64),
    gigabill_subscription_id VARCHAR(64),
    dispatch_notes          TEXT,
    custom_notes            TEXT,
    otc_fee                 INTEGER DEFAULT 0,
    monthly_price           INTEGER DEFAULT 0,
    otc_notes               TEXT,
    pppoe_username          VARCHAR(128) DEFAULT '',
    pppoe_password          VARCHAR(128) DEFAULT '',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_geom ON registrations USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_registrations_regno ON registrations(registration_no);
CREATE INDEX IF NOT EXISTS idx_registrations_phone ON registrations(phone);
CREATE INDEX IF NOT EXISTS idx_registrations_pppoe ON registrations(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

-- Trigger to automatically populate registration geom
CREATE OR REPLACE FUNCTION update_registration_geom() RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registration_geom ON registrations;
CREATE TRIGGER trg_registration_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON registrations
FOR EACH ROW EXECUTE FUNCTION update_registration_geom();

-- 6. WORK ORDERS (Perintah Kerja Teknisi)
CREATE TABLE IF NOT EXISTS work_orders (
    id                  VARCHAR(64) PRIMARY KEY,
    order_no            VARCHAR(64) UNIQUE NOT NULL,
    registration_id     VARCHAR(64) NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    type                VARCHAR(64) NOT NULL,
    technician_name     VARCHAR(255) NOT NULL,
    scheduled_at        TIMESTAMPTZ NOT NULL,
    status              VARCHAR(64) NOT NULL DEFAULT 'ASSIGNED',
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_reg ON work_orders(registration_id);

-- 7. BAST REPORTS (Berita Acara Serah Terima)
CREATE TABLE IF NOT EXISTS bast_reports (
    id                      VARCHAR(64) PRIMARY KEY,
    work_order_id           VARCHAR(64) UNIQUE NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    optical_power_dbm       DOUBLE PRECISION NOT NULL,
    ont_serial_number       VARCHAR(64) NOT NULL,
    ont_mac_address         VARCHAR(64) NOT NULL,
    dropcore_length_meters  INTEGER NOT NULL,
    customer_signature_url  TEXT,
    proof_photo_url         TEXT,
    house_photo_url         TEXT,
    speedtest_down_mbps     DOUBLE PRECISION NOT NULL,
    speedtest_up_mbps       DOUBLE PRECISION NOT NULL,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. STAFF USERS & AUTH SESSIONS
CREATE TABLE IF NOT EXISTS staff_users (
    id                  VARCHAR(64) PRIMARY KEY,
    username            VARCHAR(64) UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL DEFAULT '',
    full_name           VARCHAR(255) NOT NULL,
    role                VARCHAR(64) NOT NULL,
    contact_phone       VARCHAR(50) NOT NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token               VARCHAR(128) PRIMARY KEY,
    user_id             VARCHAR(64) NOT NULL,
    username            VARCHAR(64) NOT NULL,
    role                VARCHAR(64) NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
