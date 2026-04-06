const { query } = require('../db/pool');

async function listTransactions(userId, limit = 100) {
  const result = await query(
    `
      SELECT
        t.id,
        t.user_id,
        t.currency_id,
        c.code AS currency_code,
        t.type,
        t.amount,
        t.reference_currency_id,
        ref.code AS reference_currency_code,
        t.reference_amount,
        t.description,
        t.created_at
      FROM transactions t
      INNER JOIN currencies c ON c.id = t.currency_id
      LEFT JOIN currencies ref ON ref.id = t.reference_currency_id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2
    `,
    [userId, limit]
  );

  return result.rows;
}

async function createTransaction({
  userId,
  currencyId,
  type,
  amount,
  referenceCurrencyId,
  referenceAmount,
  description,
  occurredAt,
}) {
  // created_at can be provided explicitly for backdated/expense datetime support.
  const result = await query(
    `
      INSERT INTO transactions (
        user_id,
        currency_id,
        type,
        amount,
        reference_currency_id,
        reference_amount,
        description,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamp, NOW()))
      RETURNING id, user_id, currency_id, type, amount, reference_currency_id, reference_amount, description, created_at
    `,
    [
      userId,
      currencyId,
      type,
      amount,
      referenceCurrencyId,
      referenceAmount,
      description,
      occurredAt,
    ]
  );

  return result.rows[0];
}

async function getIncomeExpenseSummaryByMonth(userId, months = 6) {
  const result = await query(
    `
      WITH month_window AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - (($2::int - 1) * interval '1 month'),
          date_trunc('month', NOW()),
          interval '1 month'
        ) AS month_start
      )
      SELECT
        to_char(m.month_start, 'YYYY-MM') AS label,
        COALESCE(SUM(CASE WHEN t.type IN ('deposit', 'transfer_in') THEN t.amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN t.type IN ('withdrawal', 'transfer_out') THEN t.amount ELSE 0 END), 0) AS expense
      FROM month_window m
      LEFT JOIN transactions t
        ON date_trunc('month', t.created_at) = m.month_start
        AND t.user_id = $1
      GROUP BY m.month_start
      ORDER BY m.month_start ASC
    `,
    [userId, months]
  );

  return result.rows;
}

module.exports = {
  listTransactions,
  createTransaction,
  getIncomeExpenseSummaryByMonth,
};
