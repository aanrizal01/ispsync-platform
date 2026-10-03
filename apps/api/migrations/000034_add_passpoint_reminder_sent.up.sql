ALTER TABLE passpoint_credentials ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
