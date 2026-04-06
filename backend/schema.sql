CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CURRENCIES
CREATE TABLE currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(10),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- BALANCES
CREATE TABLE balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    balance DECIMAL(18,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, currency_id),
    CHECK (balance >= 0)
);

-- CURRENCY RATES
CREATE TABLE currency_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
    target_currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
    rate DECIMAL(18,6) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(base_currency_id, target_currency_id),
    CHECK (rate > 0)
);

-- TRANSACTIONS
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'conversion')),
    amount DECIMAL(18,2) NOT NULL,
    reference_currency_id UUID REFERENCES currencies(id) ON DELETE RESTRICT,
    reference_amount DECIMAL(18,2),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (amount > 0)
);

-- APP SETTINGS (e.g. exchange API provider config)
CREATE TABLE app_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_balances_user_id ON balances(user_id);
CREATE INDEX idx_balances_currency_id ON balances(currency_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_currency_rates_pair ON currency_rates(base_currency_id, target_currency_id);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER currencies_set_updated_at
BEFORE UPDATE ON currencies
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER balances_set_updated_at
BEFORE UPDATE ON balances
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER currency_rates_set_updated_at
BEFORE UPDATE ON currency_rates
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- BASE CURRENCY SEED
INSERT INTO currencies (code, name, symbol, is_default)
VALUES
    ('USD', 'US Dollar', '$', true),
    ('IDR', 'Indonesian Rupiah', 'Rp', false)
ON CONFLICT (code)
DO UPDATE SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    is_default = EXCLUDED.is_default,
    updated_at = NOW();

-- BASE RATE SEED
INSERT INTO currency_rates (base_currency_id, target_currency_id, rate)
SELECT usd.id, idr.id, 17014
FROM currencies usd
INNER JOIN currencies idr ON idr.code = 'IDR'
WHERE usd.code = 'USD'
ON CONFLICT (base_currency_id, target_currency_id)
DO UPDATE SET
    rate = EXCLUDED.rate,
    updated_at = NOW();

INSERT INTO currency_rates (base_currency_id, target_currency_id, rate)
SELECT idr.id, usd.id, 0.000059
FROM currencies idr
INNER JOIN currencies usd ON usd.code = 'USD'
WHERE idr.code = 'IDR'
ON CONFLICT (base_currency_id, target_currency_id)
DO UPDATE SET
    rate = EXCLUDED.rate,
    updated_at = NOW();
