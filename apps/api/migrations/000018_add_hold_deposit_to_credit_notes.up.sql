ALTER TABLE credit_notes DROP CONSTRAINT IF EXISTS credit_notes_status_check;
ALTER TABLE credit_notes ADD CONSTRAINT credit_notes_status_check CHECK (status IN ('ACTIVE', 'HOLD', 'USED', 'EXPIRED', 'REFUNDED', 'FORFEITED'));
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS hold_until TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS deposit_type VARCHAR(50) DEFAULT 'GENERAL_CREDIT';
CREATE INDEX IF NOT EXISTS idx_credit_notes_cust_status ON credit_notes(customer_id, status);
