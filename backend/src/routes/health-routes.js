const express = require('express');
const asyncHandler = require('../utils/async-handler');
const healthController = require('../controllers/health-controller');

const router = express.Router();

router.get('/', asyncHandler(healthController.health));

module.exports = router;
