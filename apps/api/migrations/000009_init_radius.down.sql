-- Migration Down: 000009 — FreeRADIUS Schema

DROP TABLE IF EXISTS radpostauth;
DROP TABLE IF EXISTS radius_sessions;
DROP TABLE IF EXISTS radusergroup;
DROP TABLE IF EXISTS radgroupreply;
DROP TABLE IF EXISTS radgroupcheck;
DROP TABLE IF EXISTS radreply;
DROP TABLE IF EXISTS radcheck;
DROP TABLE IF EXISTS nas;
