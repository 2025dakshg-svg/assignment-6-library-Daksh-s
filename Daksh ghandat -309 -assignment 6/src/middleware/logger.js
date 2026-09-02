/**
 * Request logger middleware.
 *
 * Logs every request with: HTTP method, URL, timestamp, response status,
 * response duration, and the authenticated userId (or "anonymous").
 *
 * It listens on the response "finish" event so that `req.user` (populated by
 * the auth middleware further down the chain) is available for the log line.
 *
 * Example log line:
 *   [2026-09-02T10:00:00.000Z] GET /api/books 200 3ms user=abc123
 */

module.exports = function requestLogger(req, res, next) {
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const userId = (req.user && req.user.userId) || 'anonymous';
    const duration = Date.now() - startedAt;
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms user=${userId}`
    );
  });

  next();
};