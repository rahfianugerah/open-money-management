const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { requireAuth } = require('../middlewares/auth');
const currencyController = require('../controllers/currency-controller');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(currencyController.listCurrencies));
router.post('/', requireAuth, asyncHandler(currencyController.createCurrency));

router.get('/rates/list', requireAuth, asyncHandler(currencyController.listRates));
router.post('/rates/upsert', requireAuth, asyncHandler(currencyController.upsertRate));
router.put('/rates/:rateId', requireAuth, asyncHandler(currencyController.updateRate));
router.post('/convert', requireAuth, asyncHandler(currencyController.convert));

router.get('/provider-config', requireAuth, asyncHandler(currencyController.getExchangeProviderConfig));
router.put('/provider-config', requireAuth, asyncHandler(currencyController.saveExchangeProviderConfig));
router.post('/rates/sync', requireAuth, asyncHandler(currencyController.syncProviderRates));

router.put('/:currencyId', requireAuth, asyncHandler(currencyController.updateCurrency));

module.exports = router;
