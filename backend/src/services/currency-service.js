const env = require('../config/env');
const AppError = require('../utils/app-error');
const {
  normalizeCurrencyCode,
  ensurePositiveAmount,
  requireNonEmptyString,
} = require('../utils/validation');
const currencyRepository = require('../repositories/currency-repository');
const rateRepository = require('../repositories/rate-repository');
const settingsRepository = require('../repositories/settings-repository');

async function listCurrencies() {
  return currencyRepository.listCurrencies();
}

async function createCurrency({ code, name, symbol, isDefault }) {
  const normalizedCode = normalizeCurrencyCode(code, 'code');
  const normalizedName = requireNonEmptyString(name, 'name');

  const existing = await currencyRepository.findCurrencyByCode(normalizedCode);
  if (existing) {
    throw new AppError('Currency code already exists', 409);
  }

  if (isDefault) {
    await currencyRepository.clearDefaultCurrencies();
  }

  return currencyRepository.createCurrency({
    code: normalizedCode,
    name: normalizedName,
    symbol: symbol || null,
    isDefault: Boolean(isDefault),
  });
}

async function updateCurrency(currencyId, { name, symbol, isDefault }) {
  const existing = await currencyRepository.findCurrencyById(currencyId);
  if (!existing) {
    throw new AppError('Currency not found', 404);
  }

  if (isDefault === true) {
    await currencyRepository.clearDefaultCurrencies();
  }

  const updated = await currencyRepository.updateCurrency(currencyId, {
    name: typeof name === 'string' ? name.trim() : null,
    symbol: typeof symbol === 'string' ? symbol.trim() : null,
    isDefault: typeof isDefault === 'boolean' ? isDefault : null,
  });

  return updated;
}

async function findCurrencyByCodeOrThrow(code) {
  const normalizedCode = normalizeCurrencyCode(code);
  const currency = await currencyRepository.findCurrencyByCode(normalizedCode);

  if (!currency) {
    throw new AppError(`Currency not found: ${normalizedCode}`, 404);
  }

  return currency;
}

async function listRates() {
  return rateRepository.listRates();
}

async function upsertRateByCode({ baseCode, targetCode, rate }) {
  const parsedRate = ensurePositiveAmount(rate, 'rate');
  const baseCurrency = await findCurrencyByCodeOrThrow(baseCode);
  const targetCurrency = await findCurrencyByCodeOrThrow(targetCode);

  if (baseCurrency.id === targetCurrency.id) {
    throw new AppError('Base and target currency must be different', 400);
  }

  const saved = await rateRepository.upsertRate(baseCurrency.id, targetCurrency.id, parsedRate);

  return {
    ...saved,
    base_code: baseCurrency.code,
    target_code: targetCurrency.code,
  };
}

async function updateRateById(rateId, rate) {
  const parsedRate = ensurePositiveAmount(rate, 'rate');
  const updated = await rateRepository.updateRate(rateId, parsedRate);

  if (!updated) {
    throw new AppError('Rate not found', 404);
  }

  return updated;
}

async function convertAmount({ amount, fromCode, toCode, manualRate = null }) {
  const parsedAmount = ensurePositiveAmount(amount, 'amount');
  const fromCurrency = await findCurrencyByCodeOrThrow(fromCode);
  const toCurrency = await findCurrencyByCodeOrThrow(toCode);

  if (fromCurrency.id === toCurrency.id) {
    return {
      rate: 1,
      convertedAmount: parsedAmount,
      fromCode: fromCurrency.code,
      toCode: toCurrency.code,
      source: 'identity',
    };
  }

  if (manualRate !== null && typeof manualRate !== 'undefined') {
    const parsedRate = ensurePositiveAmount(manualRate, 'manualRate');
    return {
      rate: parsedRate,
      convertedAmount: parsedAmount * parsedRate,
      fromCode: fromCurrency.code,
      toCode: toCurrency.code,
      source: 'manual',
    };
  }

  const direct = await rateRepository.findRate(fromCurrency.id, toCurrency.id);
  if (direct) {
    return {
      rate: Number(direct.rate),
      convertedAmount: parsedAmount * Number(direct.rate),
      fromCode: fromCurrency.code,
      toCode: toCurrency.code,
      source: 'stored-direct',
    };
  }

  const reverse = await rateRepository.findRate(toCurrency.id, fromCurrency.id);
  if (reverse) {
    const computedRate = 1 / Number(reverse.rate);

    return {
      rate: computedRate,
      convertedAmount: parsedAmount * computedRate,
      fromCode: fromCurrency.code,
      toCode: toCurrency.code,
      source: 'stored-reverse',
    };
  }

  throw new AppError(
    `No stored conversion rate for ${fromCurrency.code} -> ${toCurrency.code}. Set a manual rate or configure currency rates first.`,
    400
  );
}

async function getExchangeProviderConfig() {
  const stored = await settingsRepository.getSetting('exchange_provider');
  const fallback = {
    enabled: env.exchange.enabled,
    provider: env.exchange.provider,
    baseUrl: env.exchange.baseUrl,
    apiKey: env.exchange.apiKey,
  };

  if (!stored) {
    return fallback;
  }

  return {
    ...fallback,
    ...stored.setting_value,
  };
}

async function saveExchangeProviderConfig(config) {
  const merged = {
    ...(await getExchangeProviderConfig()),
    ...config,
  };

  const saved = await settingsRepository.upsertSetting('exchange_provider', merged);
  return saved.setting_value;
}

async function syncRatesFromProvider(baseCode = 'USD') {
  const config = await getExchangeProviderConfig();

  if (!config.enabled) {
    throw new AppError('Exchange API sync is disabled. Enable it in settings first.', 400);
  }

  const currencies = await currencyRepository.listCurrencies();
  if (currencies.length === 0) {
    return [];
  }

  const normalizedBase = normalizeCurrencyCode(baseCode, 'baseCode');
  const symbols = currencies
    .map((currency) => currency.code)
    .filter((code) => code !== normalizedBase);

  if (symbols.length === 0) {
    return [];
  }

  const url = new URL('/latest', config.baseUrl);
  url.searchParams.set('base', normalizedBase);
  url.searchParams.set('symbols', symbols.join(','));

  if (config.apiKey) {
    url.searchParams.set('access_key', config.apiKey);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new AppError(`Exchange provider error: HTTP ${response.status}`, 502);
  }

  const payload = await response.json();

  if (!payload.rates || typeof payload.rates !== 'object') {
    throw new AppError('Exchange provider returned an invalid payload', 502);
  }

  const updates = [];
  for (const [targetCode, rate] of Object.entries(payload.rates)) {
    if (!rate || Number(rate) <= 0) {
      continue;
    }

    const saved = await upsertRateByCode({
      baseCode: normalizedBase,
      targetCode,
      rate: Number(rate),
    });

    updates.push(saved);
  }

  return updates;
}

module.exports = {
  listCurrencies,
  createCurrency,
  updateCurrency,
  findCurrencyByCodeOrThrow,
  listRates,
  upsertRateByCode,
  updateRateById,
  convertAmount,
  getExchangeProviderConfig,
  saveExchangeProviderConfig,
  syncRatesFromProvider,
};
