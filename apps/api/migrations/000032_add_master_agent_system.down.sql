-- Migration: 000032 — Revert Master Agent Hierarchy
-- Tables: agents

DROP INDEX IF EXISTS idx_agents_is_master;
DROP INDEX IF EXISTS idx_agents_parent_agent_id;

ALTER TABLE agents
    DROP COLUMN IF EXISTS override_pct,
    DROP COLUMN IF EXISTS parent_agent_id,
    DROP COLUMN IF EXISTS is_master;
