const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { requireAuth } = require('../middlewares/auth');
const balanceController = require('../controllers/balance-controller');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(balanceController.listBalances));
router.post('/', requireAuth, asyncHandler(balanceController.upsertBalance));
router.put('/:balanceId', requireAuth, asyncHandler(balanceController.updateBalance));
router.delete('/:balanceId', requireAuth, asyncHandler(balanceController.deleteBalance));

module.exports = router;
