CREATE TABLE IF NOT EXISTS passpoint_packages (
    id            VARCHAR(64) PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    duration_days INT NOT NULL DEFAULT 7,
    price         BIGINT NOT NULL DEFAULT 0,
    speed_limit   VARCHAR(64) NOT NULL DEFAULT '15 Mbps Unlimited',
    is_popular    BOOLEAN NOT NULL DEFAULT FALSE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order    INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial packages
INSERT INTO passpoint_packages (id, name, description, duration_days, price, speed_limit, is_popular, is_active, sort_order)
VALUES
('pkg-passpoint-7d', 'Passpoint Mingguan 7 Hari', 'Akses otomatis roaming WiFi berkecepatan tinggi selama 1 minggu penuh', 7, 25000, '15 Mbps Unlimited', FALSE, TRUE, 1),
('pkg-passpoint-30d', 'Passpoint Bulanan 30 Hari', 'Paket favorit koneksi otomatis tanpa ribet untuk pekerja & mahasiswa', 30, 50000, '25 Mbps Unlimited', TRUE, TRUE, 2),
('pkg-passpoint-90d', 'Passpoint Seasonal 90 Hari', 'Roaming 3 bulan hemat tanpa batas di seluruh jaringan ISP', 90, 120000, '35 Mbps Unlimited', FALSE, TRUE, 3)
ON CONFLICT (id) DO NOTHING;
