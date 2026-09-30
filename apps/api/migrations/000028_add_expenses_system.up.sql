-- Migration: 000028 — Add expenses system (Buku Kas Pengeluaran Operasional)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    vendor_name VARCHAR(255),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'BANK_TRANSFER',
    bank_account VARCHAR(100),
    reference_number VARCHAR(100),
    is_bhp_deductible BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);
CREATE INDEX IF NOT EXISTS idx_expenses_is_bhp_deductible ON expenses (is_bhp_deductible);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at DESC);
