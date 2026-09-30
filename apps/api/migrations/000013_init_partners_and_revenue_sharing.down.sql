-- Migration: 000013 Down
DROP TABLE IF EXISTS partner_settlements CASCADE;
DROP TABLE IF EXISTS revenue_shares CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS partner_id;
ALTER TABLE network_devices DROP COLUMN IF EXISTS partner_id;
ALTER TABLE customers DROP COLUMN IF EXISTS partner_id;
DROP TABLE IF EXISTS partners CASCADE;
DELETE FROM roles WHERE slug = 'partner_admin';
