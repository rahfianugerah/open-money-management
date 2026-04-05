const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toBool(value, fallback = false) {
  if (typeof value === 'undefined') {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: toInt(process.env.PORT, 3000),

  db: {
    url: process.env.DB_URL,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: toInt(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME || 'open-money-management',
  },

  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:4321',

  exchange: {
    enabled: toBool(process.env.EXCHANGE_API_ENABLED, false),
    provider: process.env.EXCHANGE_API_PROVIDER || 'exchangerate.host',
    baseUrl: process.env.EXCHANGE_API_BASE_URL || 'https://api.exchangerate.host',
    apiKey: process.env.EXCHANGE_API_KEY || '',
  },

  llm: {
    apiUrl: process.env.LLM_API_URL || 'http://localhost:11434/api/generate',
    model: process.env.LLM_MODEL || 'llama3.1:8b',
    timeoutMs: toInt(process.env.LLM_TIMEOUT_MS, 20000),
  },
};

module.exports = env;
