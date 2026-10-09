-- Migration 000055: Isolate NAS and RADIUS access per tenant
ALTER TABLE nas ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) NOT NULL DEFAULT 'dev';
CREATE INDEX IF NOT EXISTS idx_nas_tenant_slug ON nas (tenant_slug);

-- Clean up leftover debris profiles from radgroupreply for deleted tenants
DELETE FROM radgroupreply WHERE groupname IN (
    'Paket Warga 15 Mbps', 
    'Paket Bisnis 30 Mbps', 
    'Dev HyperSpeed 1 Gbps', 
    'BKT-15', 
    'BKT-30', 
    'DEV-GIGA'
);
