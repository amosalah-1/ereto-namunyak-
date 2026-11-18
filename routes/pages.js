/**
 * Ereto Namunyak CBO - Page Routing, Admin Auth Redirects & Dynamic Sitemap
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../config/db');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// -------------------------------------------------------------
// Admin Redirects & Authentication Gates
// -------------------------------------------------------------
router.get('/admin', (req, res) => {
  if (req.session && req.session.adminUser && req.session.adminUser.id) {
    return res.redirect('/admin/dashboard');
  }
  return res.redirect('/admin/login');
});

router.get('/admin/login', (req, res) => {
  if (req.session && req.session.adminUser && req.session.adminUser.id) {
    return res.redirect('/admin/dashboard');
  }
  return res.sendFile(path.join(PUBLIC_DIR, 'admin', 'login.html'));
});

router.get('/admin/dashboard', (req, res) => {
  if (!req.session || !req.session.adminUser || !req.session.adminUser.id) {
    return res.redirect('/admin/login');
  }
  return res.sendFile(path.join(PUBLIC_DIR, 'admin', 'dashboard.html'));
});

// Single project detail route
router.get('/projects/:slug', (req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, 'project-detail.html'));
});

// -------------------------------------------------------------
// Dynamic XML Sitemap
// -------------------------------------------------------------
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const staticPages = [
      '',
      '/mission.html',
      '/projects.html',
      '/team.html',
      '/join.html',
      '/donate.html',
      '/news.html',
      '/gallery.html',
      '/contact.html'
    ];

    // Get published projects
    const projectsRes = await db.query("SELECT slug, updated_at FROM projects WHERE status = 'published'");
    // Get published news
    const newsRes = await db.query("SELECT slug, updated_at FROM news WHERE is_published = 1 OR is_published = true");

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    staticPages.forEach(p => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${p}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${p === '' ? '1.0' : '0.8'}</priority>\n`;
      xml += `  </url>\n`;
    });

    // Dynamic Projects
    projectsRes.rows.forEach(p => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/project-detail.html?slug=${p.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(p.updated_at || Date.now()).toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      xml += `  </url>\n`;
    });

    // Dynamic News
    newsRes.rows.forEach(n => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/news.html#${n.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(n.updated_at || Date.now()).toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    return res.send(xml);
  } catch (err) {
    console.error('[Sitemap Error]', err);
    return res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/admin/\nSitemap: ${baseUrl}/sitemap.xml\n`;
  res.header('Content-Type', 'text/plain');
  res.send(robots);
});

module.exports = router;
