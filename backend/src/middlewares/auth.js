const AppError = require('../utils/app-error');
const authService = require('../services/auth-service');

/**
 * Extracts bearer token from Authorization header.
 * Expected header shape: "Authorization: Bearer <token>".
 */
function readBearerToken(req) {
  const header = req.headers?.authorization;

  if (!header || typeof header !== 'string') {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

/**
 * Auth middleware for all protected APIs.
 * On success, req.auth is populated with { userId, username }.
 */
async function requireAuth(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await authService.getSessionUser(token);
    if (!user) {
      throw new AppError('Not authenticated', 401);
    }

    req.auth = {
      userId: user.id,
      username: user.username,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  readBearerToken,
  requireAuth,
};
