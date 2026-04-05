const balanceService = require('../services/balance-service');

async function listBalances(req, res) {
  const balances = await balanceService.listUserBalances(req.auth.userId);
  res.status(200).json({ data: balances });
}

async function upsertBalance(req, res) {
  const saved = await balanceService.upsertUserBalance(req.auth.userId, req.body);
  res.status(200).json({ data: saved });
}

async function updateBalance(req, res) {
  const updated = await balanceService.updateUserBalanceById(
    req.auth.userId,
    req.params.balanceId,
    req.body
  );

  res.status(200).json({ data: updated });
}

async function deleteBalance(req, res) {
  await balanceService.deleteUserBalanceById(req.auth.userId, req.params.balanceId);
  res.status(204).send();
}

module.exports = {
  listBalances,
  upsertBalance,
  updateBalance,
  deleteBalance,
};
