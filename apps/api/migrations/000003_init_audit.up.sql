-- Migration: 000003 — Audit log table
-- IMPORTANT: This table is APPEND-ONLY.
-- The application DB user has NO UPDATE or DELETE privilege on this table.
-- Enforced via PostgreSQL GRANT (see below).

CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who performed the action
    actor_id      UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL = system/webhook
    actor_type    TEXT NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM', 'WEBHOOK', 'WORKER')),
    actor_email   TEXT,                                          -- denormalized for read performance

    -- What was done
    action        TEXT NOT NULL,    -- e.g. 'CustomerCreated', 'InvoiceVoided'
    description   TEXT,

    -- On what entity
    entity_type   TEXT NOT NULL,    -- e.g. 'Customer', 'Invoice'
    entity_id     TEXT NOT NULL,    -- UUID or other identifier as text

    -- Before/after state (for update actions)
    old_values    JSONB,
    new_values    JSONB,

    -- Request context
    ip_address    INET,
    user_agent    TEXT,
    request_id    TEXT,

    -- Additional context
    metadata      JSONB,

    -- Immutable timestamp
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_audit_actor_id    ON audit_logs (actor_id)    WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_action      ON audit_logs (action);
CREATE INDEX idx_audit_entity      ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_created_at  ON audit_logs (created_at DESC);

-- SECURITY: Revoke UPDATE and DELETE from application user
-- Run this as superuser after granting INSERT:
-- REVOKE UPDATE, DELETE ON audit_logs FROM isp_app;
-- GRANT INSERT, SELECT ON audit_logs TO isp_app;
-- (Handled in docker/postgres/init.sql, not here, to avoid migration user privilege issues)

COMMENT ON TABLE audit_logs IS
    'Immutable append-only audit trail. No row should ever be modified or deleted.';
