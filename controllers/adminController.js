/**
 * Ereto Namunyak CBO - Admin Dashboard & Analytics Controller
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

/**
 * Get comprehensive dynamic dashboard analytics
 */
async function getDashboardAnalytics(req, res) {
  try {
    // 1. Projects stats
    const projectStats = await db.getOne(`
      SELECT 
        COUNT(*) AS total_projects,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS active_projects,
        SUM(target_amount) AS total_target,
        SUM(raised_amount) AS total_project_raised
      FROM projects
    `);

    // 2. Donations stats (from completed donations)
    const donationStats = await db.getOne(`
      SELECT 
        COUNT(*) AS total_donations_count,
        SUM(CASE WHEN payment_status = 'COMPLETED' THEN amount ELSE 0 END) AS total_raised_pesapal,
        SUM(CASE WHEN payment_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_donations_count,
        SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_donations_count
      FROM donations
    `);

    // 3. Volunteer & Member stats
    const memberStats = await db.getOne(`
      SELECT 
        COUNT(*) AS total_members,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_members,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_members
      FROM members
    `);

    const volunteerStats = await db.getOne(`
      SELECT 
        COUNT(*) AS total_volunteers,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted_volunteers,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_volunteers
      FROM volunteer_applications
    `);

    // 4. Messages stats
    const messageStats = await db.getOne(`
      SELECT 
        COUNT(*) AS total_messages,
        SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) AS unread_messages
      FROM contact_messages
    `);

    // 5. Team count
    const teamStats = await db.getOne('SELECT COUNT(*) AS total_team FROM team_members');

    // 6. Recent donations (last 6)
    const recentDonations = await db.query(`
      SELECT d.*, p.title AS project_title
      FROM donations d
      LEFT JOIN projects p ON d.project_id = p.id
      ORDER BY d.id DESC
      LIMIT 6
    `);

    // 7. Recent activity logs (last 8)
    const recentActivities = await db.query(`
      SELECT * FROM activity_logs ORDER BY id DESC LIMIT 8
    `);

    // 8. Monthly donations breakdown (for charts)
    const monthExpression = db.isPostgres()
      ? `TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')`
      : `strftime('%Y-%m', created_at)`;
    const monthlyDonations = await db.query(`
      SELECT 
        ${monthExpression} AS month,
        SUM(amount) AS total,
        COUNT(*) AS count
      FROM donations
      WHERE payment_status = 'COMPLETED'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `);

    return res.json({
      success: true,
      analytics: {
        projects: {
          total: parseInt(projectStats?.total_projects || 0, 10),
          active: parseInt(projectStats?.active_projects || 0, 10),
          target: parseFloat(projectStats?.total_target || 0),
          raised: parseFloat(projectStats?.total_project_raised || 0)
        },
        donations: {
          totalRaised: parseFloat(donationStats?.total_raised_pesapal || 0),
          completedCount: parseInt(donationStats?.completed_donations_count || 0, 10),
          pendingCount: parseInt(donationStats?.pending_donations_count || 0, 10)
        },
        members: {
          total: parseInt(memberStats?.total_members || 0, 10),
          pending: parseInt(memberStats?.pending_members || 0, 10),
          approved: parseInt(memberStats?.approved_members || 0, 10)
        },
        volunteers: {
          total: parseInt(volunteerStats?.total_volunteers || 0, 10),
          pending: parseInt(volunteerStats?.pending_volunteers || 0, 10)
        },
        messages: {
          total: parseInt(messageStats?.total_messages || 0, 10),
          unread: parseInt(messageStats?.unread_messages || 0, 10)
        },
        teamCount: parseInt(teamStats?.total_team || 0, 10),
        recentDonations: recentDonations.rows,
        recentActivities: recentActivities.rows,
        monthlyTrends: monthlyDonations.rows
      }
    });
  } catch (err) {
    console.error('[Get Dashboard Analytics Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to compile analytics.' });
  }
}

/**
 * Admin: Get all administrative users
 */
async function getUsers(req, res) {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, phone, status, last_login_at, created_at FROM admin_users ORDER BY id ASC'
    );
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
}

/**
 * Super Admin: Create a new administrator account
 */
async function createUser(req, res) {
  try {
    const { name, email, password, role, phone } = req.body;
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    const validRoles = ['super_admin', 'content_admin', 'finance_admin', 'editor'];

    if (!cleanName || !cleanEmail || !cleanPassword || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }
    if (cleanPassword.trim().length < 8) {
      return res.status(400).json({ success: false, message: 'The initial password must be at least 8 characters.' });
    }
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Select a valid administrator role.' });
    }

    const existing = await db.getOne('SELECT id FROM admin_users WHERE email = $1', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An administrator with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(cleanPassword, salt);

    await db.query(
      `INSERT INTO admin_users (name, email, password_hash, role, phone, status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [cleanName, cleanEmail, hash, role, phone ? String(phone).trim() : null]
    );

    await db.logActivity({
      userId: req.session.adminUser?.id,
      userEmail: req.session.adminUser?.email,
      action: 'ADMIN_USER_CREATED',
      entity: 'admin_users',
      details: `Created new admin "${cleanName}" with role "${role}"`,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Administrator account created successfully.' });
  } catch (err) {
    console.error('[Create Admin User Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create administrator account.' });
  }
}

/**
 * Super Admin: Update administrator account
 */
async function updateUser(req, res) {
  try {
    const id = req.params.id;
    const existing = await db.getOne('SELECT * FROM admin_users WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { name, email, password, role, phone, status } = req.body;

    let hash = existing.password_hash;
    if (password && password.trim().length >= 8) {
      const salt = await bcrypt.genSalt(10);
      hash = await bcrypt.hash(password.trim(), salt);
    }

    await db.query(
      `UPDATE admin_users
       SET name = $1, email = $2, password_hash = $3, role = $4, phone = $5, status = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        name || existing.name,
        email ? email.toLowerCase().trim() : existing.email,
        hash,
        role || existing.role,
        phone !== undefined ? phone : existing.phone,
        status || existing.status,
        id
      ]
    );

    await db.logActivity({
      userId: req.session.adminUser?.id,
      userEmail: req.session.adminUser?.email,
      action: 'ADMIN_USER_UPDATED',
      entity: 'admin_users',
      entityId: id,
      details: `Updated admin user "${name || existing.name}" (Role: ${role || existing.role})`,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Administrator account updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update administrator account.' });
  }
}

/**
 * Super Admin: Suspend or Toggle User Status
 */
async function toggleUserStatus(req, res) {
  try {
    const id = req.params.id;
    // Don't allow suspending oneself
    if (parseInt(id, 10) === req.session.adminUser?.id) {
      return res.status(400).json({ success: false, message: 'You cannot suspend your own logged-in account.' });
    }

    const user = await db.getOne('SELECT status, name FROM admin_users WHERE id = $1', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    await db.query('UPDATE admin_users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newStatus, id]);

    await db.logActivity({
      userId: req.session.adminUser?.id,
      userEmail: req.session.adminUser?.email,
      action: 'ADMIN_STATUS_TOGGLED',
      entity: 'admin_users',
      entityId: id,
      details: `Changed status of "${user.name}" to ${newStatus}`,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: `Account status updated to ${newStatus}.`, newStatus });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to toggle status.' });
  }
}

/**
 * Get Activity Logs
 */
async function getActivityLogs(req, res) {
  try {
    const result = await db.query('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 200');
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve logs.' });
  }
}

/**
 * Get Media Files list
 */
async function getMediaFiles(req, res) {
  try {
    const files = [];

    // 1. uploads folder
    const uploadsPath = path.join(__dirname, '..', 'public', 'uploads');
    if (fs.existsSync(uploadsPath)) {
      const uploadFiles = fs.readdirSync(uploadsPath);
      uploadFiles.forEach(f => {
        files.push({
          name: f,
          url: `/uploads/${f}`,
          type: 'upload',
          path: `/uploads/${f}`
        });
      });
    }

    // 2. images folder
    const imagesPath = path.join(__dirname, '..', 'images');
    if (fs.existsSync(imagesPath)) {
      const imgFiles = fs.readdirSync(imagesPath);
      imgFiles.forEach(f => {
        files.push({
          name: f,
          url: `/images/${f}`,
          type: 'asset',
          path: `/images/${f}`
        });
      });
    }

    return res.json({ success: true, count: files.length, data: files });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch media library.' });
  }
}

module.exports = {
  getDashboardAnalytics,
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  getActivityLogs,
  getMediaFiles
};
