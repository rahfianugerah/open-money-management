const AppError = require('../utils/app-error');
const authService = require('../services/auth-service');
const { readBearerToken } = require('../middlewares/auth');

/**
 * Registers account, then returns normalized user payload.
 */
async function register(req, res) {
  const user = await authService.register(req.body || {});
  res.status(201).json({ data: user });
}

/**
 * Issues access token for valid credentials.
 */
async function login(req, res) {
  const loginResult = await authService.login(req.body || {});
  res.status(200).json({ data: loginResult });
}

/**
 * Validates the bearer token and resolves current user profile.
 */
async function session(req, res) {
  const token = readBearerToken(req);
  const user = await authService.getSessionUser(token);

  if (!user) {
    throw new AppError('Not authenticated', 401);
  }

  res.status(200).json({ data: user });
}

/**
 * Invalidates the server-side session, then confirms logout.
 */
async function logout(req, res) {
  const token = readBearerToken(req);
  await authService.logout(token);

  res.status(200).json({
    data: {
      message: 'Logged out',
    },
  });
}

module.exports = {
  register,
  login,
  session,
  logout,
};
