const transactionService = require('../services/transaction-service');

async function listTransactions(req, res) {
  const transactions = await transactionService.listTransactions(
    req.auth.userId,
    req.query.limit
  );

  res.status(200).json({ data: transactions });
}

async function createTransaction(req, res) {
  const transaction = await transactionService.createTransaction(req.auth.userId, req.body);
  res.status(201).json({ data: transaction });
}

async function getIncomeExpenseSummary(req, res) {
  const months = req.query.months ? Number(req.query.months) : 6;
  const summary = await transactionService.getIncomeExpenseSummary(req.auth.userId, months);

  res.status(200).json({ data: summary });
}

module.exports = {
  listTransactions,
  createTransaction,
  getIncomeExpenseSummary,
};
