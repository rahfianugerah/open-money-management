const { query } = require('../db/pool');

async function listCurrencies() {
  const result = await query(
    `
      SELECT id, code, name, symbol, is_default, created_at, updated_at
      FROM currencies
      ORDER BY code ASC
    `
  );

  return result.rows;
}

async function findCurrencyByCode(code) {
  const result = await query(
    `
      SELECT id, code, name, symbol, is_default, created_at, updated_at
      FROM currencies
      WHERE code = $1
      LIMIT 1
    `,
    [code]
  );

  return result.rows[0] || null;
}

async function findCurrencyById(id) {
  const result = await query(
    `
      SELECT id, code, name, symbol, is_default, created_at, updated_at
      FROM currencies
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function createCurrency({ code, name, symbol, isDefault }) {
  const result = await query(
    `
      INSERT INTO currencies (code, name, symbol, is_default)
      VALUES ($1, $2, $3, $4)
      RETURNING id, code, name, symbol, is_default, created_at, updated_at
    `,
    [code, name, symbol, isDefault]
  );

  return result.rows[0];
}

async function clearDefaultCurrencies() {
  await query(
    `
      UPDATE currencies
      SET is_default = false, updated_at = NOW()
      WHERE is_default = true
    `
  );
}

async function updateCurrency(id, { name, symbol, isDefault }) {
  const result = await query(
    `
      UPDATE currencies
      SET
        name = COALESCE($2, name),
        symbol = COALESCE($3, symbol),
        is_default = COALESCE($4, is_default),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, code, name, symbol, is_default, created_at, updated_at
    `,
    [id, name, symbol, isDefault]
  );

  return result.rows[0] || null;
}

module.exports = {
  listCurrencies,
  findCurrencyByCode,
  findCurrencyById,
  createCurrency,
  clearDefaultCurrencies,
  updateCurrency,
};
