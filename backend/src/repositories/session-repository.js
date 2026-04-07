const { query } = require('../db/pool');

async function createSession({ userId, token, expiresAt }) {
  const result = await query(
    `
      INSERT INTO auth_sessions (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token, expires_at, created_at
    `,
    [userId, token, expiresAt]
  );

  return result.rows[0];
}

async function findSessionByToken(token) {
  if (!token) {
    return null;
  }

  const result = await query(
    `
      SELECT s.id, s.user_id, s.token, s.expires_at, s.created_at,
             u.id AS uid, u.username
      FROM auth_sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token = $1
      LIMIT 1
    `,
    [token]
  );

  return result.rows[0] || null;
}

async function deleteSessionByToken(token) {
  if (!token) {
    return;
  }

  await query('DELETE FROM auth_sessions WHERE token = $1', [token]);
}

async function deleteExpiredSessions() {
  await query('DELETE FROM auth_sessions WHERE expires_at < NOW()');
}

module.exports = {
  createSession,
  findSessionByToken,
  deleteSessionByToken,
  deleteExpiredSessions,
};
