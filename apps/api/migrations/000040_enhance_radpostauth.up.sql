ALTER TABLE radpostauth ADD COLUMN IF NOT EXISTS callingstationid VARCHAR(50);
ALTER TABLE radpostauth ADD COLUMN IF NOT EXISTS nasidentifier VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_radpostauth_callingstationid ON radpostauth(callingstationid);
CREATE INDEX IF NOT EXISTS idx_radpostauth_nasipaddress ON radpostauth(nasipaddress);

-- Backfill nasipaddress and callingstationid from radius_sessions
UPDATE radpostauth p
SET nasipaddress = s.nasipaddress,
    callingstationid = s.callingstationid
FROM radius_sessions s
WHERE p.username = s.username
  AND (p.nasipaddress IS NULL OR p.callingstationid IS NULL);

-- Backfill callingstationid from vouchers where available
UPDATE radpostauth p
SET callingstationid = v.buyer_mac
FROM vouchers v
WHERE p.username = v.code
  AND p.callingstationid IS NULL
  AND v.buyer_mac IS NOT NULL;

-- Backfill fallback nasipaddress from registered nas if still null
UPDATE radpostauth
SET nasipaddress = '103.179.65.30'::inet
WHERE nasipaddress IS NULL;
