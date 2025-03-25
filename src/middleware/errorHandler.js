const { BaseError } = require('../utils/errors');
const { logger } = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    requestId: req.body?.requestId
  });

  // Handle known operational errors
  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      requestId: req.body?.requestId,
      details: err.details
    });
  }

  // Handle file sending errors
  if (err.code === 'ENOENT') {
    return res.status(404).json({
      status: 'error',
      message: 'File not found',
      requestId: req.body?.requestId
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    requestId: req.body?.requestId
  });
};

module.exports = errorHandler; 