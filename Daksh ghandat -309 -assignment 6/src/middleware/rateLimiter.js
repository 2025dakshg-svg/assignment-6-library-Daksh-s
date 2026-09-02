/**
 * Rate limiting middleware
 * ------------------------
 * Uses `express-rate-limit`. By default each IP gets 100 requests per 15
 * minutes. Window + limit are configurable through .env:
 *   RATE_LIMIT_WINDOW_MS     (default 900000 = 15 min)
 *   RATE_LIMIT_MAX_REQUESTS  (default 100)
 *
 * When the limit is exceeded the client receives a clean JSON 429 response.
 */

const rateLimit = require('express-rate-limit');
require('dotenv').config();

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const max = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

const limiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true, // return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // disable the deprecated `X-RateLimit-*` headers
  handler(req, res) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      statusCode: 429,
    });
  },
});

module.exports = limiter;
module.exports.windowMs = windowMs;
module.exports.maxRequests = max;