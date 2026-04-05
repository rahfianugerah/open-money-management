const { query } = require('../db/pool');

async function listRates() {
  const result = await query(
    `
      SELECT
        cr.id,
        cr.base_currency_id,
        base.code AS base_code,
        cr.target_currency_id,
        target.code AS target_code,
        cr.rate,
        cr.created_at,
        cr.updated_at
      FROM currency_rates cr
      INNER JOIN currencies base ON base.id = cr.base_currency_id
      INNER JOIN currencies target ON target.id = cr.target_currency_id
      ORDER BY base.code ASC, target.code ASC
    `
  );

  return result.rows;
}

async function findRate(baseCurrencyId, targetCurrencyId) {
  const result = await query(
    `
      SELECT id, base_currency_id, target_currency_id, rate, created_at, updated_at
      FROM currency_rates
      WHERE base_currency_id = $1 AND target_currency_id = $2
      LIMIT 1
    `,
    [baseCurrencyId, targetCurrencyId]
  );

  return result.rows[0] || null;
}

async function upsertRate(baseCurrencyId, targetCurrencyId, rate) {
  const result = await query(
    `
      INSERT INTO currency_rates (base_currency_id, target_currency_id, rate)
      VALUES ($1, $2, $3)
      ON CONFLICT (base_currency_id, target_currency_id)
      DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW()
      RETURNING id, base_currency_id, target_currency_id, rate, created_at, updated_at
    `,
    [baseCurrencyId, targetCurrencyId, rate]
  );

  return result.rows[0];
}

async function updateRate(id, rate) {
  const result = await query(
    `
      UPDATE currency_rates
      SET rate = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, base_currency_id, target_currency_id, rate, created_at, updated_at
    `,
    [id, rate]
  );

  return result.rows[0] || null;
}

module.exports = {
  listRates,
  findRate,
  upsertRate,
  updateRate,
};
