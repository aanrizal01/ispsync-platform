-- Migration: 000032 — Add Master Agent Hierarchy and Overriding System
-- Tables: agents

ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS is_master BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS parent_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS override_pct NUMERIC(5,2) NOT NULL DEFAULT 3.00;

CREATE INDEX IF NOT EXISTS idx_agents_parent_agent_id ON agents (parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_master ON agents (is_master);
