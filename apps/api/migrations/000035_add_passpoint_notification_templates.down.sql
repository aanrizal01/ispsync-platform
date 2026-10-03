-- Migration: 000035 — Rollback Passpoint WhatsApp Notification Templates

DELETE FROM notification_templates WHERE code IN (
    'PASSPOINT_PURCHASE_WA',
    'PASSPOINT_RENEWAL_WA',
    'PASSPOINT_RECEIPT_WA'
);
