const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { requireAuth } = require('../middlewares/auth');
const dashboardController = require('../controllers/dashboard-controller');

const router = express.Router();

router.get('/summary', requireAuth, asyncHandler(dashboardController.getSummary));

module.exports = router;
