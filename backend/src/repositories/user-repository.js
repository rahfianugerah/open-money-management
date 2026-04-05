const { query } = require('../db/pool');

async function createUser({ username, passwordHash }) {
  const result = await query(
    `
      INSERT INTO users (username, password)
      VALUES ($1, $2)
      RETURNING id, username, created_at, updated_at
    `,
    [username, passwordHash]
  );

  return result.rows[0];
}

async function findByUsername(username) {
  const result = await query(
    `
      SELECT id, username, password, created_at, updated_at
      FROM users
      WHERE username = $1
      LIMIT 1
    `,
    [username]
  );

  return result.rows[0] || null;
}

async function findById(userId) {
  const result = await query(
    `
      SELECT id, username, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

module.exports = {
  createUser,
  findByUsername,
  findById,
};
