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
  const cappedLimit = Math.min(Math.max(Number(limit) || 100, 1), 5000);
  const transactions = await transactionRepository.listTransactions(userId, cappedLimit);

  return transactions.map(normalizeTransaction);
}

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    amount: Number(transaction.amount),
    reference_amount: transaction.reference_amount ? Number(transaction.reference_amount) : null,
  };
}

function buildBalanceDeltaMap({ type, currencyId, amount, referenceCurrencyId, referenceAmount }) {
  const deltaMap = new Map();

  function addDelta(code, delta) {
    if (!code || !Number.isFinite(delta) || delta === 0) {
      return;
    }

    deltaMap.set(code, (deltaMap.get(code) || 0) + delta);
  }

  if (type === 'deposit' || type === 'transfer_in') {
    addDelta(currencyId, amount);
  }

  if (type === 'withdrawal' || type === 'transfer_out') {
    addDelta(currencyId, -amount);
  }

  if (type === 'conversion') {
    addDelta(currencyId, -amount);
    addDelta(referenceCurrencyId, referenceAmount);
  }

  return deltaMap;
}

function diffBalanceDeltaMaps(previousMap, nextMap) {
  const netDeltaMap = new Map();
  const currencyIds = new Set([...previousMap.keys(), ...nextMap.keys()]);

  for (const currencyId of currencyIds) {
    const previousDelta = previousMap.get(currencyId) || 0;
    const nextDelta = nextMap.get(currencyId) || 0;
    const netDelta = nextDelta - previousDelta;

    if (netDelta !== 0) {
      netDeltaMap.set(currencyId, netDelta);
    }
  }

  return netDeltaMap;
}

async function applyBalanceDeltaMap(userId, deltaMap) {
  for (const [currencyId, delta] of deltaMap.entries()) {
    await applyBalanceMutation(userId, currencyId, delta);
  }
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

  const deltaMap = buildBalanceDeltaMap({
    type,
    currencyId: currency.id,
    amount,
    referenceCurrencyId: referenceCurrency?.id || null,
    referenceAmount,
  });
  await applyBalanceDeltaMap(userId, deltaMap);

  return normalizeTransaction({
    ...transaction,
    currency_code: currency.code,
    reference_currency_code: referenceCurrency?.code || null,
  });
}

async function updateTransaction(userId, transactionId, payload) {
  const existing = await transactionRepository.findTransactionById(transactionId, userId);

  if (!existing) {
    throw new AppError('Transaction not found', 404);
  }

  const type = payload.type
    ? requireNonEmptyString(payload.type, 'type')
    : requireNonEmptyString(existing.type, 'type');

  if (!TRANSACTION_TYPES.includes(type)) {
    throw new AppError(`type must be one of: ${TRANSACTION_TYPES.join(', ')}`, 400);
  }

  const currencyCode = payload.currencyCode
    ? normalizeCurrencyCode(payload.currencyCode, 'currencyCode')
    : normalizeCurrencyCode(existing.currency_code, 'currencyCode');
  const amount =
    typeof payload.amount === 'undefined'
      ? Number(existing.amount)
      : ensurePositiveAmount(payload.amount, 'amount');
  const description = Object.prototype.hasOwnProperty.call(payload, 'description')
    ? payload.description?.trim() || null
    : existing.description;

  const occurredAtInput = Object.prototype.hasOwnProperty.call(payload, 'occurredAt')
    ? payload.occurredAt
    : existing.created_at;
  const parsedOccurredAt = parseOptionalDateTime(occurredAtInput, 'occurredAt');

  if ((type === 'withdrawal' || type === 'transfer_out') && !parsedOccurredAt) {
    throw new AppError('occurredAt is required for expense transactions', 400);
  }

  const currency = await currencyService.findCurrencyByCodeOrThrow(currencyCode);

  let referenceCurrency = null;
  let referenceAmount = null;

  if (type === 'conversion') {
    const referenceCurrencyCode = normalizeCurrencyCode(
      payload.referenceCurrencyCode || existing.reference_currency_code,
      'referenceCurrencyCode'
    );
    referenceCurrency = await currencyService.findCurrencyByCodeOrThrow(referenceCurrencyCode);

    const referenceAmountInput =
      typeof payload.referenceAmount === 'undefined'
        ? existing.reference_amount
        : payload.referenceAmount;
    referenceAmount = ensurePositiveAmount(referenceAmountInput, 'referenceAmount');
  }

  const previousDeltaMap = buildBalanceDeltaMap({
    type: existing.type,
    currencyId: existing.currency_id,
    amount: Number(existing.amount),
    referenceCurrencyId: existing.reference_currency_id,
    referenceAmount: Number(existing.reference_amount || 0),
  });
  const nextDeltaMap = buildBalanceDeltaMap({
    type,
    currencyId: currency.id,
    amount,
    referenceCurrencyId: referenceCurrency?.id || null,
    referenceAmount,
  });
  const netDeltaMap = diffBalanceDeltaMaps(previousDeltaMap, nextDeltaMap);

  await applyBalanceDeltaMap(userId, netDeltaMap);

  const updated = await transactionRepository.updateTransactionById({
    id: transactionId,
    userId,
    currencyId: currency.id,
    type,
    amount,
    referenceCurrencyId: referenceCurrency?.id || null,
    referenceAmount,
    description,
    occurredAt: parsedOccurredAt || existing.created_at,
  });

  if (!updated) {
    throw new AppError('Transaction not found', 404);
  }

  return normalizeTransaction({
    ...updated,
    currency_code: currency.code,
    reference_currency_code: referenceCurrency?.code || null,
  });
}

async function deleteTransaction(userId, transactionId) {
  const existing = await transactionRepository.findTransactionById(transactionId, userId);

  if (!existing) {
    throw new AppError('Transaction not found', 404);
  }

  const previousDeltaMap = buildBalanceDeltaMap({
    type: existing.type,
    currencyId: existing.currency_id,
    amount: Number(existing.amount),
    referenceCurrencyId: existing.reference_currency_id,
    referenceAmount: Number(existing.reference_amount || 0),
  });
  const reverseDeltaMap = new Map();

  for (const [currencyId, delta] of previousDeltaMap.entries()) {
    reverseDeltaMap.set(currencyId, -delta);
  }

  await applyBalanceDeltaMap(userId, reverseDeltaMap);

  const deleted = await transactionRepository.deleteTransactionById(transactionId, userId);

  if (!deleted) {
    throw new AppError('Transaction not found', 404);
  }

  return normalizeTransaction(existing);
}

async function getIncomeExpenseSummary(userId, months = 6) {
  const rows = await transactionRepository.getIncomeExpenseSummaryByMonth(userId, months);

  return rows.map((row) => ({
    label: row.label,
    income: Number(row.income),
    expense: Number(row.expense),
  }));
}

async function getOhlcSummary(userId, months = 6) {
  const rows = await transactionRepository.getOhlcSummaryByMonth(userId, months);

  return rows.map((row) => ({
    label: row.label,
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
  }));
}

module.exports = {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getIncomeExpenseSummary,
  getOhlcSummary,
};
