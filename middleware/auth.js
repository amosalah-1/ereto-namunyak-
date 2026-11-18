/**
 * Ereto Namunyak CBO - Authentication & RBAC Middleware
 */

function requireAuth(req, res, next) {
  if (req.session && req.session.adminUser && req.session.adminUser.id) {
    // Session is valid
    return next();
  }

  // If request is an API call, return JSON 401
  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Your session may have expired.',
      redirect: '/admin/login'
    });
  }

  // Otherwise redirect to the admin login page
  return res.redirect('/admin/login');
}

/**
 * Role-Based Access Control Middleware
 * Roles: 'super_admin', 'content_admin', 'finance_admin', 'editor'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.adminUser) {
      if (req.path.startsWith('/api/') || req.xhr) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      return res.redirect('/admin/login');
    }

    const userRole = req.session.adminUser.role;

    // Super admin has universal access
    if (userRole === 'super_admin' || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`
    });
  };
}

module.exports = {
  requireAuth,
  requireRole
};
