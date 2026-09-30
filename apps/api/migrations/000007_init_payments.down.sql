-- Migration Down: 000007 — Payment Domain

DROP TABLE IF EXISTS payment_allocations;
DROP TABLE IF EXISTS payments;
DROP SEQUENCE IF EXISTS payment_number_seq;
