# Ereto Namunyak CBO - Official Web Platform & Administrative Management System

A modern, database-driven website and administration platform developed for **Ereto Namunyak Community-Based Organization (CBO)**, based in Kajiado and Narok, Kenya.

---

## 1. Visual Identity & Brand Palette

- **Primary Color:** Forest Green (`#176B45`) – Stewardship, climate action, agriculture, life.
- **Secondary Color:** Golden Yellow (`#F4B942`) – Warmth, community dawn, prosperity.
- **Background:** Pure White (`#FFFFFF`) & Subtle Tint (`#F8FAF9`).
- **Accent:** Light Green (`#E8F5E9`).
- **Typography:** `Plus Jakarta Sans` & `Outfit`.
- **Visuals:** Three.js interactive 3D hero visualization, GSAP scroll-triggered entrance animations, and authentic field photography.

---

## 2. Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (Strictly separated files; no React, Vue, or Angular).
- **Backend:** Node.js, Express.js.
- **Database:** Supabase PostgreSQL (with automatic zero-config local SQLite fallback for seamless out-of-the-box local runs).
- **Libraries & Integrations:**
  - **Three.js:** Interactive 3D community globe & particle visualization (`/js/three-hero.js`).
  - **GSAP & ScrollTrigger:** Staggered card animations, scroll reveal, animated numerical counters (`/js/gsap-animations.js`).
  - **Font Awesome 6:** Modern vector iconography.
  - **Pesapal API v3:** Order submission, IPN notification webhook, live transaction status verification, automated receipts (`/config/pesapal.js`).
  - **Nodemailer:** Transaction receipts, volunteer/member confirmations, admin password resets (`/config/mailer.js`).
  - **Bcrypt.js:** Secure password hashing.
  - **Express Session:** HttpOnly server-side cookie sessions.

---

## 3. Public Website Pages

1. **Homepage (`/index.html`):**
   - Interactive Three.js 3D hero visualization & GSAP title reveal.
   - Animated statistics banner (`35,000+` Trees planted, `480+` Students sponsored, `350+` Women empowered, `180+` PWSN assisted).
   - About & Philosophy section explaining the cultural meaning of *Ereto Namunyak* (mutual upliftment and community fortune).
   - Dynamic strategic focus areas.
   - Featured projects with live funding meter.
   - Leadership preview with authentic photos.
   - Quick Pesapal donation callout.
   - Field stories & photo gallery preview.
2. **Mission & Values (`/mission.html`):** Vision, mission, core values, and deep-dive into all 6 pillars.
3. **Projects Catalog (`/projects.html`):** Filterable projects catalog with category buttons and real-time search.
4. **Project Details (`/project-detail.html?slug=...`):** Full narrative, impact objectives, target and raised amounts, and direct donation checkout trigger.
5. **Our Team (`/team.html`):** Complete leadership team profiles, biographies, and departmental roles.
6. **Join Us (`/join.html`):** Dual-tab interactive forms to register as a Member or apply as a Volunteer Champion.
7. **Donate (`/donate.html`):** Secure Pesapal payment checkout with preset amounts (KES 100, 500, 1,000, 5,000) and custom amounts.
8. **Payment Callback (`/payment-callback.html`):** Direct server-to-server Pesapal verification and official receipt generator.
9. **Photo Gallery (`/gallery.html`):** Categorized gallery with high-resolution lightbox modal.
10. **News & Events (`/news.html`):** Field dispatches and upcoming community calendar.
11. **Contact (`/contact.html`):** Official inquiry form, physical address, WhatsApp helpline, and interactive FAQs.
12. **Dynamic XML Sitemap (`/sitemap.xml`):** Automatically indexes all pages and newly published project slugs.

---

## 4. Administrative Management System

- **Admin Access URL:** `/admin` (Redirects to `/admin/login` if unauthenticated).
- **Admin Login:** `/admin/login`.
- **Admin Dashboard:** `/admin/dashboard`.

### Role-Based Access Control (RBAC):
- **Super Administrator:** Universal access, user management, audit logs, financial reports, settings.
- **Content Administrator:** Manage projects, news, events, team members, mission, and gallery.
- **Finance Administrator:** Audit donations, verify Pesapal transactions, financial logs.
- **Editor:** Draft articles, project updates, and review inquiries.

### Dashboard Modules:
- **Overview & Analytics:** Real-time aggregated stats (total KES raised, active projects, members, volunteers, recent donation records, audit feed).
- **Projects Management:** Add, edit, publish, archive, and delete projects with image uploads. Newly published projects automatically appear on the public site without code modification.
- **Mission Pillars:** Add and edit organizational strategic areas.
- **Team Management:** Add, edit, and reorder leadership members with photo upload.
- **News & Articles:** Publish field stories and press releases with cover images.
- **Events Management:** Schedule community marathons, tree planting days, and workshops.
- **Photo Gallery:** Upload field photographs with category tags and captions.
- **Donations & Pesapal Audits:** Real-time transaction history with one-click live status verification against the Pesapal API.
- **Membership & Volunteers:** Review applications, approve/decline, add notes.
- **Inquiries & Messages:** Read contact form submissions and reply directly via email.
- **Media Library:** Browse uploaded files and copy URLs.
- **Website Settings:** Update site name, tagline, email, phone, address, registration number, and hero texts.
- **Users & Roles (Super Admin):** Add administrators, assign roles, and toggle account status.
- **Activity Logs:** Complete audit trail tracking user email, IP address, action, and timestamp.

---

## 5. Quick Start & Installation

### Prerequisites
- Node.js (v18 or higher; tested on v24.22.3)
- npm (v9 or higher)

### Installation Steps

1. **Clone or navigate to the project directory:**
   ```bash
   cd Ereto
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and set the required values:
   ```env
   PORT=5000
   NODE_ENV=development
   APP_URL=http://localhost:5000
   SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters

   # Supabase PostgreSQL (Optional - local SQLite fallback active if left empty)
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...

   # Pesapal Payment Gateway v3
   PESAPAL_CONSUMER_KEY=demo_pesapal_consumer_key
   PESAPAL_CONSUMER_SECRET=demo_pesapal_consumer_secret
   PESAPAL_ENVIRONMENT=sandbox
   ```

4. **Seed Database & Initial Administrator:**
   ```bash
   npm run seed:admin
   ```
   Set `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` in `.env` before running the seeder. Use a unique, strong password; do not use example credentials on a public deployment.

5. **Start the Express Server:**
   ```bash
   npm start
   ```
   Or for auto-reload during development:
   ```bash
   npm run dev
   ```

6. **Open in Browser:**
   - Public Website: [http://localhost:5000](http://localhost:5000)
   - Admin Login: [http://localhost:5000/admin/login](http://localhost:5000/admin/login)
   - Admin Dashboard: [http://localhost:5000/admin/dashboard](http://localhost:5000/admin/dashboard)

---

## 6. Supabase PostgreSQL Configuration

To connect directly to your remote Supabase cloud database:

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard.
3. Open `database/schema.sql` from this repository and run the query to create all tables, indexes, and constraints.
4. (Optional) Run `database/seed.sql` to populate the initial categories, projects, team members, and settings.
5. In Supabase, go to **Project Settings** > **Database** > **Connection string** > **URI** (Session Pooler or Direct).
6. Paste the connection string into `.env`:
   ```env
   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   SUPABASE_URL=https://[ref].supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```
7. Restart the server. The database abstraction layer will automatically connect to Supabase PostgreSQL!

---

## 7. Pesapal Payment Gateway v3 Configuration

The application implements the complete Pesapal 3.0 API lifecycle:
1. `POST /Auth/RequestToken` to acquire an OAuth 2.0 bearer token.
2. `POST /URLSetup/RegisterIPN` to register the notification endpoint.
3. `POST /Transactions/SubmitOrderRequest` to initiate the payment order.
4. Redirection to Pesapal's secure checkout.
5. Server-to-server IPN webhook listener at `/api/donations/pesapal-ipn`.
6. Live transaction verification at `/api/donations/verify-payment`.

### Switching from Demo Sandbox to Production Pesapal:
1. Obtain production credentials from [Pesapal Merchant Dashboard](https://www.pesapal.com).
2. Set in `.env`:
   ```env
   PESAPAL_CONSUMER_KEY=your_live_consumer_key
   PESAPAL_CONSUMER_SECRET=your_live_consumer_secret
   PESAPAL_ENVIRONMENT=live
   PESAPAL_CALLBACK_URL=https://yourdomain.org/payment-callback.html
   PESAPAL_IPN_URL=https://yourdomain.org/api/donations/pesapal-ipn
   ```
3. Restart server. All payments will now execute live through Kenyan telcos (M-Pesa, Airtel Money) and international bank cards!

---

## 8. Automated Testing

Run the included end-to-end integration test suite:
```bash
node tests/test-flow.js
```
The test verifies:
- Public Projects & Team API.
- Admin Login & session cookie authentication.
- Role-based protected analytics endpoint.
- Pesapal donation generation & order tracking.
- Server-side transaction verification.
- Dynamic project addition via REST API.
- Instant public website visibility without source file edits.
- Dynamic XML sitemap generation.

---

## 9. Production Deployment

### Option A: Railway / Render / DigitalOcean App Platform
1. Connect the Git repository.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Set Environment Variables (`DATABASE_URL`, `SESSION_SECRET`, `PESAPAL_*`, `NODE_ENV=production`).

### Option B: Ubuntu Linux VPS (Nginx + PM2)
1. Install Node.js v20+ and PM2:
   ```bash
   sudo npm install -g pm2
   ```
2. Start application with PM2:
   ```bash
   pm2 start server.js --name "ereto-cbo"
   pm2 save
   pm2 startup
   ```
3. Configure Nginx reverse proxy passing traffic on port 80/443 to `http://localhost:5000`.
4. Install free SSL with Certbot:
   ```bash
   sudo certbot --nginx -d eretonamunyak.org -d www.eretonamunyak.org
   ```

### Option C: Render (persistent full-stack deployment)

This repository includes a `render.yaml` Blueprint for the Express app, managed PostgreSQL, persistent uploaded-media storage, and PostgreSQL-backed admin sessions. The Blueprint uses paid persistent resources; review the current Render pricing and confirm the resources before creating the Blueprint.

1. Push this project to a Git provider repository. `.env`, local cookies, and the SQLite database are excluded by `.gitignore`; never commit secrets.
2. In Render, create a Blueprint from that repository and review the service and database plans before confirming.
3. Enter `APP_URL` (the deployed `https://...onrender.com` URL), `SESSION_SECRET` (at least 32 random characters), `INITIAL_ADMIN_EMAIL`, and a unique `INITIAL_ADMIN_PASSWORD` when prompted. These values are required before the initial admin-seeding hook runs.
4. After the first successful deploy, open `/admin/login` and verify the site, admin login, and uploads. Set production Pesapal and email credentials separately before enabling those services.

---

## 10. License & Support

Developed for **Ereto Namunyak Community-Based Organization**.
All rights reserved &copy; 2026.
Registration Number: `CBO/KJD/2022/0488`.
Inquiries: `info@eretonamunyak.org` | Tel: `+254 722 000 000`.
