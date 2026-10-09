-- Migration: 000049_add_tenant_slug_to_users.up.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_users_tenant_slug ON users (tenant_slug);

-- Backfill from linked agents if any
UPDATE users SET tenant_slug = a.tenant_slug 
FROM agents a 
WHERE users.id = a.user_id AND (users.tenant_slug = '' OR users.tenant_slug IS NULL) AND a.tenant_slug != '';

-- Backfill existing users based on their email domains
UPDATE users SET tenant_slug = 'dev' WHERE (tenant_slug = '' OR tenant_slug IS NULL) AND (email LIKE '%@dev.%' OR email LIKE '%@ledger.dev.%');
UPDATE users SET tenant_slug = 'gbd' WHERE (tenant_slug = '' OR tenant_slug IS NULL) AND email LIKE '%@gbd.%';
UPDATE users SET tenant_slug = 'mmk' WHERE (tenant_slug = '' OR tenant_slug IS NULL) AND email LIKE '%@mmk.%';
UPDATE users SET tenant_slug = 'siber' WHERE (tenant_slug = '' OR tenant_slug IS NULL) AND email LIKE '%@siber.%';
UPDATE users SET tenant_slug = 'testtenant' WHERE (tenant_slug = '' OR tenant_slug IS NULL) AND email LIKE '%@testtenant.%';
UPDATE users SET tenant_slug = 'gogiga' WHERE (tenant_slug = '' OR tenant_slug IS NULL) AND (email LIKE '%@gogiga.%' OR email LIKE '%@warung.id' OR email LIKE 'aanrizal01@gmail.com');

