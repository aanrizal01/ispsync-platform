-- 1. Function to sync radius_sessions to vouchers table
CREATE OR REPLACE FUNCTION trg_sync_radius_session_to_voucher()
RETURNS TRIGGER AS $voucher_trg$
DECLARE
    v_rec RECORD;
    v_total_seconds BIGINT;
    v_total_bytes BIGINT;
    v_first_start TIMESTAMPTZ;
    v_calc_expires TIMESTAMPTZ;
    v_new_status VARCHAR(32);
BEGIN
    -- Fast exit if this username is not a voucher code
    SELECT v.id, v.status, v.time_limit_seconds, v.data_limit_bytes, 
           v.first_used_at, v.expires_at, v.buyer_mac, COALESCE(vt.duration_minutes, 60) AS duration_minutes
    INTO v_rec
    FROM vouchers v
    LEFT JOIN voucher_templates vt ON vt.id = v.template_id
    WHERE v.code = NEW.username;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Never reactivate or modify REVOKED vouchers automatically
    IF v_rec.status = 'REVOKED' THEN
        RETURN NEW;
    END IF;

    -- Aggregate total usage from radius_sessions
    SELECT 
        COALESCE(SUM(acctsessiontime), 0),
        COALESCE(SUM(COALESCE(acctinputoctets, 0) + COALESCE(acctoutputoctets, 0)), 0),
        MIN(acctstarttime)
    INTO v_total_seconds, v_total_bytes, v_first_start
    FROM radius_sessions
    WHERE username = NEW.username;

    v_first_start := COALESCE(v_rec.first_used_at, v_first_start, NEW.acctstarttime, NOW());
    v_calc_expires := v_first_start + (v_rec.duration_minutes * INTERVAL '1 minute');

    -- Status determination
    IF NOW() >= v_calc_expires THEN
        v_new_status := 'EXPIRED';
    ELSIF v_rec.time_limit_seconds > 0 AND v_total_seconds >= v_rec.time_limit_seconds THEN
        v_new_status := 'DEPLETED';
    ELSIF v_rec.data_limit_bytes > 0 AND v_total_bytes >= v_rec.data_limit_bytes THEN
        v_new_status := 'DEPLETED';
    ELSE
        v_new_status := 'ACTIVE';
    END IF;

    -- Update vouchers record
    UPDATE vouchers
    SET 
        status = v_new_status,
        first_used_at = v_first_start,
        expires_at = v_calc_expires,
        used_seconds = v_total_seconds,
        used_bytes = v_total_bytes,
        buyer_mac = CASE 
            WHEN (buyer_mac IS NULL OR buyer_mac = '') AND NEW.callingstationid IS NOT NULL AND NEW.callingstationid != '' 
            THEN NEW.callingstationid 
            ELSE buyer_mac 
        END,
        updated_at = NOW()
    WHERE id = v_rec.id;

    RETURN NEW;
END;
$voucher_trg$ LANGUAGE plpgsql;

-- 2. Trigger on radius_sessions
DROP TRIGGER IF EXISTS trg_radius_session_voucher_sync ON radius_sessions;
CREATE TRIGGER trg_radius_session_voucher_sync
AFTER INSERT OR UPDATE OF acctsessiontime, acctstoptime, acctinputoctets, acctoutputoctets, callingstationid
ON radius_sessions
FOR EACH ROW
EXECUTE FUNCTION trg_sync_radius_session_to_voucher();

-- 3. Initial backfill reconciliation for existing sessions
WITH session_agg AS (
    SELECT 
        rs.username,
        MIN(rs.acctstarttime) AS first_start,
        COALESCE(SUM(rs.acctsessiontime), 0) AS total_seconds,
        COALESCE(SUM(COALESCE(rs.acctinputoctets, 0) + COALESCE(rs.acctoutputoctets, 0)), 0) AS total_bytes,
        (ARRAY_AGG(rs.callingstationid ORDER BY rs.acctstarttime DESC))[1] AS last_mac,
        COALESCE(vt.duration_minutes, 60) AS duration_minutes
    FROM radius_sessions rs
    JOIN vouchers v ON v.code = rs.username
    LEFT JOIN voucher_templates vt ON vt.id = v.template_id
    WHERE v.status != 'REVOKED'
    GROUP BY rs.username, vt.duration_minutes
)
UPDATE vouchers v
SET 
    status = CASE 
        WHEN NOW() >= (COALESCE(v.first_used_at, sa.first_start) + (sa.duration_minutes * INTERVAL '1 minute')) THEN 'EXPIRED'
        WHEN v.time_limit_seconds > 0 AND sa.total_seconds >= v.time_limit_seconds THEN 'DEPLETED'
        WHEN v.data_limit_bytes > 0 AND sa.total_bytes >= v.data_limit_bytes THEN 'DEPLETED'
        ELSE 'ACTIVE'
    END,
    first_used_at = COALESCE(v.first_used_at, sa.first_start),
    expires_at = COALESCE(v.first_used_at, sa.first_start) + (sa.duration_minutes * INTERVAL '1 minute'),
    used_seconds = sa.total_seconds,
    used_bytes = sa.total_bytes,
    buyer_mac = CASE 
        WHEN (v.buyer_mac IS NULL OR v.buyer_mac = '') AND sa.last_mac IS NOT NULL AND sa.last_mac != '' 
        THEN sa.last_mac 
        ELSE v.buyer_mac 
    END,
    updated_at = NOW()
FROM session_agg sa
WHERE v.code = sa.username AND v.status != 'REVOKED';
