/**
 * Shared helpers used across the application:
 *   - asyncHandler  : Express 4 does not catch thrown errors from async route
 *                     handlers, so we wrap every controller with this helper it
 *                     automatically forwards rejections to the global error handler.
 *   - ApiError      : Error subclass that carries an HTTP statusCode so the
 *                     global error handler can respond with the right code.
 *   - serialize     : Recursively converts Firebase Timestamp / Date instances
 *                     into ISO-8601 strings for clean JSON responses.
 */

/**
 * Wraps an async route handler so any rejected promise is forwarded to the
 * Express error-handling middleware.
 * @param {Function} fn async (req, res, next) => Promise
 * @returns {Function} wrapped middleware
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Application error with an HTTP status code.
 */
class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Convert Firestore `Timestamp` / `Date` values / arrays / plain objects into
 * JSON-safe primitives (Timestamps become ISO strings).
 * @param {*} value
 */
function serialize(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, serialize(val)])
    );
  }
  return value;
}

module.exports = { asyncHandler, ApiError, serialize };