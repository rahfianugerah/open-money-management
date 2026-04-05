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

module.exports = {
  requireNonEmptyString,
  parseAmount,
  ensurePositiveAmount,
  normalizeCurrencyCode,
};
