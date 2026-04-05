const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { requireAuth } = require('../middlewares/auth');
const chatbotController = require('../controllers/chatbot-controller');

const router = express.Router();

router.post('/query', requireAuth, asyncHandler(chatbotController.query));

module.exports = router;
