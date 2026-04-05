const userRepository = require('../repositories/user-repository');

const PUBLIC_USERNAME = '_public_open_user_';
const PUBLIC_PASSWORD_PLACEHOLDER = 'auth-disabled-public-mode';

async function resolvePublicUser() {
  const existingUser = await userRepository.findByUsername(PUBLIC_USERNAME);
  if (existingUser) {
    return existingUser;
  }

  try {
    return await userRepository.createUser({
      username: PUBLIC_USERNAME,
      passwordHash: PUBLIC_PASSWORD_PLACEHOLDER,
    });
  } catch (error) {
    if (error?.code === '23505') {
      return userRepository.findByUsername(PUBLIC_USERNAME);
    }

    throw error;
  }
}

async function requireAuth(req, res, next) {
  const publicUser = await resolvePublicUser();

  req.auth = {
    userId: publicUser.id,
    username: publicUser.username,
  };

  return next();
}

module.exports = {
  requireAuth,
};
