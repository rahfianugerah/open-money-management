-- Add bank_name and category columns to balances and transactions tables.
-- bank_name tracks which bank or wallet holds the funds.
-- category is a free-text label for classifying entries.

ALTER TABLE balances
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NOT NULL DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS category  VARCHAR(100) NOT NULL DEFAULT 'General';

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NOT NULL DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS category  VARCHAR(100) NOT NULL DEFAULT 'General';

-- Update the unique constraint so the same currency can appear under different banks.
ALTER TABLE balances
  DROP CONSTRAINT IF EXISTS balances_user_id_currency_id_key;

ALTER TABLE balances
  ADD CONSTRAINT balances_user_currency_bank_uq UNIQUE (user_id, currency_id, bank_name);

-- Indexes for efficient wallet-summary queries.
CREATE INDEX IF NOT EXISTS idx_balances_bank_name ON balances (user_id, bank_name);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_name ON transactions (user_id, bank_name);
