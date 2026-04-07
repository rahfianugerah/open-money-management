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
        t.bank_name,
        t.category,
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

async function findTransactionById(id, userId) {
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
        t.bank_name,
        t.category,
        t.created_at
      FROM transactions t
      INNER JOIN currencies c ON c.id = t.currency_id
      LEFT JOIN currencies ref ON ref.id = t.reference_currency_id
      WHERE t.id = $1 AND t.user_id = $2
      LIMIT 1
    `,
    [id, userId]
  );

  return result.rows[0] || null;
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
  bankName = 'Cash',
  category = 'General',
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
        created_at,
        bank_name,
        category
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamp, NOW()), $9, $10)
      RETURNING id, user_id, currency_id, type, amount, reference_currency_id, reference_amount, description, bank_name, category, created_at
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
      bankName,
      category,
    ]
  );

  return result.rows[0];
}

async function updateTransactionById({
  id,
  userId,
  currencyId,
  type,
  amount,
  referenceCurrencyId,
  referenceAmount,
  description,
  occurredAt,
  bankName = 'Cash',
  category = 'General',
}) {
  const result = await query(
    `
      UPDATE transactions
      SET
        currency_id = $3,
        type = $4,
        amount = $5,
        reference_currency_id = $6,
        reference_amount = $7,
        description = $8,
        created_at = COALESCE($9::timestamp, created_at),
        bank_name = $10,
        category = $11
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, currency_id, type, amount, reference_currency_id, reference_amount, description, bank_name, category, created_at
    `,
    [
      id,
      userId,
      currencyId,
      type,
      amount,
      referenceCurrencyId,
      referenceAmount,
      description,
      occurredAt,
      bankName,
      category,
    ]
  );

  return result.rows[0] || null;
}

async function deleteTransactionById(id, userId) {
  const result = await query(
    `
      DELETE FROM transactions
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
    [id, userId]
  );

  return result.rows[0] || null;
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

async function getOhlcSummaryByMonth(userId, months = 6) {
  const result = await query(
    `
      WITH monthly AS (
        SELECT
          date_trunc('month', t.created_at) AS month,
          COALESCE(SUM(CASE WHEN t.type IN ('deposit', 'transfer_in') THEN t.amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN t.type IN ('withdrawal', 'transfer_out') THEN t.amount ELSE 0 END), 0) AS expense
        FROM transactions t
        WHERE t.user_id = $1
          AND t.created_at >= date_trunc('month', NOW()) - (($2::int - 1) * interval '1 month')
        GROUP BY 1
        ORDER BY 1
      ),
      running_close AS (
        SELECT
          month,
          income,
          expense,
          SUM(income - expense) OVER (ORDER BY month) AS close_val
        FROM monthly
      ),
      with_open AS (
        SELECT
          month,
          income,
          expense,
          close_val,
          COALESCE(LAG(close_val) OVER (ORDER BY month), 0) AS open_val
        FROM running_close
      )
      SELECT
        to_char(month, 'YYYY-MM') AS label,
        open_val              AS open,
        open_val + income     AS high,
        open_val - expense    AS low,
        close_val             AS close
      FROM with_open
      ORDER BY month ASC
    `,
    [userId, months]
  );

  return result.rows;
}

module.exports = {
  listTransactions,
  findTransactionById,
  createTransaction,
  updateTransactionById,
  deleteTransactionById,
  getIncomeExpenseSummaryByMonth,
  getOhlcSummaryByMonth,
};
