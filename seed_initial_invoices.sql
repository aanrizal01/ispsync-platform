BEGIN;

-- 1. Junaidi Putra (Diamond 20M: 259.000, DPP 233.333 + PPN 11% 25.667)
WITH inv AS (
    INSERT INTO invoices (
        id, invoice_number, customer_id, subscription_id, plan_price_id,
        status, billing_period_start, billing_period_end, issue_date, due_date,
        subtotal, tax_amount, discount_amount, late_fee_amount, credit_applied,
        total_amount, amount_paid, amount_due, currency, notes, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), 'INV-2026-09-' || LPAD(nextval('invoice_number_seq')::text, 5, '0'),
        '8d4d9ecc-c393-4717-9452-4ddde2e1dc55', '82658675-a7f4-4a0b-8bd8-45791e9d1599', 'd0020002-0000-0000-0000-000000000002',
        'ISSUED', NOW(), NOW() + interval '1 month', NOW(), NOW() + interval '7 days',
        233333, 25667, 0, 0, 0,
        259000, 0, 259000, 'IDR', 'Tagihan Awal Berlangganan (Prabayar)', NOW(), NOW()
    ) RETURNING id
)
INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, tax_percent, discount_percent, total, period_start, period_end, created_at)
SELECT gen_random_uuid(), inv.id, 'SUBSCRIPTION', 'Biaya Berlangganan Bulan Pertama (Paket Diamond 20M)', 1, 233333, 1100, 0, 233333, NOW(), NOW() + interval '1 month', NOW() FROM inv
UNION ALL
SELECT gen_random_uuid(), inv.id, 'INSTALLATION', 'Promo Pemasangan & Instalasi Jaringan (Gratis)', 1, 0, 0, 0, 0, NULL, NULL, NOW() FROM inv;

-- 2. Zikka Sintio Anugrah (Gold 10M: 183.150, DPP 165.000 + PPN 11% 18.150)
WITH inv AS (
    INSERT INTO invoices (
        id, invoice_number, customer_id, subscription_id, plan_price_id,
        status, billing_period_start, billing_period_end, issue_date, due_date,
        subtotal, tax_amount, discount_amount, late_fee_amount, credit_applied,
        total_amount, amount_paid, amount_due, currency, notes, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), 'INV-2026-09-' || LPAD(nextval('invoice_number_seq')::text, 5, '0'),
        '01ab8985-ca6f-4162-8edf-e300f67fed39', '7ba910cc-6e72-4f3f-8d6b-1e243dd2bf5e', 'd0020001-0000-0000-0000-000000000001',
        'ISSUED', NOW(), NOW() + interval '1 month', NOW(), NOW() + interval '7 days',
        165000, 18150, 0, 0, 0,
        183150, 0, 183150, 'IDR', 'Tagihan Awal Berlangganan (Prabayar)', NOW(), NOW()
    ) RETURNING id
)
INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, tax_percent, discount_percent, total, period_start, period_end, created_at)
SELECT gen_random_uuid(), inv.id, 'SUBSCRIPTION', 'Biaya Berlangganan Bulan Pertama (Paket Gold 10M)', 1, 165000, 1100, 0, 165000, NOW(), NOW() + interval '1 month', NOW() FROM inv
UNION ALL
SELECT gen_random_uuid(), inv.id, 'INSTALLATION', 'Promo Pemasangan & Instalasi Jaringan (Gratis)', 1, 0, 0, 0, 0, NULL, NULL, NOW() FROM inv;

-- 3. Muhamad Ghozi Alfikri (Gold 10M: 183.150, DPP 165.000 + PPN 11% 18.150)
WITH inv AS (
    INSERT INTO invoices (
        id, invoice_number, customer_id, subscription_id, plan_price_id,
        status, billing_period_start, billing_period_end, issue_date, due_date,
        subtotal, tax_amount, discount_amount, late_fee_amount, credit_applied,
        total_amount, amount_paid, amount_due, currency, notes, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), 'INV-2026-09-' || LPAD(nextval('invoice_number_seq')::text, 5, '0'),
        '298b61af-7dd1-41df-ab77-1b766fcd4feb', '78b81b8b-c5d9-4886-98ca-ffab03217639', 'd0020001-0000-0000-0000-000000000001',
        'ISSUED', NOW(), NOW() + interval '1 month', NOW(), NOW() + interval '7 days',
        165000, 18150, 0, 0, 0,
        183150, 0, 183150, 'IDR', 'Tagihan Awal Berlangganan (Prabayar)', NOW(), NOW()
    ) RETURNING id
)
INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, tax_percent, discount_percent, total, period_start, period_end, created_at)
SELECT gen_random_uuid(), inv.id, 'SUBSCRIPTION', 'Biaya Berlangganan Bulan Pertama (Paket Gold 10M)', 1, 165000, 1100, 0, 165000, NOW(), NOW() + interval '1 month', NOW() FROM inv
UNION ALL
SELECT gen_random_uuid(), inv.id, 'INSTALLATION', 'Promo Pemasangan & Instalasi Jaringan (Gratis)', 1, 0, 0, 0, 0, NULL, NULL, NOW() FROM inv;

-- 4. Muhamad Rafli Anwar (Gold 10M: 183.150, DPP 165.000 + PPN 11% 18.150)
WITH inv AS (
    INSERT INTO invoices (
        id, invoice_number, customer_id, subscription_id, plan_price_id,
        status, billing_period_start, billing_period_end, issue_date, due_date,
        subtotal, tax_amount, discount_amount, late_fee_amount, credit_applied,
        total_amount, amount_paid, amount_due, currency, notes, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), 'INV-2026-09-' || LPAD(nextval('invoice_number_seq')::text, 5, '0'),
        'bd7f7b89-a8e7-421a-99c2-ec564a50a983', '9962fc43-d99c-47d2-a27a-0587f5644047', 'd0020001-0000-0000-0000-000000000001',
        'ISSUED', NOW(), NOW() + interval '1 month', NOW(), NOW() + interval '7 days',
        165000, 18150, 0, 0, 0,
        183150, 0, 183150, 'IDR', 'Tagihan Awal Berlangganan (Prabayar)', NOW(), NOW()
    ) RETURNING id
)
INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, tax_percent, discount_percent, total, period_start, period_end, created_at)
SELECT gen_random_uuid(), inv.id, 'SUBSCRIPTION', 'Biaya Berlangganan Bulan Pertama (Paket Gold 10M)', 1, 165000, 1100, 0, 165000, NOW(), NOW() + interval '1 month', NOW() FROM inv
UNION ALL
SELECT gen_random_uuid(), inv.id, 'INSTALLATION', 'Promo Pemasangan & Instalasi Jaringan (Gratis)', 1, 0, 0, 0, 0, NULL, NULL, NOW() FROM inv;

COMMIT;
