const ENV_API_BASE =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.PUBLIC_API_BASE_URL
    : undefined;
const AUTH_STORAGE_KEY = 'omm-auth-token-v1';

const API_BASE = (ENV_API_BASE || window.__PUBLIC_API_BASE_URL__ || 'http://localhost:3000').replace(
  /\/+$/,
  ''
);

export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function buildApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

/**
 * Local auth token persistence used by page modules.
 */
function readAuthToken() {
  return localStorage.getItem(AUTH_STORAGE_KEY) || '';
}

function writeAuthToken(token) {
  if (!token) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, token);
}

async function parsePayload(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(payload?.error?.message || 'Request failed', response.status);
  }

  return payload?.data;
}

export async function apiRequest(path, options = {}) {
  const token = readAuthToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401 && !path.startsWith('/api/auth/')) {
    writeAuthToken('');
  }

  return parsePayload(response);
}

export async function ensureSession() {
  return apiRequest('/api/auth/session');
}

export async function register(payload) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload) {
  const loginResult = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  writeAuthToken(loginResult.token);
  return loginResult;
}

export async function logout() {
  try {
    await apiRequest('/api/auth/logout', {
      method: 'POST',
    });
  } finally {
    writeAuthToken('');
  }

  return {
    message: 'Logged out',
  };
}

export function hasAuthToken() {
  return Boolean(readAuthToken());
}

export async function getDashboardSummary() {
  return apiRequest('/api/dashboard/summary');
}

export async function listBalances() {
  return apiRequest('/api/balances');
}

export async function upsertBalance(payload) {
  return apiRequest('/api/balances', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBalance(balanceId, payload) {
  return apiRequest(`/api/balances/${balanceId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteBalance(balanceId) {
  return apiRequest(`/api/balances/${balanceId}`, {
    method: 'DELETE',
  });
}

export async function listCurrencies() {
  return apiRequest('/api/currencies');
}

export async function createCurrency(payload) {
  return apiRequest('/api/currencies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCurrency(currencyId, payload) {
  return apiRequest(`/api/currencies/${currencyId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function listRates() {
  return apiRequest('/api/currencies/rates/list');
}

export async function upsertRate(payload) {
  return apiRequest('/api/currencies/rates/upsert', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRate(rateId, payload) {
  return apiRequest(`/api/currencies/rates/${rateId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function convertCurrency(payload) {
  return apiRequest('/api/currencies/convert', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getProviderConfig() {
  return apiRequest('/api/currencies/provider-config');
}

export async function saveProviderConfig(payload) {
  return apiRequest('/api/currencies/provider-config', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function syncRates(payload = {}) {
  return apiRequest('/api/currencies/rates/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listTransactions(limit = 100) {
  return apiRequest(`/api/transactions?limit=${limit}`);
}

export async function createTransaction(payload) {
  return apiRequest('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getIncomeExpenseSummary(months = 6) {
  return apiRequest(`/api/transactions/summary/income-expense?months=${months}`);
}

export async function askChatbot(payload) {
  return apiRequest('/api/chatbot/query', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
