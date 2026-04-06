const AppError = require('../utils/app-error');
const { TRANSACTION_TYPES } = require('../config/constants');
const {
  ensurePositiveAmount,
  normalizeCurrencyCode,
  requireNonEmptyString,
  parseOptionalDateTime,
} = require('../utils/validation');
const transactionRepository = require('../repositories/transaction-repository');
const balanceRepository = require('../repositories/balance-repository');
const currencyService = require('./currency-service');

async function listTransactions(userId, limit = 100) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const transactions = await transactionRepository.listTransactions(userId, cappedLimit);

  return transactions.map((transaction) => ({
    ...transaction,
    amount: Number(transaction.amount),
    reference_amount: transaction.reference_amount ? Number(transaction.reference_amount) : null,
  }));
}

async function applyBalanceMutation(userId, currencyId, delta) {
  const balances = await balanceRepository.listBalancesByUser(userId);
  const existing = balances.find((balance) => balance.currency_id === currencyId);
  const nextAmount = Number(existing?.balance || 0) + delta;

  if (nextAmount < 0) {
    throw new AppError('Transaction would result in a negative balance', 400);
  }

  await balanceRepository.upsertBalance({
    userId,
    currencyId,
    amount: nextAmount,
  });
}

async function createTransaction(userId, payload) {
  const type = requireNonEmptyString(payload.type, 'type');

  if (!TRANSACTION_TYPES.includes(type)) {
    throw new AppError(`type must be one of: ${TRANSACTION_TYPES.join(', ')}`, 400);
  }

  const currencyCode = normalizeCurrencyCode(payload.currencyCode, 'currencyCode');
  const amount = ensurePositiveAmount(payload.amount, 'amount');
  const description = payload.description?.trim() || null;
  const occurredAt = parseOptionalDateTime(payload.occurredAt, 'occurredAt');

  const currency = await currencyService.findCurrencyByCodeOrThrow(currencyCode);

  let referenceCurrency = null;
  let referenceAmount = null;

  if (payload.referenceCurrencyCode) {
    referenceCurrency = await currencyService.findCurrencyByCodeOrThrow(
      normalizeCurrencyCode(payload.referenceCurrencyCode, 'referenceCurrencyCode')
    );
  }

  if (typeof payload.referenceAmount !== 'undefined' && payload.referenceAmount !== null) {
    referenceAmount = ensurePositiveAmount(payload.referenceAmount, 'referenceAmount');
  }

  if (type === 'conversion') {
    if (!referenceCurrency || !referenceAmount) {
      throw new AppError(
        'conversion transaction requires referenceCurrencyCode and referenceAmount',
        400
      );
    }
  }

  // Expense operations should always carry a concrete datetime for accurate reporting.
  if ((type === 'withdrawal' || type === 'transfer_out') && !occurredAt) {
    throw new AppError('occurredAt is required for expense transactions', 400);
  }

  const transaction = await transactionRepository.createTransaction({
    userId,
    currencyId: currency.id,
    type,
    amount,
    referenceCurrencyId: referenceCurrency?.id || null,
    referenceAmount,
    description,
    occurredAt,
  });

  if (type === 'deposit' || type === 'transfer_in') {
    await applyBalanceMutation(userId, currency.id, amount);
  }

  if (type === 'withdrawal' || type === 'transfer_out') {
    await applyBalanceMutation(userId, currency.id, -amount);
  }

  if (type === 'conversion') {
    await applyBalanceMutation(userId, currency.id, -amount);
    await applyBalanceMutation(userId, referenceCurrency.id, referenceAmount);
  }

  return {
    ...transaction,
    amount: Number(transaction.amount),
    reference_amount: transaction.reference_amount ? Number(transaction.reference_amount) : null,
  };
}

async function getIncomeExpenseSummary(userId, months = 6) {
  const rows = await transactionRepository.getIncomeExpenseSummaryByMonth(userId, months);

  return rows.map((row) => ({
    label: row.label,
    income: Number(row.income),
    expense: Number(row.expense),
  }));
}

module.exports = {
  listTransactions,
  createTransaction,
  getIncomeExpenseSummary,
};
