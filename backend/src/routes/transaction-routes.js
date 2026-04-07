const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { requireAuth } = require('../middlewares/auth');
const transactionController = require('../controllers/transaction-controller');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(transactionController.listTransactions));
router.post('/', requireAuth, asyncHandler(transactionController.createTransaction));
router.get('/summary/income-expense', requireAuth, asyncHandler(transactionController.getIncomeExpenseSummary));
router.get('/summary/ohlc', requireAuth, asyncHandler(transactionController.getOhlcSummary));
router.put('/:id', requireAuth, asyncHandler(transactionController.updateTransaction));
router.delete('/:id', requireAuth, asyncHandler(transactionController.deleteTransaction));

module.exports = router;
