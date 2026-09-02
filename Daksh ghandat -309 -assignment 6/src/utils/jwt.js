/**
 * JWT helpers - sign & verify JSON Web Tokens.
 *
 * Uses `jsonwebtoken` with the secret + expiry from .env:
 *   JWT_SECRET       - symmetric signing secret
 *   JWT_EXPIRES_IN   - token lifetime, e.g. "24h"
 */

const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const SECRET = process.env.JWT_SECRET || 'insecure-default-secret-change-me';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Sign a new JWT for a user.
 * @param {{ userId: string, role: string, email?: string }} payload
 * @returns {string} signed token
 */
function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

/**
 * Verify + decode a JWT.
 * @param {string} token
 * @returns {object} decoded payload ({ userId, role, ... })
 * @throws {Error} if invalid / expired / not signed with our secret
 */
function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken, SECRET, EXPIRES_IN };