const dashboardService = require('../services/dashboard-service');

async function getSummary(req, res) {
  const summary = await dashboardService.getDashboardSummary(req.auth.userId);
  res.status(200).json({ data: summary });
}

module.exports = {
  getSummary,
};
