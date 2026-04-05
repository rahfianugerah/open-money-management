const { Pool } = require('pg');
const env = require('../config/env');

const connectionConfig = env.db.url
  ? {
      connectionString: env.db.url,
    }
  : {
      user: env.db.user,
      password: env.db.password,
      host: env.db.host,
      port: env.db.port,
      database: env.db.database,
    };

const pool = new Pool(connectionConfig);

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
};
