-- PostgreSQL initialization script
-- Runs once when the container is first created.
-- Creates the application database user with least-privilege access.

-- Create app user (password set via env POSTGRES_APP_PASSWORD)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'isp_app') THEN
        CREATE ROLE isp_app LOGIN PASSWORD 'changeme_in_production';
    END IF;
END
$$;

-- Grant connection and usage
GRANT CONNECT ON DATABASE isp_billing TO isp_app;
GRANT USAGE ON SCHEMA public TO isp_app;

-- Grant DML on all current and future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO isp_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO isp_app;

-- Revoke dangerous privileges on audit_logs (applied after table creation via migration)
-- Note: This requires superuser — run manually or via separate script after migrations.
-- REVOKE UPDATE, DELETE ON audit_logs FROM isp_app;
