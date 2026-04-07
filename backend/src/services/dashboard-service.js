const balanceService = require('./balance-service');
const currencyService = require('./currency-service');
const transactionService = require('./transaction-service');

async function aggregateBalances(userId, targetCode) {
  const balances = await balanceService.listUserBalances(userId);

  let total = 0;
  const missingRates = [];

  for (const balance of balances) {
    if (balance.balance === 0) {
      continue;
    }

    try {
      const converted = await currencyService.convertAmount({
        amount: balance.balance,
        fromCode: balance.currency_code,
        toCode: targetCode,
      });
      total += converted.convertedAmount;
    } catch (error) {
      missingRates.push(`${balance.currency_code}->${targetCode}`);
    }
  }

  return {
    currency: targetCode,
    total,
    missingRates,
  };
}

async function getDashboardSummary(userId) {
  const balances = await balanceService.listUserBalances(userId);
  const totalUsd = await aggregateBalances(userId, 'USD');
  const totalIdr = await aggregateBalances(userId, 'IDR');
  const incomeExpense = await transactionService.getIncomeExpenseSummary(userId, 6);
  const walletSummary = await balanceService.getWalletSummary(userId);

  return {
    balances,
    totals: {
      usd: totalUsd,
      idr: totalIdr,
    },
    incomeExpense,
    walletSummary,
  };
}

module.exports = {
  getDashboardSummary,
};
