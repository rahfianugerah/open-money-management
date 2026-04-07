const AppError = require('../utils/app-error');
const { parseAmount, normalizeCurrencyCode } = require('../utils/validation');
const balanceRepository = require('../repositories/balance-repository');
const currencyService = require('./currency-service');

function normalizeBalanceRecord(record) {
  return {
    ...record,
    balance: Number(record.balance),
  };
}

async function listUserBalances(userId) {
  const balances = await balanceRepository.listBalancesByUser(userId);
  return balances.map(normalizeBalanceRecord);
}

async function upsertUserBalance(userId, { currencyCode, amount, bankName, category }) {
  const normalizedCode = normalizeCurrencyCode(currencyCode, 'currencyCode');
  const parsedAmount = parseAmount(amount, 'amount');

  if (parsedAmount < 0) {
    throw new AppError('amount cannot be negative', 400);
  }

  const safeBankName = (bankName && String(bankName).trim()) || 'Cash';
  const safeCategory = (category && String(category).trim()) || 'General';

  const currency = await currencyService.findCurrencyByCodeOrThrow(normalizedCode);

  const saved = await balanceRepository.upsertBalance({
    userId,
    currencyId: currency.id,
    amount: parsedAmount,
    bankName: safeBankName,
    category: safeCategory,
  });

  return {
    ...saved,
    currency_code: currency.code,
    currency_name: currency.name,
    currency_symbol: currency.symbol,
    balance: Number(saved.balance),
  };
}

async function updateUserBalanceById(userId, balanceId, { amount }) {
  const parsedAmount = parseAmount(amount, 'amount');
  if (parsedAmount < 0) {
    throw new AppError('amount cannot be negative', 400);
  }

  const updated = await balanceRepository.updateBalanceById({
    id: balanceId,
    userId,
    amount: parsedAmount,
  });

  if (!updated) {
    throw new AppError('Balance not found', 404);
  }

  return {
    ...updated,
    balance: Number(updated.balance),
  };
}

async function deleteUserBalanceById(userId, balanceId) {
  const deleted = await balanceRepository.deleteBalanceById(balanceId, userId);

  if (!deleted) {
    throw new AppError('Balance not found', 404);
  }
}

async function getWalletSummary(userId) {
  const rows = await balanceRepository.listBalancesGroupedByBank(userId);

  return rows.map((row) => ({
    bankName: row.bank_name,
    currencies: (row.currencies || []).map((c) => ({
      ...c,
      balance: Number(c.balance),
    })),
    totalBalance: Number(row.total_balance),
  }));
}

module.exports = {
  listUserBalances,
  upsertUserBalance,
  updateUserBalanceById,
  deleteUserBalanceById,
  getWalletSummary,
};
