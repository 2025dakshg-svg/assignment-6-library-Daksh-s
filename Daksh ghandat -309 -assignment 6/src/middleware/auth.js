/**
 * Authentication middleware
 * -------------------------
 * Verifies the JWT sent in `Authorization: Bearer <token>` and attaches the
 * decoded user (`userId`, `role`) to `req.user`. Returns 401 for any missing,
 * malformed, invalid, or expired token.
 */

const { verifyToken } = require('../utils/jwt');

module.exports = function authenticate(req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Missing or malformed Authorization header. Use: Authorization: Bearer <token>',
      statusCode: 401,
    });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    // Only what the API needs is exposed to downstream middleware/controllers.
    req.user = { userId: decoded.userId, role: decoded.role };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
      statusCode: 401,
    });
  }
};