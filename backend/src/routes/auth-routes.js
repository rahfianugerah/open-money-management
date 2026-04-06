const express = require('express');
const asyncHandler = require('../utils/async-handler');
const authController = require('../controllers/auth-controller');

const router = express.Router();

// Simple username/password auth flow used by all frontend guards.
router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/session', asyncHandler(authController.session));
router.post('/logout', asyncHandler(authController.logout));

module.exports = router;
