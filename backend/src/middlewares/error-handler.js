const AppError = require('../utils/app-error');

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        message: error.message,
        details: error.details,
      },
    });
  }

  console.error('Unhandled error:', error);

  return res.status(500).json({
    error: {
      message: 'Internal server error',
    },
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
