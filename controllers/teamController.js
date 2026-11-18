/**
 * Ereto Namunyak CBO - Team Controller
 */

const db = require('../config/db');

/**
 * Public: Get active team members
 */
async function getPublicTeam(req, res) {
  try {
    const result = await db.query(`
      SELECT id, name, role, department, bio, photo_url, email, phone, display_order
      FROM team_members
      WHERE is_active = true
      ORDER BY display_order ASC, id ASC
    `);
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[Get Team Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve team members.' });
  }
}

/**
 * Admin: Get all team members
 */
async function getAdminTeam(req, res) {
  try {
    const result = await db.query('SELECT * FROM team_members ORDER BY display_order ASC, id ASC');
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[Admin Get Team Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve team members.' });
  }
}

/**
 * Admin: Add team member
 */
async function createTeamMember(req, res) {
  try {
    const { name, role, department, bio, email, phone, display_order, is_active } = req.body;

    if (!name || !role) {
      return res.status(400).json({ success: false, message: 'Name and role are required.' });
    }

    let photoUrl = '/images/peter-shuel-founder.jpeg';
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photo_url) {
      photoUrl = req.body.photo_url;
    }

    const order = display_order ? parseInt(display_order, 10) : 0;
    const active = db.toDbBoolean(is_active === undefined ? true : is_active);

    await db.query(
      `INSERT INTO team_members (name, role, department, bio, photo_url, email, phone, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [name.trim(), role.trim(), department || null, bio || null, photoUrl, email || null, phone || null, order, active]
    );

    await db.logActivity({
      userId: req.session.adminUser?.id,
      userEmail: req.session.adminUser?.email,
      action: 'TEAM_MEMBER_CREATED',
      entity: 'team_members',
      details: `Added team member "${name}" (${role})`,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Team member added successfully.' });
  } catch (err) {
    console.error('[Create Team Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to add team member.' });
  }
}

/**
 * Admin: Update team member
 */
async function updateTeamMember(req, res) {
  try {
    const id = req.params.id;
    const member = await db.getOne('SELECT * FROM team_members WHERE id = $1', [id]);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found.' });
    }

    const { name, role, department, bio, email, phone, display_order, is_active } = req.body;

    let photoUrl = member.photo_url;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photo_url) {
      photoUrl = req.body.photo_url;
    }

    const order = display_order !== undefined && display_order !== ''
      ? parseInt(display_order, 10)
      : (member.display_order ?? 0);
    const active = is_active !== undefined ? db.toDbBoolean(is_active) : member.is_active;

    await db.query(
      `UPDATE team_members
       SET name = $1, role = $2, department = $3, bio = $4, photo_url = $5,
           email = $6, phone = $7, display_order = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        name || member.name,
        role || member.role,
        department !== undefined ? department : member.department,
        bio !== undefined ? bio : member.bio,
        photoUrl,
        email !== undefined ? email : member.email,
        phone !== undefined ? phone : member.phone,
        order,
        active,
        id
      ]
    );

    await db.logActivity({
      userId: req.session.adminUser?.id,
      userEmail: req.session.adminUser?.email,
      action: 'TEAM_MEMBER_UPDATED',
      entity: 'team_members',
      entityId: id,
      details: `Updated team member "${name || member.name}"`,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Team member updated successfully.' });
  } catch (err) {
    console.error('[Update Team Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update team member.' });
  }
}

/**
 * Admin: Delete team member
 */
async function deleteTeamMember(req, res) {
  try {
    const id = req.params.id;
    const member = await db.getOne('SELECT name FROM team_members WHERE id = $1', [id]);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found.' });
    }

    await db.query('DELETE FROM team_members WHERE id = $1', [id]);

    await db.logActivity({
      userId: req.session.adminUser?.id,
      userEmail: req.session.adminUser?.email,
      action: 'TEAM_MEMBER_DELETED',
      entity: 'team_members',
      entityId: id,
      details: `Deleted team member "${member.name}"`,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Team member deleted successfully.' });
  } catch (err) {
    console.error('[Delete Team Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete team member.' });
  }
}

module.exports = {
  getPublicTeam,
  getAdminTeam,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember
};
