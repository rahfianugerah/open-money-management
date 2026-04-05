function health(req, res) {
  res.status(200).json({
    data: {
      status: 'ok',
      service: 'open-money-management-backend',
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = {
  health,
};
