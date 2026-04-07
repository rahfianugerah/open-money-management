const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const env = require('../config/env');
const AppError = require('../utils/app-error');
const { requireNonEmptyString } = require('../utils/validation');
const userRepository = require('../repositories/user-repository');
const sessionRepository = require('../repositories/session-repository');

const MIN_PASSWORD_LENGTH = 8;

/**
 * Normalizes and validates credentials.
 * Data shape in: { username: string, password: string }
 * Data shape out: { username: lowercased string, password: trimmed string }
 */
function normalizeCredentials({ username, password }) {
  const normalizedUsername = requireNonEmptyString(username, 'username').toLowerCase();
  const normalizedPassword = requireNonEmptyString(password, 'password');

  return {
    username: normalizedUsername,
    password: normalizedPassword,
  };
}

/**
 * Converts persisted user record to the public API shape.
 */
function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
  };
}

/**
 * Generates an opaque session token (96 hex characters).
 */
function generateSessionToken() {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Registers a new local account.
 * Edge case: duplicate username returns HTTP 409.
 */
async function register({ username, password }) {
  const credentials = normalizeCredentials({ username, password });

  if (credentials.password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(`Password must have at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  }

  const existingUser = await userRepository.findByUsername(credentials.username);
  if (existingUser) {
    throw new AppError('Username already exists', 409);
  }

  const passwordHash = await bcrypt.hash(credentials.password, 12);
  const user = await userRepository.createUser({
    username: credentials.username,
    passwordHash,
  });

  return toPublicUser(user);
}

/**
 * Authenticates a user and returns a signed access token.
 * Data shape out: { token: string, user: { id, username } }
 */
async function login({ username, password }) {
  const credentials = normalizeCredentials({ username, password });
  const user = await userRepository.findByUsername(credentials.username);

  if (!user) {
    throw new AppError('Invalid username or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid username or password', 401);
  }

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + env.auth.sessionTtlDays * 86_400_000);

  await sessionRepository.createSession({
    userId: user.id,
    token,
    expiresAt,
  });

  return {
    token,
    user: toPublicUser(user),
  };
}

/**
 * Resolves current user from session token.
 * Expired or unknown tokens return null to simplify middleware branching.
 */
async function getSessionUser(token) {
  if (!token) {
    return null;
  }

  const session = await sessionRepository.findSessionByToken(token);
  if (!session) {
    return null;
  }

  if (new Date(session.expires_at) <= new Date()) {
    await sessionRepository.deleteSessionByToken(token);
    return null;
  }

  return {
    id: session.user_id,
    username: session.username,
  };
}

/**
 * Invalidates the session associated with the given token.
 */
async function logout(token) {
  await sessionRepository.deleteSessionByToken(token);
}

module.exports = {
  register,
  login,
  getSessionUser,
  logout,
};
