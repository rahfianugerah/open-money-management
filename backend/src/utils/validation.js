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
 * Normalizes optional datetime input into a UTC ISO string.
 * Edge case: HTML datetime-local has no timezone, so we parse in local time and convert to ISO.
 */
function parseOptionalDateTime(value, fieldName = 'occurredAt') {
  if (typeof value === 'undefined' || value === null || String(value).trim() === '') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new AppError(`${fieldName} must be a valid datetime`, 400);
  }

  return parsed.toISOString();
}

module.exports = {
  requireNonEmptyString,
  parseAmount,
  ensurePositiveAmount,
  normalizeCurrencyCode,
  parseOptionalDateTime,
};
