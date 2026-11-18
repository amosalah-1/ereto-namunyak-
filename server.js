/**
 * Ereto Namunyak CBO - Production Express Server
 * Full-Stack Platform & Administrative Management System
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const PgSessionStore = require('connect-pg-simple')(session);
const path = require('path');
const fs = require('fs');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;

if (isProduction && (!sessionSecret || sessionSecret.length < 32)) {
  throw new Error('Production requires SESSION_SECRET to be set to at least 32 characters.');
}

if (isProduction && !db.isPostgres()) {
  throw new Error('Production requires DATABASE_URL to point to a PostgreSQL database.');
}

if (isProduction) {
  app.set('trust proxy', 1);
}

// -------------------------------------------------------------
// Security & Headers Middleware
// -------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
          "https://unpkg.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        fontSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com",
          "data:"
        ],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:"],
        frameSrc: ["'self'", "https://cybqa.pesapal.com", "https://pay.pesapal.com"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -------------------------------------------------------------
// Session Management
// -------------------------------------------------------------
app.use(
  session({
    name: 'ereto_admin_sid',
    secret: sessionSecret || 'local-development-session-secret',
    resave: false,
    saveUninitialized: false,
    store: db.isPostgres()
      ? new PgSessionStore({
          pool: db.getPool(),
          tableName: 'user_sessions',
          createTableIfMissing: true
        })
      : undefined,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours default
    }
  })
);

// -------------------------------------------------------------
// Static Asset Serving
// -------------------------------------------------------------
// Keep the dashboard's direct .html URL behind the same session gate as /admin/dashboard.
app.get('/admin/dashboard.html', (req, res) => {
  if (!req.session || !req.session.adminUser || !req.session.adminUser.id) {
    return res.redirect('/admin/login');
  }
  return res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// Serve public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve existing images folder directly at /images
const imagesDir = path.join(__dirname, 'images');
if (fs.existsSync(imagesDir)) {
  app.use('/images', express.static(imagesDir));
}

// Serve uploaded user files at /uploads
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// -------------------------------------------------------------
// Application Routes
// -------------------------------------------------------------
const pagesRouter = require('./routes/pages');
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin');

app.use('/', pagesRouter);
app.use('/api', apiRouter);
app.use('/api/admin', adminRouter);

// -------------------------------------------------------------
// 404 & Centralized Error Handlers
// -------------------------------------------------------------
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
  res.status(500).send('A system error occurred. Please try again later.');
});

// -------------------------------------------------------------
// Server Bootstrap
// -------------------------------------------------------------
async function startServer() {
  try {
    console.log('[Server] Initializing database...');
    await db.initDatabase();
    console.log('[Server] Database initialized successfully.');

    app.listen(PORT, () => {
      console.log('========================================================');
      console.log(` ERETO NAMUNYAK CBO SERVER RUNNING`);
      console.log(` Local URL:        http://localhost:${PORT}`);
      console.log(` Admin Portal:     http://localhost:${PORT}/admin`);
      console.log(` Admin Login:      http://localhost:${PORT}/admin/login`);
      console.log(` Environment:      ${process.env.NODE_ENV || 'development'}`);
      console.log('========================================================');
    });
  } catch (err) {
    console.error('[Fatal Bootstrap Error]', err);
    process.exit(1);
  }
}

startServer();
