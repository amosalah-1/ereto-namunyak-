/**
 * Ereto Namunyak CBO - Forms Controller (Membership, Volunteer, Contact, Newsletter)
 */

const db = require('../config/db');
const mailer = require('../config/mailer');

/**
 * Public: Submit Membership Application
 */
async function submitMember(req, res) {
  try {
    const { full_name, email, phone, national_id, county, sub_county, occupation, membership_type, notes } = req.body;

    if (!full_name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Full name, email address, and phone number are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    await db.query(
      `INSERT INTO members (full_name, email, phone, national_id, county, sub_county, occupation, membership_type, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)`,
      [
        full_name.trim(),
        cleanEmail,
        phone.trim(),
        national_id ? national_id.trim() : null,
        county || 'Kajiado',
        sub_county || null,
        occupation || null,
        membership_type || 'individual',
        notes || null
      ]
    );

    // Send confirmation email
    await mailer.sendApplicationConfirmation({
      type: 'member',
      fullName: full_name,
      email: cleanEmail
    });

    return res.json({
      success: true,
      message: 'Thank you! Your membership application has been received. Our secretariat will be in touch.'
    });
  } catch (err) {
    console.error('[Submit Member Error]', err);
    return res.status(500).json({ success: false, message: 'Could not process membership application.' });
  }
}

/**
 * Public: Submit Volunteer Application
 */
async function submitVolunteer(req, res) {
  try {
    const { full_name, email, phone, location, skills, area_of_interest, availability, notes } = req.body;

    if (!full_name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Full name, email address, and phone number are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    await db.query(
      `INSERT INTO volunteer_applications (full_name, email, phone, location, skills, area_of_interest, availability, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)`,
      [
        full_name.trim(),
        cleanEmail,
        phone.trim(),
        location || null,
        skills || null,
        area_of_interest || 'Community Outreach',
        availability || 'Weekends',
        notes || null
      ]
    );

    // Send confirmation email
    await mailer.sendApplicationConfirmation({
      type: 'volunteer',
      fullName: full_name,
      email: cleanEmail
    });

    return res.json({
      success: true,
      message: 'Asante sana! Your volunteer registration has been recorded. Welcome to the Ereto Namunyak family!'
    });
  } catch (err) {
    console.error('[Submit Volunteer Error]', err);
    return res.status(500).json({ success: false, message: 'Could not process volunteer application.' });
  }
}

/**
 * Public: Submit Contact Inquiry
 */
async function submitContact(req, res) {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email address, and message are required.' });
    }

    await db.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message, is_read)
       VALUES ($1, $2, $3, $4, $5, 0)`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        phone ? phone.trim() : null,
        subject ? subject.trim() : 'General Inquiry',
        message.trim()
      ]
    );

    return res.json({
      success: true,
      message: 'Your message has been delivered to the Ereto Namunyak team. We will get back to you promptly.'
    });
  } catch (err) {
    console.error('[Submit Contact Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to send your message. Please try again.' });
  }
}

/**
 * Public: Subscribe to Newsletter
 */
async function submitNewsletter(req, res) {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    await db.query(
      `INSERT INTO newsletter_subscribers (email, is_active)
       VALUES ($1, 1)
       ON CONFLICT (email) DO UPDATE SET is_active = true`,
      [cleanEmail]
    );

    return res.json({ success: true, message: 'Thank you for subscribing to Ereto Namunyak updates!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not subscribe email.' });
  }
}

/**
 * Admin: Get Members
 */
async function getMembers(req, res) {
  try {
    const { status, search } = req.query;
    let sql = 'SELECT * FROM members WHERE 1=1';
    const params = [];
    if (status && status !== 'all') {
      params.push(status.toLowerCase());
      sql += ` AND status = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(full_name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR phone LIKE $${params.length})`;
    }
    sql += ' ORDER BY id DESC';
    const result = await db.query(sql, params);
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch members.' });
  }
}

/**
 * Admin: Update Member Status
 */
async function updateMemberStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    await db.query(
      'UPDATE members SET status = $1, notes = COALESCE($2, notes) WHERE id = $3',
      [status, notes || null, id]
    );
    return res.json({ success: true, message: 'Member status updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update member.' });
  }
}

/**
 * Admin: Delete Member
 */
async function deleteMember(req, res) {
  try {
    await db.query('DELETE FROM members WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Member record removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete member.' });
  }
}

/**
 * Admin: Get Volunteers
 */
async function getVolunteers(req, res) {
  try {
    const { status, search } = req.query;
    let sql = 'SELECT * FROM volunteer_applications WHERE 1=1';
    const params = [];
    if (status && status !== 'all') {
      params.push(status.toLowerCase());
      sql += ` AND status = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(full_name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR phone LIKE $${params.length})`;
    }
    sql += ' ORDER BY id DESC';
    const result = await db.query(sql, params);
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch volunteers.' });
  }
}

/**
 * Admin: Update Volunteer Status
 */
async function updateVolunteerStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    await db.query(
      'UPDATE volunteer_applications SET status = $1, notes = COALESCE($2, notes) WHERE id = $3',
      [status, notes || null, id]
    );
    return res.json({ success: true, message: 'Volunteer status updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update volunteer.' });
  }
}

/**
 * Admin: Delete Volunteer
 */
async function deleteVolunteer(req, res) {
  try {
    await db.query('DELETE FROM volunteer_applications WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Volunteer application deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete volunteer.' });
  }
}

/**
 * Admin: Get Messages
 */
async function getMessages(req, res) {
  try {
    const result = await db.query('SELECT * FROM contact_messages ORDER BY is_read ASC, id DESC');
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
}

/**
 * Admin: Mark Message Read
 */
async function markMessageRead(req, res) {
  try {
    await db.query('UPDATE contact_messages SET is_read = true WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Message marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update message.' });
  }
}

/**
 * Admin: Delete Message
 */
async function deleteMessage(req, res) {
  try {
    await db.query('DELETE FROM contact_messages WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete message.' });
  }
}

/**
 * Admin: Get Subscribers
 */
async function getSubscribers(req, res) {
  try {
    const result = await db.query('SELECT * FROM newsletter_subscribers ORDER BY id DESC');
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch subscribers.' });
  }
}

module.exports = {
  submitMember,
  submitVolunteer,
  submitContact,
  submitNewsletter,
  getMembers,
  updateMemberStatus,
  deleteMember,
  getVolunteers,
  updateVolunteerStatus,
  deleteVolunteer,
  getMessages,
  markMessageRead,
  deleteMessage,
  getSubscribers
};
