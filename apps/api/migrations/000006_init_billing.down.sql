-- Migration Down: 000006 — Billing Domain

DROP TABLE IF EXISTS refunds;
DROP TABLE IF EXISTS credit_notes;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP SEQUENCE IF EXISTS invoice_number_seq;
