-- Migration Down: 000004 — Customer Domain

DROP TABLE IF EXISTS customer_devices;
DROP TABLE IF EXISTS customer_contacts;
DROP TABLE IF EXISTS customer_addresses;

ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_customer;

DROP TABLE IF EXISTS customers;
DROP SEQUENCE IF EXISTS customer_number_seq;
