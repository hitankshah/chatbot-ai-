// backend/middleware/auth.js
// JWT Authentication Middleware

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify JWT token and attach user to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from database to ensure they still exist and are active
    const { supabase } = require('../config/database');
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, plan, is_active, primary_workspace_id, twofa_enabled')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication error.' });
  }
};

/**
 * Optional auth - doesn't block request, just attaches user if token exists
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      const { supabase } = require('../config/database');
      if (supabase) {
        const { data: user } = await supabase
          .from('users')
          .select('id, email, full_name, plan, primary_workspace_id, twofa_enabled')
          .eq('id', decoded.userId)
          .single();
        req.user = user || null;
      }
    }
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { authMiddleware, optionalAuth };
