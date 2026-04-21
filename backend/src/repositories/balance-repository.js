const { query } = require('../db/pool');

async function listBalancesByUser(userId) {
  const result = await query(
    `
      SELECT
        b.id,
        b.user_id,
        b.currency_id,
        c.code AS currency_code,
        c.name AS currency_name,
        c.symbol AS currency_symbol,
        b.balance,
        b.bank_name,
        b.category,
        b.updated_at
      FROM balances b
      INNER JOIN currencies c ON c.id = b.currency_id
      WHERE b.user_id = $1
      ORDER BY b.bank_name ASC, c.code ASC
    `,
    [userId]
  );

  return result.rows;
}

async function findBalanceById(id, userId) {
  const result = await query(
    `
      SELECT id, user_id, currency_id, balance, bank_name, category, updated_at
      FROM balances
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [id, userId]
  );

  return result.rows[0] || null;
}

async function upsertBalance({ userId, currencyId, amount, bankName = 'Cash', category = 'General' }) {
  const result = await query(
    `
      INSERT INTO balances (user_id, currency_id, balance, bank_name, category, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, currency_id, bank_name)
      DO UPDATE SET balance = EXCLUDED.balance, category = EXCLUDED.category, updated_at = NOW()
      RETURNING id, user_id, currency_id, balance, bank_name, category, updated_at
    `,
    [userId, currencyId, amount, bankName, category]
  );

  return result.rows[0];
}

async function updateBalanceById({ id, userId, amount, bankName, category }) {
  const result = await query(
    `
      UPDATE balances
      SET balance = $3,
          bank_name = COALESCE($4, bank_name),
          category  = COALESCE($5, category),
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, currency_id, balance, bank_name, category, updated_at
    `,
    [id, userId, amount, bankName ?? null, category ?? null]
  );

  return result.rows[0] || null;
}

async function deleteBalanceById(id, userId) {
  const result = await query(
    `
      DELETE FROM balances
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
    [id, userId]
  );

  return result.rows[0] || null;
}

async function listBalancesGroupedByBank(userId) {
  const result = await query(
    `
      SELECT
        b.bank_name,
        json_agg(
          json_build_object(
            'currency_code', c.code,
            'currency_name', c.name,
            'balance', b.balance
          ) ORDER BY c.code
        ) AS currencies,
        SUM(b.balance) AS total_balance
      FROM balances b
      INNER JOIN currencies c ON c.id = b.currency_id
      WHERE b.user_id = $1
      GROUP BY b.bank_name
      ORDER BY b.bank_name ASC
    `,
    [userId]
  );

  return result.rows;
}

module.exports = {
  listBalancesByUser,
  listBalancesGroupedByBank,
  findBalanceById,
  upsertBalance,
  updateBalanceById,
  deleteBalanceById,
};
