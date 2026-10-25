'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Copy server/.env.example to server/.env and fill it in.');
}

/**
 * Creates a signed token for a user.
 * @param {{ id: number, role: 'artisan' | 'customer' }} payload
 */
function signToken({ id, role }) {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Express middleware factory.
 * requireAuth()            -> any signed-in user
 * requireAuth('artisan')   -> artisans only
 * requireAuth('customer')  -> customers only
 */
function requireAuth(role = null) {
  return function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Sign in to continue.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      const expired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error: expired ? 'Your session has expired. Sign in again.' : 'Sign in to continue.',
      });
    }

    if (role && payload.role !== role) {
      return res.status(403).json({ error: `This area is for ${role} accounts.` });
    }

    req.user = { id: payload.id, role: payload.role };
    return next();
  };
}

module.exports = { signToken, requireAuth, JWT_EXPIRES_IN };
