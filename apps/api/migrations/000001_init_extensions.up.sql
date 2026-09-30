-- Migration: 000001 — Enable PostgreSQL extensions
-- These extensions must be enabled before any table creation.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- gen_random_uuid() (also available in pg13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "citext";        -- case-insensitive text (for email)
CREATE EXTENSION IF NOT EXISTS "postgis";       -- PostGIS for GIS mapping (ODP & Fiber Cables)
