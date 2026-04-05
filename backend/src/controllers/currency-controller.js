const currencyService = require('../services/currency-service');

async function listCurrencies(req, res) {
  const currencies = await currencyService.listCurrencies();
  res.status(200).json({ data: currencies });
}

async function createCurrency(req, res) {
  const created = await currencyService.createCurrency(req.body);
  res.status(201).json({ data: created });
}

async function updateCurrency(req, res) {
  const updated = await currencyService.updateCurrency(req.params.currencyId, req.body);
  res.status(200).json({ data: updated });
}

async function listRates(req, res) {
  const rates = await currencyService.listRates();
  res.status(200).json({ data: rates });
}

async function upsertRate(req, res) {
  const saved = await currencyService.upsertRateByCode(req.body);
  res.status(200).json({ data: saved });
}

async function updateRate(req, res) {
  const updated = await currencyService.updateRateById(req.params.rateId, req.body.rate);
  res.status(200).json({ data: updated });
}

async function convert(req, res) {
  const conversion = await currencyService.convertAmount(req.body);
  res.status(200).json({ data: conversion });
}

async function getExchangeProviderConfig(req, res) {
  const config = await currencyService.getExchangeProviderConfig();
  res.status(200).json({ data: config });
}

async function saveExchangeProviderConfig(req, res) {
  const config = await currencyService.saveExchangeProviderConfig(req.body);
  res.status(200).json({ data: config });
}

async function syncProviderRates(req, res) {
  const updates = await currencyService.syncRatesFromProvider(req.body?.baseCode || 'USD');
  res.status(200).json({
    data: {
      updatedCount: updates.length,
      updates,
    },
  });
}

module.exports = {
  listCurrencies,
  createCurrency,
  updateCurrency,
  listRates,
  upsertRate,
  updateRate,
  convert,
  getExchangeProviderConfig,
  saveExchangeProviderConfig,
  syncProviderRates,
};
