-- Aligns baseline USD/IDR rates with current product defaults.

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
