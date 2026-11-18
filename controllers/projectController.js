/**
 * Ereto Namunyak CBO - Project Controller
 */

const db = require('../config/db');

function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseOptionalAmount(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/**
 * Public: Get published projects with search and category filtering
 */
async function getPublicProjects(req, res) {
  try {
    const { category, search, featured, limit } = req.query;

    let sql = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM projects p
      LEFT JOIN project_categories c ON p.category_id = c.id
      WHERE p.status = 'published'
    `;
    const params = [];

    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND (c.slug = $${params.length} OR c.name = $${params.length})`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(p.title) LIKE $${params.length} OR LOWER(p.short_description) LIKE $${params.length} OR LOWER(p.location) LIKE $${params.length})`;
    }

    if (featured === 'true' || featured === '1') {
      sql += ` AND p.featured = true`;
    }

    sql += ` ORDER BY p.featured DESC, p.id DESC`;

    if (limit && parseInt(limit, 10) > 0) {
      params.push(parseInt(limit, 10));
      sql += ` LIMIT $${params.length}`;
    }

    const result = await db.query(sql, params);
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[Get Public Projects Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve projects.' });
  }
}

/**
 * Public: Get project details by slug or ID
 */
async function getProjectDetails(req, res) {
  try {
    const identifier = req.params.identifier;
    const isNum = /^\d+$/.test(identifier);

    const sql = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM projects p
      LEFT JOIN project_categories c ON p.category_id = c.id
      WHERE ${isNum ? 'p.id = $1' : 'p.slug = $1'}
    `;

    const project = await db.getOne(sql, [identifier]);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Fetch additional gallery images for this project
    const imagesRes = await db.query(
      'SELECT * FROM project_images WHERE project_id = $1 ORDER BY display_order ASC, id ASC',
      [project.id]
    );
    project.gallery_images = imagesRes.rows;

    return res.json({ success: true, data: project });
  } catch (err) {
    console.error('[Get Project Details Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve project details.' });
  }
}

/**
 * Admin: Get all projects (including drafts and archived)
 */
async function getAdminProjects(req, res) {
  try {
    const { status, category, search } = req.query;

    let sql = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM projects p
      LEFT JOIN project_categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND p.status = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND (c.slug = $${params.length} OR c.name = $${params.length})`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(p.title) LIKE $${params.length} OR LOWER(p.location) LIKE $${params.length})`;
    }

    sql += ` ORDER BY p.id DESC`;

    const result = await db.query(sql, params);
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[Admin Get Projects Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin projects.' });
  }
}

/**
 * Admin: Create Project
 */
async function createProject(req, res) {
  try {
    const {
      title,
      short_description,
      full_description,
      category_id,
      location,
      target_amount,
      raised_amount,
      status,
      featured,
      start_date,
      end_date
    } = req.body;

    if (!title || !short_description || !location) {
      return res.status(400).json({
        success: false,
        message: 'Title, short description, and location are required fields.'
      });
    }

    let slug = createSlug(title);
    // Check slug collision
    const existingSlug = await db.getOne('SELECT id FROM projects WHERE slug = $1', [slug]);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    let coverImage = '/images/environment-conservation.jpeg';
    if (req.file) {
      coverImage = `/uploads/${req.file.filename}`;
    } else if (req.body.cover_image) {
      coverImage = req.body.cover_image;
    }

    const insertSql = `
      INSERT INTO projects 
      (title, slug, short_description, full_description, category_id, location, target_amount, raised_amount, cover_image, status, featured, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;

    const isFeatured = db.toDbBoolean(featured);
    const catId = category_id ? parseInt(category_id, 10) : null;
    const target = parseOptionalAmount(target_amount, 0);
    const raised = parseOptionalAmount(raised_amount, 0);
    if (target === null || raised === null) {
      return res.status(400).json({ success: false, message: 'Funding amounts must be valid non-negative numbers.' });
    }
    const projectStatus = status || 'published';

    await db.query(insertSql, [
      title.trim(),
      slug,
      short_description.trim(),
      full_description ? full_description.trim() : short_description.trim(),
      catId,
      location.trim(),
      target,
      raised,
      coverImage,
      projectStatus,
      isFeatured,
      start_date || null,
      end_date || null
    ]);

    await db.logActivity({
      userId: req.session.adminUser?.id,
      userEmail: req.session.adminUser?.email,
      action: 'PROJECT_CREATED',
      entity: 'projects',
      details: `Created project "${title}" with status "${projectStatus}"`,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Project created successfully and is now active.'
    });
  } catch (err) {
    console.error('[Create Project Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create project.' });
  }
}

/**
 * Admin: Update Project
 */
async function updateProject(req, res) {
  try {
    const id = req.params.id;
    const project = await db.getOne('SELECT * FROM projects WHERE id = $1', [id]);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const {
      title,
      short_description,
      full_description,
      category_id,
      location,
      target_amount,
      raised_amount,
      status,
      featured,
      start_date,
      end_date
    } = req.body;

    let coverImage = project.cover_image;
    if (req.file) {
      coverImage = `/uploads/${req.file.filename}`;
    } else if (req.body.cover_image) {
      coverImage = req.body.cover_image;
    }

    const isFeatured = featured === undefined ? project.featured : db.toDbBoolean(featured);
    const target = parseOptionalAmount(target_amount, project.target_amount);
    const raised = parseOptionalAmount(raised_amount, project.raised_amount);
    if (target === null || raised === null) {
      return res.status(400).json({ success: false, message: 'Funding amounts must be valid non-negative numbers.' });
    }

    const updateSql = `
      UPDATE projects
      SET title = $1, short_description = $2, full_description = $3,
          category_id = $4, location = $5, target_amount = $6, raised_amount = $7,
          cover_image = $8, status = $9, featured = $10, start_date = $11, end_date = $12,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
    `;

    await db.query(updateSql, [
      title || project.title,
      short_description || project.short_description,
      full_description || project.full_description,
      category_id !== undefined ? (category_id ? parseInt(category_id, 10) : null) : project.category_id,
      location || project.location,
      target,
      raised,
      coverImage,
      status || project.status,
      isFeatured,
      start_date || project.start_date,
      end_date || project.end_date,
      id
    ]);

    await db.logActivity({
      userId: req.session.adminUser?.id,
      userEmail: req.session.adminUser?.email,
      action: 'PROJECT_UPDATED',
      entity: 'projects',
      entityId: id,
      details: `Updated project "${title || project.title}"`,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Project updated successfully.' });
  } catch (err) {
    console.error('[Update Project Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update project.' });
  }
}

/**
 * Admin: Delete Project
 */
async function deleteProject(req, res) {
  try {
    const id = req.params.id;
    const project = await db.getOne('SELECT title FROM projects WHERE id = $1', [id]);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    await db.query('DELETE FROM project_images WHERE project_id = $1', [id]);
    await db.query('DELETE FROM projects WHERE id = $1', [id]);

    await db.logActivity({
      userId: req.session.adminUser?.id,
      userEmail: req.session.adminUser?.email,
      action: 'PROJECT_DELETED',
      entity: 'projects',
      entityId: id,
      details: `Deleted project "${project.title}"`,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('[Delete Project Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete project.' });
  }
}

/**
 * Public & Admin: Get Categories
 */
async function getCategories(req, res) {
  try {
    const result = await db.query('SELECT * FROM project_categories ORDER BY id ASC');
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Get Categories Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
}

module.exports = {
  getPublicProjects,
  getProjectDetails,
  getAdminProjects,
  createProject,
  updateProject,
  deleteProject,
  getCategories
};
