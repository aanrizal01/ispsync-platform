DROP INDEX IF EXISTS idx_radpostauth_callingstationid;
DROP INDEX IF EXISTS idx_radpostauth_nasipaddress;
ALTER TABLE radpostauth DROP COLUMN IF EXISTS callingstationid;
ALTER TABLE radpostauth DROP COLUMN IF EXISTS nasidentifier;
