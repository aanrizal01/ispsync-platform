-- Migration: 000048_add_tenant_slug_to_odp_nodes.down.sql
DROP INDEX IF EXISTS idx_odp_nodes_tenant_slug;
ALTER TABLE odp_nodes DROP COLUMN IF EXISTS tenant_slug;
