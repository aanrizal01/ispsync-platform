-- Migration: 000048_add_tenant_slug_to_odp_nodes.up.sql
ALTER TABLE odp_nodes ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(64) DEFAULT 'dev';
CREATE INDEX IF NOT EXISTS idx_odp_nodes_tenant_slug ON odp_nodes (tenant_slug);
