const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');
const { RateLimitError } = require('../utils/errors');

// Create a single instance of rate limiter
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60000, // 1 minute
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 20, // limit each IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later.'
    });
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For if behind proxy, fallback to IP
    return req.headers['x-forwarded-for'] || req.ip;
  }
});

module.exports = limiter; 


