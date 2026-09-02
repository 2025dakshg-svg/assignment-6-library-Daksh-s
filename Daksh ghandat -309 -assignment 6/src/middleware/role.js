/**
 * Role-based access control middleware (factory).
 *
 * Must run AFTER `auth` middleware so `req.user` is populated.
 *
 * Usage:
 *   router.get('/secret', authenticate, requireRole('librarian'), handler);
 *   router.get('/any', authenticate, requireRole('librarian', 'student'), handler);
 *
 * Returns 403 when the authenticated user's role is not permitted.
 */

/**
 * @param {...string|string[]} allowedRoles one or more roles, or an array of roles
 * @returns {Function} Express middleware
 */
function requireRole(...allowedRoles) {
  const roles = allowedRoles.flat();

  return function roleGuard(req, res, next) {
    // auth middleware always runs first, but guard defensively anyway.
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        statusCode: 401,
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires role "${roles.join('" or "')}". Your role: "${req.user.role}".`,
        statusCode: 403,
      });
    }

    return next();
  };
}

module.exports = { requireRole };