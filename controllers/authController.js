/**
 * Ereto Namunyak CBO - Authentication Controller
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const mailer = require('../config/mailer');

/**
 * Handle Administrator Login
 */
async function login(req, res) {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email address and password.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.getOne('SELECT * FROM admin_users WHERE email = $1', [cleanEmail]);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended or deactivated. Contact the Super Administrator.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Set Session
    req.session.adminUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    };

    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      req.session.cookie.maxAge = 8 * 60 * 60 * 1000; // 8 hours
    }

    // Update last_login_at
    await db.query('UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Log Activity
    await db.logActivity({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_LOGIN',
      entity: 'admin_users',
      entityId: user.id,
      details: `Successful login from IP ${req.ip || 'unknown'}`,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      redirect: '/admin/dashboard'
    });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
}

/**
 * Handle Administrator Logout
 */
async function logout(req, res) {
  try {
    const user = req.session?.adminUser;
    if (user) {
      await db.logActivity({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_LOGOUT',
        entity: 'admin_users',
        entityId: user.id,
        details: 'User logged out',
        ipAddress: req.ip
      });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('[Logout Session Destroy Error]', err);
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Logged out successfully', redirect: '/admin/login' });
    });
  } catch (err) {
    console.error('[Auth Logout Error]', err);
    return res.status(500).json({ success: false, message: 'Logout failed.' });
  }
}

/**
 * Get currently authenticated admin user
 */
async function getCurrentUser(req, res) {
  if (req.session && req.session.adminUser) {
    return res.json({
      success: true,
      user: req.session.adminUser
    });
  }
  return res.status(401).json({ success: false, message: 'Not authenticated' });
}

/**
 * Initiate Forgot Password Request
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.getOne('SELECT id, name, email FROM admin_users WHERE email = $1 AND status = "active"', [cleanEmail]);

    if (!user) {
      // Return success anyway for security prevention of email enumeration
      return res.json({
        success: true,
        message: 'If that email address exists in our administrative records, a password reset link has been dispatched.'
      });
    }

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt.toISOString()]
    );

    const host = req.get('host');
    const protocol = req.protocol;
    const resetUrl = `${protocol}://${host}/admin/login?reset_token=${rawToken}`;

    await mailer.sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl
    });

    await db.logActivity({
      userId: user.id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'admin_users',
      entityId: user.id,
      details: 'Password reset link sent to admin email',
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'If that email address exists in our administrative records, a password reset link has been dispatched.'
    });
  } catch (err) {
    console.error('[Forgot Password Error]', err);
    return res.status(500).json({ success: false, message: 'Could not process password reset request.' });
  }
}

/**
 * Execute Password Reset
 */
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password (min 8 characters) are required.'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await db.getOne(
      `SELECT * FROM password_resets 
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'The reset link is invalid or has expired. Please request a new one.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    // Update password
    await db.query('UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, resetRecord.user_id]);

    // Mark token as used
    await db.query('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [resetRecord.id]);

    await db.logActivity({
      userId: resetRecord.user_id,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'admin_users',
      entityId: resetRecord.user_id,
      details: 'Password was successfully reset using verified token',
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Your password has been successfully reset. You can now log in.'
    });
  } catch (err) {
    console.error('[Reset Password Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
}

module.exports = {
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword
};
