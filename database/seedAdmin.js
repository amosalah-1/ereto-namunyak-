/**
 * Ereto Namunyak CBO - Administrator Seeding Script
 * Run with: npm run seed:admin
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seedAdmin() {
  console.log('=== Ereto Namunyak CBO: Admin Seeding ===');
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.INITIAL_ADMIN_EMAIL || !process.env.INITIAL_ADMIN_PASSWORD)
  ) {
    throw new Error('Production admin seeding requires INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD.');
  }

  await db.initDatabase();

  const name = process.env.INITIAL_ADMIN_NAME || 'Ereto Super Admin';
  const email = (process.env.INITIAL_ADMIN_EMAIL || 'admin@eretonamunyak.org').toLowerCase().trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'AdminEreto2026!';
  const role = process.env.INITIAL_ADMIN_ROLE || 'super_admin';
  const phone = process.env.INITIAL_ADMIN_PHONE || '+254 722 000 000';

  const existing = await db.getOne('SELECT id, email, role FROM admin_users WHERE email = $1', [email]);

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  if (existing) {
    console.log(`[SEED] Admin account ${email} already exists. Updating credentials...`);
    await db.query(
      `UPDATE admin_users 
       SET name = $1, password_hash = $2, role = $3, status = 'active', phone = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name, hash, role, phone, existing.id]
    );
    console.log(`[SEED] Successfully updated administrator account: ${email}`);
  } else {
    console.log(`[SEED] Creating new Super Administrator: ${email}...`);
    await db.query(
      `INSERT INTO admin_users (name, email, password_hash, role, phone, status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [name, email, hash, role, phone]
    );
    console.log(`[SEED] Successfully created Super Administrator: ${email}`);
  }

  await db.logActivity({
    userEmail: email,
    action: 'ADMIN_SEEDED',
    entity: 'admin_users',
    details: `Admin seeded/updated via CLI script with role ${role}`
  });

  console.log('----------------------------------------------------');
  console.log('ADMIN LOGIN CREDENTIALS:');
  console.log(`Email:    ${email}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('Password: configured via environment (not displayed)');
  } else {
    console.log(`Password: ${password}`);
  }
  console.log(`Role:     ${role}`);
  console.log(`URL:      ${process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`}/admin/login`);
  console.log('----------------------------------------------------');
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});
