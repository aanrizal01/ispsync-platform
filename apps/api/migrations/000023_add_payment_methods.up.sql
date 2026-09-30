-- Migration: 000023 — Add DUITKU, TRIPAY, NICEPAY to payment_method check constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check 
    CHECK (payment_method IN ('MANUAL', 'QRIS', 'VA_BCA', 'VA_BNI', 'VA_MANDIRI', 'VA_BRI', 'MIDTRANS', 'XENDIT', 'DUITKU', 'TRIPAY', 'NICEPAY'));
