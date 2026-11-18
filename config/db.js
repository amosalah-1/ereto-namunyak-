/**
 * Ereto Namunyak CBO - Database Connection & Abstraction Layer
 * Supports Supabase PostgreSQL (via connection string / pg pool)
 * and provides seamless local fallback SQLite for zero-config local development.
 */

const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let pgPool = null;
let supabaseClient = null;
let sqliteDb = null;
let isPg = false;

function toDbBoolean(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : value;
  const booleanValue = normalized === true || normalized === 1 || normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes';
  return isPg ? booleanValue : (booleanValue ? 1 : 0);
}

// 1. Check for Supabase / PostgreSQL configuration
const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
  try {
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    isPg = true;
    console.log('[DB] Connected via PostgreSQL pool (Supabase)');
  } catch (err) {
    console.error('[DB] PostgreSQL pool initialization error:', err.message);
  }
}

if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('[DB] Supabase JS Client initialized');
  } catch (err) {
    console.error('[DB] Supabase client initialization error:', err.message);
  }
}

// 2. Initialize local SQLite fallback if PostgreSQL is not configured
if (!isPg) {
  const dbDir = path.join(__dirname, '..', 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'ereto.sqlite');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('[DB] SQLite connection error:', err.message);
    } else {
      console.log(`[DB] Using local SQLite database at: ${dbPath}`);
    }
  });
}

/**
 * Executes a SQL query with PostgreSQL parameterized format ($1, $2, ...)
 * Automatically translates to SQLite parameter format if running local fallback.
 */
async function query(sql, params = []) {
  if (isPg && pgPool) {
    const start = Date.now();
    try {
      const res = await pgPool.query(sql, params);
      return { rows: res.rows, rowCount: res.rowCount };
    } catch (err) {
      console.error('[DB PG Error]', err.message, '\nQuery:', sql, '\nParams:', params);
      throw err;
    }
  }

  // SQLite Fallback
  return new Promise((resolve, reject) => {
    // Preserve parameter indexes so repeated $1 references bind to the same value.
    let sqliteSql = sql.replace(/\$(\d+)/g, '?$1');
    
    // Convert boolean literals or syntax if needed
    // e.g., CURRENT_TIMESTAMP is supported in both
    const isSelect = /^\s*(SELECT|PRAGMA)/i.test(sqliteSql);

    if (isSelect) {
      sqliteDb.all(sqliteSql, params, (err, rows) => {
        if (err) {
          console.error('[DB SQLite Error]', err.message, '\nQuery:', sqliteSql);
          return reject(err);
        }
        resolve({ rows: rows || [], rowCount: (rows || []).length });
      });
    } else {
      sqliteDb.all(sqliteSql, params, function (err, rows) {
        if (err) {
          // If query uses RETURNING and fails on old sqlite, fallback to run
          sqliteDb.run(sqliteSql, params, function (runErr) {
            if (runErr) {
              console.error('[DB SQLite Run Error]', runErr.message, '\nQuery:', sqliteSql);
              return reject(runErr);
            }
            resolve({
              rows: [{ id: this.lastID }],
              rowCount: this.changes,
              lastID: this.lastID
            });
          });
          return;
        }
        resolve({
          rows: rows || [],
          rowCount: (rows || []).length,
          lastID: this?.lastID
        });
      });
    }
  });
}

/**
 * Returns single row or null
 */
async function getOne(sql, params = []) {
  const result = await query(sql, params);
  return result.rows && result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Log administrative activity into activity_logs table
 */
async function logActivity({ userId, userEmail, action, entity, entityId, details, ipAddress }) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, user_email, action, entity, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId || null, userEmail || 'system', action, entity || null, entityId ? String(entityId) : null, details || null, ipAddress || '127.0.0.1']
    );
  } catch (err) {
    console.error('[Audit Log Error]', err.message);
  }
}

/**
 * Initialize database tables and seed data if tables do not exist
 */
async function initDatabase() {
  if (isPg && pgPool) {
    console.log('[DB] Verifying Supabase PostgreSQL schema...');
    try {
      const check = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'projects'
        );
      `);
      if (!check.rows[0].exists) {
        console.log('[DB] Creating Supabase tables from database/schema.sql...');
        const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
        await pgPool.query(schemaSql);
        console.log('[DB] Populating initial seed data...');
        const seedSql = fs.readFileSync(path.join(__dirname, '..', 'database', 'seed.sql'), 'utf8');
        await pgPool.query(seedSql);
        console.log('[DB] Supabase database initialized and seeded successfully.');
      } else {
        console.log('[DB] Supabase tables already initialized.');
      }
    } catch (err) {
      console.error('[DB] PostgreSQL initialization error:', err.message);
      throw err;
    }
    return;
  }

  // SQLite init
  if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.serialize(async () => {
        try {
          // Check if projects table exists
          sqliteDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'", async (err, table) => {
            if (err) return reject(err);
            if (!table) {
              console.log('[DB] Initializing local database schema...');
              // Create SQLite compatible schema
              const initSql = `
                CREATE TABLE IF NOT EXISTS roles (
                  role_key TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  description TEXT,
                  permissions TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS admin_users (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  email TEXT NOT NULL UNIQUE,
                  password_hash TEXT NOT NULL,
                  role TEXT NOT NULL,
                  phone TEXT,
                  status TEXT DEFAULT 'active',
                  last_login_at DATETIME,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS password_resets (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  token_hash TEXT NOT NULL,
                  expires_at DATETIME NOT NULL,
                  used_at DATETIME,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS project_categories (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL UNIQUE,
                  slug TEXT NOT NULL UNIQUE,
                  description TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS projects (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT NOT NULL,
                  slug TEXT NOT NULL UNIQUE,
                  short_description TEXT NOT NULL,
                  full_description TEXT NOT NULL,
                  category_id INTEGER,
                  location TEXT NOT NULL,
                  target_amount NUMERIC DEFAULT 0,
                  raised_amount NUMERIC DEFAULT 0,
                  cover_image TEXT,
                  status TEXT DEFAULT 'published',
                  featured INTEGER DEFAULT 0,
                  start_date TEXT,
                  end_date TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS project_images (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  project_id INTEGER,
                  image_url TEXT NOT NULL,
                  caption TEXT,
                  display_order INTEGER DEFAULT 0,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS team_members (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  role TEXT NOT NULL,
                  department TEXT,
                  bio TEXT,
                  photo_url TEXT,
                  email TEXT,
                  phone TEXT,
                  display_order INTEGER DEFAULT 0,
                  is_active INTEGER DEFAULT 1,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS mission_areas (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT NOT NULL,
                  description TEXT NOT NULL,
                  icon TEXT DEFAULT 'fa-heart',
                  image_url TEXT,
                  display_order INTEGER DEFAULT 0,
                  is_active INTEGER DEFAULT 1,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS donations (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  donor_name TEXT NOT NULL,
                  donor_email TEXT NOT NULL,
                  donor_phone TEXT NOT NULL,
                  amount NUMERIC NOT NULL,
                  currency TEXT DEFAULT 'KES',
                  message TEXT,
                  project_id INTEGER,
                  pesapal_order_tracking_id TEXT,
                  pesapal_merchant_reference TEXT UNIQUE,
                  payment_status TEXT DEFAULT 'PENDING',
                  payment_method TEXT,
                  receipt_number TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS transactions (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  donation_id INTEGER,
                  merchant_reference TEXT NOT NULL,
                  order_tracking_id TEXT NOT NULL,
                  amount NUMERIC NOT NULL,
                  currency TEXT DEFAULT 'KES',
                  status TEXT NOT NULL,
                  payment_account TEXT,
                  raw_response TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS members (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  full_name TEXT NOT NULL,
                  email TEXT NOT NULL,
                  phone TEXT NOT NULL,
                  national_id TEXT,
                  county TEXT,
                  sub_county TEXT,
                  occupation TEXT,
                  membership_type TEXT DEFAULT 'individual',
                  status TEXT DEFAULT 'pending',
                  notes TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS volunteer_applications (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  full_name TEXT NOT NULL,
                  email TEXT NOT NULL,
                  phone TEXT NOT NULL,
                  location TEXT,
                  skills TEXT,
                  area_of_interest TEXT,
                  availability TEXT,
                  status TEXT DEFAULT 'pending',
                  notes TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS news (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT NOT NULL,
                  slug TEXT NOT NULL UNIQUE,
                  summary TEXT NOT NULL,
                  content TEXT NOT NULL,
                  cover_image TEXT,
                  author TEXT DEFAULT 'Ereto Editorial Team',
                  is_published INTEGER DEFAULT 1,
                  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS events (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT NOT NULL,
                  description TEXT NOT NULL,
                  event_date TEXT NOT NULL,
                  event_time TEXT,
                  location TEXT NOT NULL,
                  cover_image TEXT,
                  is_upcoming INTEGER DEFAULT 1,
                  registration_link TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS gallery (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT NOT NULL,
                  category TEXT DEFAULT 'Community',
                  image_url TEXT NOT NULL,
                  description TEXT,
                  is_featured INTEGER DEFAULT 1,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS testimonials (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  author_name TEXT NOT NULL,
                  role_or_title TEXT,
                  quote TEXT NOT NULL,
                  photo_url TEXT,
                  rating INTEGER DEFAULT 5,
                  is_active INTEGER DEFAULT 1,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS partners (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  logo_url TEXT NOT NULL,
                  website_url TEXT,
                  category TEXT DEFAULT 'Community Partner',
                  display_order INTEGER DEFAULT 0,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  email TEXT NOT NULL UNIQUE,
                  is_active INTEGER DEFAULT 1,
                  subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS contact_messages (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  email TEXT NOT NULL,
                  phone TEXT,
                  subject TEXT,
                  message TEXT NOT NULL,
                  is_read INTEGER DEFAULT 0,
                  replied_at DATETIME,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS website_settings (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  setting_key TEXT NOT NULL UNIQUE,
                  setting_value TEXT,
                  category TEXT DEFAULT 'general',
                  description TEXT,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS activity_logs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  user_email TEXT,
                  action TEXT NOT NULL,
                  entity TEXT,
                  entity_id TEXT,
                  details TEXT,
                  ip_address TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
              `;

              sqliteDb.exec(initSql, async (execErr) => {
                if (execErr) {
                  console.error('[DB] Schema creation error:', execErr.message);
                  return reject(execErr);
                }
                console.log('[DB] Local schema created. Seeding initial data...');
                // Load seed script
                try {
                  const seedScript = require('./seedRunner');
                  await seedScript.runLocalSeed(query);
                  console.log('[DB] Local seed data populated.');
                  resolve();
                } catch (sErr) {
                  console.error('[DB] Local seed error:', sErr.message);
                  reject(sErr);
                }
              });
            } else {
              resolve();
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

module.exports = {
  query,
  getOne,
  logActivity,
  initDatabase,
  getPool: () => pgPool,
  isPostgres: () => isPg,
  toDbBoolean,
  getSupabaseClient: () => supabaseClient
};
