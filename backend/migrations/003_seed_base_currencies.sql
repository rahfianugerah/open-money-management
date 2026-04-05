INSERT INTO currencies (code, name, symbol, is_default)
VALUES
  ('USD', 'US Dollar', '$', true),
  ('IDR', 'Indonesian Rupiah', 'Rp', false)
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  updated_at = NOW();

INSERT INTO currency_rates (base_currency_id, target_currency_id, rate)
SELECT usd.id, idr.id, 16000
FROM currencies usd
INNER JOIN currencies idr ON idr.code = 'IDR'
WHERE usd.code = 'USD'
ON CONFLICT (base_currency_id, target_currency_id)
DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW();

INSERT INTO currency_rates (base_currency_id, target_currency_id, rate)
SELECT idr.id, usd.id, 0.0000625
FROM currencies idr
INNER JOIN currencies usd ON usd.code = 'USD'
WHERE idr.code = 'IDR'
ON CONFLICT (base_currency_id, target_currency_id)
DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW();
