/**
 * Rate Limiter Middleware
 * Limits the number of requests from an IP address within a time window
 * @module rateLimiter
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');

/**
 * Rate limiter configuration
 * @type {import('express-rate-limit').RateLimit}
 */
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000, // 1 minute
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 20, // 20 requests per window
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  },
  headers: true, // Send rate limit info in headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

module.exports = limiter; 


