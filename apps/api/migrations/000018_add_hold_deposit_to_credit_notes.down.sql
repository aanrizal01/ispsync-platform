DROP INDEX IF EXISTS idx_credit_notes_cust_status;
ALTER TABLE credit_notes DROP COLUMN IF EXISTS deposit_type;
ALTER TABLE credit_notes DROP COLUMN IF EXISTS hold_until;
ALTER TABLE credit_notes DROP CONSTRAINT IF EXISTS credit_notes_status_check;
ALTER TABLE credit_notes ADD CONSTRAINT credit_notes_status_check CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED'));
