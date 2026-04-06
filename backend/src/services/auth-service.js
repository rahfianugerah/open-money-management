const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/app-error');
const { requireNonEmptyString } = require('../utils/validation');
const userRepository = require('../repositories/user-repository');

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
 * Signs a JWT token used as bearer auth by frontend modules.
 */
function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
    },
    env.auth.jwtSecret,
    {
      expiresIn: env.auth.tokenTtl,
    }
  );
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

  return {
    token: signAccessToken(user),
    user: toPublicUser(user),
  };
}

/**
 * Resolves current user from bearer token.
 * Edge case: expired/invalid tokens return null to simplify middleware branching.
 */
async function getSessionUser(token) {
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.auth.jwtSecret);
    const userId = payload?.sub;

    if (!userId || typeof userId !== 'string') {
      return null;
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return null;
    }

    return toPublicUser(user);
  } catch {
    return null;
  }
}

module.exports = {
  register,
  login,
  getSessionUser,
};
