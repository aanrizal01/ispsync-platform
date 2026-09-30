-- Migration: 000009 — FreeRADIUS 3.x Standard rlm_sql Schema & Partitioned Accounting

-- ─────────────────────────────────────────
-- 1. NAS (Network Access Servers / Routers)
-- ─────────────────────────────────────────
CREATE TABLE nas (
    id          SERIAL PRIMARY KEY,
    nasname     VARCHAR(128) NOT NULL UNIQUE,     -- IP address or hostname
    shortname   VARCHAR(32),
    type        VARCHAR(30) DEFAULT 'other',      -- mikrotik, cisco, juniper, other
    ports       INT,
    secret      VARCHAR(60) NOT NULL,             -- RADIUS shared secret
    server      VARCHAR(64),
    community   VARCHAR(50),
    description VARCHAR(200),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nas_nasname ON nas (nasname);

-- ─────────────────────────────────────────
-- 2. RADCHECK (User Authentication Attributes)
-- ─────────────────────────────────────────
CREATE TABLE radcheck (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT '==',
    value       VARCHAR(253) NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_radcheck_username ON radcheck (username);

-- ─────────────────────────────────────────
-- 3. RADREPLY (User Authorization Attributes)
-- ─────────────────────────────────────────
CREATE TABLE radreply (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT '=',
    value       VARCHAR(253) NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_radreply_username ON radreply (username);

-- ─────────────────────────────────────────
-- 4. RADGROUPCHECK & RADGROUPREPLY (Package Profiles)
-- ─────────────────────────────────────────
CREATE TABLE radgroupcheck (
    id          SERIAL PRIMARY KEY,
    groupname   VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT '==',
    value       VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE INDEX idx_radgroupcheck_groupname ON radgroupcheck (groupname);

CREATE TABLE radgroupreply (
    id          SERIAL PRIMARY KEY,
    groupname   VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT '=',
    value       VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE INDEX idx_radgroupreply_groupname ON radgroupreply (groupname);

-- ─────────────────────────────────────────
-- 5. RADUSERGROUP (User to Group Mapping)
-- ─────────────────────────────────────────
CREATE TABLE radusergroup (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL DEFAULT '',
    groupname   VARCHAR(64) NOT NULL DEFAULT '',
    priority    INT NOT NULL DEFAULT 1
);

CREATE INDEX idx_radusergroup_username ON radusergroup (username);

-- ─────────────────────────────────────────
-- 6. RADIUS_SESSIONS / RADACCT (Partitioned by Month)
-- ─────────────────────────────────────────
CREATE TABLE radius_sessions (
    radacctid               BIGSERIAL,
    acctsessionid           VARCHAR(64) NOT NULL,
    acctuniqueid            VARCHAR(32) NOT NULL,
    username                VARCHAR(64) NOT NULL DEFAULT '',
    groupname               VARCHAR(64) NOT NULL DEFAULT '',
    realm                   VARCHAR(64) DEFAULT '',
    nasipaddress            INET NOT NULL,
    nasportid               VARCHAR(32),
    nasporttype             VARCHAR(32),
    acctstarttime           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acctupdatetime          TIMESTAMPTZ,
    acctstoptime            TIMESTAMPTZ,
    acctinterval            INT,
    acctsessiontime         BIGINT,
    acctauthentic           VARCHAR(32),
    connectinfo_start       VARCHAR(128),
    connectinfo_stop        VARCHAR(128),
    acctinputoctets         BIGINT DEFAULT 0,
    acctoutputoctets        BIGINT DEFAULT 0,
    calledstationid         VARCHAR(50) NOT NULL DEFAULT '',
    callingstationid        VARCHAR(50) NOT NULL DEFAULT '', -- User MAC Address
    acctterminatecause      VARCHAR(32) NOT NULL DEFAULT '',
    servicetype             VARCHAR(32),
    framedprotocol          VARCHAR(32),
    framedipaddress         INET,
    PRIMARY KEY (acctstarttime, radacctid)
) PARTITION BY RANGE (acctstarttime);

CREATE INDEX idx_radius_sessions_active ON radius_sessions (username) WHERE acctstoptime IS NULL;
CREATE INDEX idx_radius_sessions_unique ON radius_sessions (acctuniqueid);
CREATE INDEX idx_radius_sessions_calling ON radius_sessions (callingstationid);

-- Create initial monthly partitions (Year 2026)
CREATE TABLE radius_sessions_2026_01 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
CREATE TABLE radius_sessions_2026_02 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
CREATE TABLE radius_sessions_2026_03 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE radius_sessions_2026_04 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
CREATE TABLE radius_sessions_2026_05 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
CREATE TABLE radius_sessions_2026_06 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE radius_sessions_2026_07 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE radius_sessions_2026_08 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE radius_sessions_2026_09 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE radius_sessions_2026_10 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE radius_sessions_2026_11 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE radius_sessions_2026_12 PARTITION OF radius_sessions
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- ─────────────────────────────────────────
-- 7. RADPOSTAUTH (Authentication Audit Log)
-- ─────────────────────────────────────────
CREATE TABLE radpostauth (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL DEFAULT '',
    pass        VARCHAR(64) NOT NULL DEFAULT '',
    reply       VARCHAR(32) NOT NULL DEFAULT '',  -- Access-Accept / Access-Reject
    authdate    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    nasipaddress INET,
    class       VARCHAR(64)
);

CREATE INDEX idx_radpostauth_username ON radpostauth (username);
CREATE INDEX idx_radpostauth_authdate ON radpostauth (authdate DESC);
