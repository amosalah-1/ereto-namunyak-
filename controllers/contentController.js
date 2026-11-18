/**
 * Ereto Namunyak CBO - Content Controller (Mission, News, Events, Gallery, Testimonials, Settings)
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

// ==========================================
// MISSION AREAS
// ==========================================
async function getMissionAreas(req, res) {
  try {
    const result = await db.query(
      'SELECT * FROM mission_areas WHERE is_active = true ORDER BY display_order ASC, id ASC'
    );
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve mission areas.' });
  }
}

async function getAdminMissionAreas(req, res) {
  try {
    const result = await db.query('SELECT * FROM mission_areas ORDER BY display_order ASC, id ASC');
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve mission areas.' });
  }
}

async function createMissionArea(req, res) {
  try {
    const { title, description, icon, display_order, is_active } = req.body;
    let imageUrl = '/images/environment-4.jpeg';
    if (req.file) imageUrl = `/uploads/${req.file.filename}`;
    else if (req.body.image_url) imageUrl = req.body.image_url;

    await db.query(
      `INSERT INTO mission_areas (title, description, icon, image_url, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, description, icon || 'fa-heart', imageUrl, display_order || 0, db.toDbBoolean(is_active === undefined ? true : is_active)]
    );

    await db.logActivity({
      userId: req.session.adminUser?.id,
      userEmail: req.session.adminUser?.email,
      action: 'MISSION_CREATED',
      entity: 'mission_areas',
      details: `Created mission pillar "${title}"`,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Mission pillar created.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create mission area.' });
  }
}

async function updateMissionArea(req, res) {
  try {
    const id = req.params.id;
    const existing = await db.getOne('SELECT * FROM mission_areas WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });

    const { title, description, icon, display_order, is_active } = req.body;
    let imageUrl = existing.image_url;
    if (req.file) imageUrl = `/uploads/${req.file.filename}`;
    else if (req.body.image_url) imageUrl = req.body.image_url;

    await db.query(
      `UPDATE mission_areas
       SET title = $1, description = $2, icon = $3, image_url = $4, display_order = $5, is_active = $6
       WHERE id = $7`,
      [
        title || existing.title,
        description || existing.description,
        icon || existing.icon,
        imageUrl,
        display_order !== undefined && display_order !== ''
          ? parseInt(display_order, 10)
          : (existing.display_order ?? 0),
        is_active !== undefined ? db.toDbBoolean(is_active) : existing.is_active,
        id
      ]
    );

    return res.json({ success: true, message: 'Mission pillar updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update mission pillar.' });
  }
}

async function deleteMissionArea(req, res) {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM mission_areas WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Mission pillar deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete mission pillar.' });
  }
}

// ==========================================
// NEWS & ARTICLES
// ==========================================
async function getPublicNews(req, res) {
  try {
    const { limit } = req.query;
    let sql = 'SELECT * FROM news WHERE is_published = true ORDER BY published_at DESC, id DESC';
    const params = [];
    if (limit) {
      params.push(parseInt(limit, 10));
      sql += ` LIMIT $1`;
    }
    const result = await db.query(sql, params);
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve news.' });
  }
}

async function getNewsBySlug(req, res) {
  try {
    const news = await db.getOne('SELECT * FROM news WHERE slug = $1 OR id = $1', [req.params.slug]);
    if (!news) return res.status(404).json({ success: false, message: 'Article not found.' });
    return res.json({ success: true, data: news });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve article.' });
  }
}

async function getAdminNews(req, res) {
  try {
    const result = await db.query('SELECT * FROM news ORDER BY id DESC');
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve news.' });
  }
}

async function createNews(req, res) {
  try {
    const { title, summary, content, author, is_published } = req.body;
    let slug = createSlug(title);
    const existing = await db.getOne('SELECT id FROM news WHERE slug = $1', [slug]);
    if (existing) slug = `${slug}-${Date.now().toString().slice(-4)}`;

    let coverImage = '/images/environment-conservation.jpeg';
    if (req.file) coverImage = `/uploads/${req.file.filename}`;
    else if (req.body.cover_image) coverImage = req.body.cover_image;

    await db.query(
      `INSERT INTO news (title, slug, summary, content, cover_image, author, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        title,
        slug,
        summary,
        content || summary,
        coverImage,
        author || 'Ereto Editorial Team',
        db.toDbBoolean(is_published === undefined ? true : is_published)
      ]
    );

    return res.json({ success: true, message: 'Article published successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to publish article.' });
  }
}

async function updateNews(req, res) {
  try {
    const id = req.params.id;
    const existing = await db.getOne('SELECT * FROM news WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Article not found.' });

    const { title, summary, content, author, is_published } = req.body;
    let coverImage = existing.cover_image;
    if (req.file) coverImage = `/uploads/${req.file.filename}`;
    else if (req.body.cover_image) coverImage = req.body.cover_image;

    await db.query(
      `UPDATE news
       SET title = $1, summary = $2, content = $3, cover_image = $4, author = $5, is_published = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        title || existing.title,
        summary || existing.summary,
        content || existing.content,
        coverImage,
        author || existing.author,
        is_published !== undefined ? db.toDbBoolean(is_published) : existing.is_published,
        id
      ]
    );

    return res.json({ success: true, message: 'Article updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update article.' });
  }
}

async function deleteNews(req, res) {
  try {
    await db.query('DELETE FROM news WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Article deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete article.' });
  }
}

// ==========================================
// EVENTS
// ==========================================
async function getPublicEvents(req, res) {
  try {
    const result = await db.query(
      'SELECT * FROM events WHERE is_upcoming = true ORDER BY event_date ASC, id ASC'
    );
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve events.' });
  }
}

async function getAdminEvents(req, res) {
  try {
    const result = await db.query('SELECT * FROM events ORDER BY event_date DESC, id DESC');
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve events.' });
  }
}

async function createEvent(req, res) {
  try {
    const { title, description, event_date, event_time, location, registration_link, is_upcoming } = req.body;
    let coverImage = '/images/environment-initiative.jpeg';
    if (req.file) coverImage = `/uploads/${req.file.filename}`;
    else if (req.body.cover_image) coverImage = req.body.cover_image;

    await db.query(
      `INSERT INTO events (title, description, event_date, event_time, location, cover_image, is_upcoming, registration_link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        title,
        description,
        event_date,
        event_time || '10:00 AM EAT',
        location,
        coverImage,
        db.toDbBoolean(is_upcoming === undefined ? true : is_upcoming),
        registration_link || null
      ]
    );
    return res.json({ success: true, message: 'Event created successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create event.' });
  }
}

async function updateEvent(req, res) {
  try {
    const id = req.params.id;
    const existing = await db.getOne('SELECT * FROM events WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Event not found.' });

    const { title, description, event_date, event_time, location, registration_link, is_upcoming } = req.body;
    let coverImage = existing.cover_image;
    if (req.file) coverImage = `/uploads/${req.file.filename}`;
    else if (req.body.cover_image) coverImage = req.body.cover_image;

    await db.query(
      `UPDATE events
       SET title = $1, description = $2, event_date = $3, event_time = $4, location = $5,
           cover_image = $6, is_upcoming = $7, registration_link = $8
       WHERE id = $9`,
      [
        title || existing.title,
        description || existing.description,
        event_date || existing.event_date,
        event_time !== undefined ? event_time : existing.event_time,
        location || existing.location,
        coverImage,
        is_upcoming !== undefined ? db.toDbBoolean(is_upcoming) : existing.is_upcoming,
        registration_link !== undefined ? registration_link : existing.registration_link,
        id
      ]
    );
    return res.json({ success: true, message: 'Event updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update event.' });
  }
}

async function deleteEvent(req, res) {
  try {
    await db.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
}

// ==========================================
// PHOTO GALLERY
// ==========================================
async function getPublicGallery(req, res) {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM gallery WHERE 1=1';
    const params = [];
    if (category && category !== 'all') {
      params.push(category);
      sql += ' AND LOWER(category) = LOWER($1)';
    }
    sql += ' ORDER BY id DESC';
    const result = await db.query(sql, params);
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve gallery.' });
  }
}

async function getAdminGallery(req, res) {
  try {
    const result = await db.query('SELECT * FROM gallery ORDER BY id DESC');
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve gallery.' });
  }
}

async function createGalleryItem(req, res) {
  try {
    const { title, category, description, is_featured } = req.body;
    let imageUrl = '/images/environment-conservation.jpeg';
    if (req.file) imageUrl = `/uploads/${req.file.filename}`;
    else if (req.body.image_url) imageUrl = req.body.image_url;

    await db.query(
      `INSERT INTO gallery (title, category, image_url, description, is_featured)
       VALUES ($1, $2, $3, $4, $5)`,
      [title, category || 'Community', imageUrl, description || null, db.toDbBoolean(is_featured === undefined ? true : is_featured)]
    );
    return res.json({ success: true, message: 'Gallery item added successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add gallery item.' });
  }
}

async function updateGalleryItem(req, res) {
  try {
    const id = req.params.id;
    const existing = await db.getOne('SELECT * FROM gallery WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Gallery item not found.' });

    const { title, category, description, is_featured } = req.body;
    let imageUrl = existing.image_url;
    if (req.file) imageUrl = `/uploads/${req.file.filename}`;
    else if (req.body.image_url) imageUrl = req.body.image_url;

    await db.query(
      `UPDATE gallery
       SET title = $1, category = $2, image_url = $3, description = $4, is_featured = $5
       WHERE id = $6`,
      [
        title || existing.title,
        category || existing.category,
        imageUrl,
        description !== undefined ? (description || null) : existing.description,
        is_featured !== undefined ? db.toDbBoolean(is_featured) : existing.is_featured,
        id
      ]
    );

    return res.json({ success: true, message: 'Gallery item updated successfully.' });
  } catch (err) {
    console.error('[Update Gallery Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update gallery item.' });
  }
}

async function deleteGalleryItem(req, res) {
  try {
    await db.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Gallery item deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete gallery item.' });
  }
}

// ==========================================
// WEBSITE SETTINGS
// ==========================================
async function getSettings(req, res) {
  try {
    const result = await db.query('SELECT setting_key, setting_value, category, description FROM website_settings');
    const settingsMap = {};
    result.rows.forEach(r => {
      settingsMap[r.setting_key] = r.setting_value;
    });
    return res.json({ success: true, data: settingsMap, raw: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve website settings.' });
  }
}

async function updateSettings(req, res) {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        `INSERT INTO website_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, String(value)]
      );
    }
    await db.logActivity({
      userId: req.session.adminUser?.id,
      userEmail: req.session.adminUser?.email,
      action: 'SETTINGS_UPDATED',
      entity: 'website_settings',
      details: 'Updated global website settings',
      ipAddress: req.ip
    });
    return res.json({ success: true, message: 'Website settings saved successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update website settings.' });
  }
}

module.exports = {
  getMissionAreas,
  getAdminMissionAreas,
  createMissionArea,
  updateMissionArea,
  deleteMissionArea,
  getPublicNews,
  getNewsBySlug,
  getAdminNews,
  createNews,
  updateNews,
  deleteNews,
  getPublicEvents,
  getAdminEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getPublicGallery,
  getAdminGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  getSettings,
  updateSettings
};
