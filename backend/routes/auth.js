// backend/routes/auth.js
// Authentication Routes - Signup, Login, Profile

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const { authenticator } = require('otplib');
const { authMiddleware } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;

// Stricter rate limit for auth endpoints (10 attempts per 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

// ============================================
// POST /api/auth/signup
// Create a new user account
// ============================================
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { email, password, fullName, companyName } = req.body;

    // --- Validation ---
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.',
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        error: 'Please provide a valid email address.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.',
      });
    }

    // Check if user already exists
    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email already exists.',
      });
    }

    // --- Hash password ---
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // --- Create user ---
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: fullName || null,
        company_name: companyName || null,
      })
      .select('id, email, full_name, plan, created_at')
      .single();

    if (error) {
      console.error('Signup DB error:', error);
      return res.status(500).json({
        error: 'Failed to create account. Please try again.',
      });
    }

    // --- Create default workspace ---
    const workspaceName = companyName || `${newUser.email.split('@')[0]}'s Workspace`;
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName,
        owner_user_id: newUser.id,
        plan_code: 'starter',
      })
      .select('id')
      .single();

    if (workspaceError || !workspace) {
      return res.status(500).json({ error: 'Failed to create workspace.' });
    }

    await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: newUser.id,
        role: 'owner',
      });

    await supabase
      .from('users')
      .update({ primary_workspace_id: workspace.id })
      .eq('id', newUser.id);

    // --- Generate JWT ---
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        plan: newUser.plan,
        workspaceId: workspace.id,
        createdAt: newUser.created_at,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// POST /api/auth/login
// Authenticate user and return JWT
// ============================================
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    // --- Validation ---
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.',
      });
    }

    // --- Find user ---
    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid email or password.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account is deactivated. Contact support.',
      });
    }

    // --- Verify password ---
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password.',
      });
    }

    if (user.primary_workspace_id) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('require_2fa')
        .eq('id', user.primary_workspace_id)
        .maybeSingle();

      if (workspace?.require_2fa && !user.twofa_enabled) {
        return res.status(403).json({ error: 'Two-factor authentication required. Set up 2FA to continue.' });
      }
    }

    if (user.twofa_enabled) {
      if (!twoFactorCode) {
        return res.status(401).json({ error: 'Two-factor code required.' });
      }

      const isValidCode = authenticator.check(twoFactorCode, user.twofa_secret || '');
      if (!isValidCode) {
        return res.status(401).json({ error: 'Invalid two-factor code.' });
      }
    }

    // --- Generate JWT ---
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        plan: user.plan,
        workspaceId: user.primary_workspace_id || null,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// GET /api/auth/me
// Get current user profile (protected)
// ============================================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.full_name || req.user.fullName,
        plan: req.user.plan,
        workspaceId: req.user.primary_workspace_id || null,
        twofaEnabled: Boolean(req.user.twofa_enabled),
      },
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// PUT /api/auth/profile
// Update user profile (protected)
// ============================================
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { fullName, companyName } = req.body;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        company_name: companyName,
      })
      .eq('id', req.user.id)
      .select('id, email, full_name, company_name, plan')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update profile.' });
    }

    res.json({
      message: 'Profile updated!',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// POST /api/auth/change-password
// Change password (protected)
// ============================================
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current and new passwords are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters.',
      });
    }

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    // Fetch full user with password hash
    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        error: 'Current password is incorrect.',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    const { supabase: supabaseClient } = require('../config/database');
    await supabaseClient
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', req.user.id);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// POST /api/auth/2fa/setup
// Generate TOTP secret
// ============================================
router.post('/2fa/setup', authMiddleware, async (req, res) => {
  try {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user.email, 'SupportMate', secret);

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    await supabase
      .from('users')
      .update({ twofa_secret: secret })
      .eq('id', req.user.id);

    return res.json({ secret, otpauth });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to set up 2FA.' });
  }
});

// ============================================
// POST /api/auth/2fa/verify
// Verify TOTP code and enable 2FA
// ============================================
router.post('/2fa/verify', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Verification code is required.' });

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: user } = await supabase
      .from('users')
      .select('twofa_secret')
      .eq('id', req.user.id)
      .single();

    const isValid = authenticator.check(code, user?.twofa_secret || '');
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    await supabase
      .from('users')
      .update({ twofa_enabled: true, twofa_verified_at: new Date().toISOString() })
      .eq('id', req.user.id);

    return res.json({ message: 'Two-factor authentication enabled.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify 2FA.' });
  }
});

module.exports = router;
