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
        b.updated_at
      FROM balances b
      INNER JOIN currencies c ON c.id = b.currency_id
      WHERE b.user_id = $1
      ORDER BY c.code ASC
    `,
    [userId]
  );

  return result.rows;
}

async function findBalanceById(id, userId) {
  const result = await query(
    `
      SELECT id, user_id, currency_id, balance, updated_at
      FROM balances
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [id, userId]
  );

  return result.rows[0] || null;
}

async function upsertBalance({ userId, currencyId, amount }) {
  const result = await query(
    `
      INSERT INTO balances (user_id, currency_id, balance, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, currency_id)
      DO UPDATE SET balance = EXCLUDED.balance, updated_at = NOW()
      RETURNING id, user_id, currency_id, balance, updated_at
    `,
    [userId, currencyId, amount]
  );

  return result.rows[0];
}

async function updateBalanceById({ id, userId, amount }) {
  const result = await query(
    `
      UPDATE balances
      SET balance = $3, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, currency_id, balance, updated_at
    `,
    [id, userId, amount]
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

module.exports = {
  listBalancesByUser,
  findBalanceById,
  upsertBalance,
  updateBalanceById,
  deleteBalanceById,
};
