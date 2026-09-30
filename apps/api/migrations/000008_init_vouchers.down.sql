-- Migration Down: 000008 — Voucher Domain

DROP TABLE IF EXISTS vouchers;
DROP TABLE IF EXISTS voucher_batches;
DROP TABLE IF EXISTS voucher_templates;
DROP SEQUENCE IF EXISTS voucher_batch_seq;
