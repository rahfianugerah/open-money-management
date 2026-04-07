const AppError = require('./app-error');

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  return value.trim();
}

function parseAmount(value, fieldName = 'amount') {
  const amount = Number.parseFloat(value);

  if (!Number.isFinite(amount)) {
    throw new AppError(`${fieldName} must be a valid number`, 400);
  }

  return amount;
}

function ensurePositiveAmount(value, fieldName = 'amount') {
  const amount = parseAmount(value, fieldName);

  if (amount <= 0) {
    throw new AppError(`${fieldName} must be greater than 0`, 400);
  }

  return amount;
}

function normalizeCurrencyCode(code, fieldName = 'currencyCode') {
  const normalizedCode = requireNonEmptyString(code, fieldName).toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalizedCode)) {
    throw new AppError(`${fieldName} must be a valid 3-letter ISO code`, 400);
  }

  return normalizedCode;
}

/**
 * Normalizes optional datetime input into a wall-clock string suitable for
 * TIMESTAMP (without time zone) columns.  We intentionally avoid converting to
 * UTC so the stored value matches what the user selected in the datetime-local
 * input.
 */
function parseOptionalDateTime(value, fieldName = 'occurredAt') {
  if (typeof value === 'undefined' || value === null || String(value).trim() === '') {
    return null;
  }

  const raw = String(value).trim();

  // Validate that the string represents a real date.
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.valueOf())) {
    throw new AppError(`${fieldName} must be a valid datetime`, 400);
  }

  // If the value already looks like an ISO / datetime-local string (YYYY-MM-DDTHH:MM...)
  // return it without timezone conversion.  Otherwise fall back to an ISO
  // representation but strip the trailing Z so PG treats it as local.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    // Strip any trailing Z or timezone offset so PG stores wall-clock time.
    return raw.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
  }

  return parsed.toISOString().replace(/Z$/, '');
}

function parseOptionalString(value, fallback = '') {
  if (typeof value === 'undefined' || value === null) {
    return fallback;
  }

  const trimmed = String(value).trim();
  return trimmed || fallback;
}

module.exports = {
  requireNonEmptyString,
  parseAmount,
  ensurePositiveAmount,
  normalizeCurrencyCode,
  parseOptionalDateTime,
  parseOptionalString,
};
