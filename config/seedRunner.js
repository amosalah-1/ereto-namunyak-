/**
 * Ereto Namunyak CBO - Seed Runner
 * Populates categories, projects, team members, mission areas, news, events,
 * gallery and settings into any supported database engine.
 */

const bcrypt = require('bcryptjs');

async function runLocalSeed(query) {
  // 1. Roles
  const roles = [
    ['super_admin', 'Super Administrator', 'Full platform access and management', '["all"]'],
    ['content_admin', 'Content Administrator', 'Manage projects, news, events, team, gallery', '["projects", "news", "events", "team", "gallery", "mission"]'],
    ['finance_admin', 'Finance Administrator', 'Manage donations, transactions and financial audits', '["donations", "transactions", "reports"]'],
    ['editor', 'Editor', 'Draft and edit articles and review inquiries', '["news_edit", "projects_edit", "messages"]']
  ];
  for (const r of roles) {
    try {
      await query(`INSERT OR IGNORE INTO roles (role_key, name, description, permissions) VALUES ($1, $2, $3, $4)`, r);
    } catch (_) {}
  }

  // 2. Project Categories
  const categories = [
    ['Environmental Conservation', 'environmental-conservation', 'Tree planting, climate resilience, water catchment restoration.'],
    ['Education & Scholarships', 'education-scholarships', 'Sponsoring vulnerable children, providing scholastic materials.'],
    ['Women Empowerment', 'women-empowerment', 'Micro-enterprise training, indigenous beadwork cooperatives.'],
    ['Youth Empowerment', 'youth-empowerment', 'Digital literacy, vocational skills, sports mentorship.'],
    ['Special Needs (PWSN)', 'special-needs-pwsn', 'Mobility assistive devices, rehabilitation support.'],
    ['Faith & Community', 'faith-community', 'Community harmony, peacebuilding, inter-generational dialogue.']
  ];
  for (const c of categories) {
    try {
      await query(`INSERT OR IGNORE INTO project_categories (name, slug, description) VALUES ($1, $2, $3)`, c);
    } catch (_) {}
  }

  // 3. Projects
  const projects = [
    [
      'Olturoto Indigenous Reforestation & Greening Initiative',
      'olturoto-indigenous-reforestation',
      'Restoring 100+ hectares of degraded indigenous forest canopy with native tree species and school woodlots.',
      'The Olturoto Indigenous Reforestation & Greening Initiative is our flagship climate action response. Ereto Namunyak CBO mobilizes pastoralist communities, schools, and youth volunteers to establish community tree nurseries, plant drought-tolerant indigenous species, and protect vital water springs. Over 35,000 trees have been planted across schools, churches, and communal grazing lands, curbing desertification and fostering environmental stewardship for future generations.',
      1,
      'Kajiado & Narok Region, Kenya',
      1500000.00,
      980000.00,
      '/images/environment-conservation.jpeg',
      'published',
      1,
      '2025-01-15',
      '2026-12-31'
    ],
    [
      'Ereto Neema Education Support & Scholarship Fund',
      'ereto-neema-education-support',
      'Providing full secondary school bursaries, uniforms, textbooks, and mentoring for 120 pastoralist students.',
      'Education is the greatest equalizer. In many rural pastoralist communities, bright children from vulnerable families risk dropping out of school due to lack of fees and scholastic supplies. The Ereto Neema Education Support Fund pairs identified vulnerable orphans and children with sponsors, fully covering tuition fees, boarding necessities, and holistic life-skills mentorship camps during holidays.',
      2,
      'Kajiado Central, Kenya',
      2000000.00,
      1450000.00,
      '/images/education-1.jpeg',
      'published',
      1,
      '2025-02-01',
      '2026-11-30'
    ],
    [
      'Enkare Maasai Women Artisan & Micro-Finance Cooperative',
      'enkare-maasai-women-artisan-cooperative',
      'Empowering 85 indigenous women through beadwork value addition, fair trade markets, and village savings pools.',
      'The Enkare Maasai Women Cooperative brings together rural women artisans to refine their traditional beaded jewelry and crafts for both national and international ethical markets. Ereto Namunyak provides modern design training, direct fair-trade market access, and a rotating micro-credit table-banking fund, enabling women to pay school fees, access healthcare, and become financially independent leaders in their homes.',
      3,
      'Ilbisil & Namanga Corridor, Kenya',
      1200000.00,
      780000.00,
      '/images/women-empowerment.jpeg',
      'published',
      1,
      '2025-03-10',
      '2026-10-31'
    ],
    [
      'PWSN Dignity, Care & Assistive Devices Outreach',
      'pwsn-dignity-care-assistive-devices',
      'Distributing wheelchairs, crutches, hearing aids, and nutrition packs to Persons with Special Needs in remote settlements.',
      'Persons With Special Needs (PWSN) in rural and remote pastoralist areas frequently face severe mobility barriers, social stigma, and lack of specialized care. Led by dedicated community champions, Ereto Namunyak maps individuals with disabilities, delivers fitted wheelchairs and mobility crutches, links them to medical therapy, and advocates fiercely for their inclusion in community life and government disability grants.',
      5,
      'Kajiado South & East, Kenya',
      1800000.00,
      1120000.00,
      '/images/pwsn-support.jpeg',
      'published',
      1,
      '2025-04-01',
      '2026-12-31'
    ],
    [
      'Maa Youth Digital Hub & Vocational Empowerment',
      'maa-youth-digital-hub-vocational-empowerment',
      'Training young pastoralists in ICT, digital entrepreneurship, electrical wiring, and solar installation.',
      'The Maa Youth Digital Hub bridges the technological divide by equipping young men and women with in-demand practical skills. From computer literacy, graphic design, and software fundamentals to solar photovoltaic installation and motorcycle mechanics, this program steers youth toward self-employment and sustainable livelihood alternatives.',
      4,
      'Isinya & Kajiado Town, Kenya',
      1600000.00,
      890000.00,
      '/images/youth-empowerment.jpeg',
      'published',
      0,
      '2025-05-15',
      '2026-12-15'
    ],
    [
      'Community Peace, Faith & Inter-Generational Harmony Forum',
      'community-peace-faith-harmony-forum',
      'Fostering inter-community reconciliation, elder mentorship, youth peace ambassadors, and faith-based community service.',
      'Building upon our deep heritage of mutual assistance ("Ereto Namunyak"), this program unites church elders, women leaders, traditional clan custodians, and youth to address resource conflicts, early marriages, and social cohesion. Through regular community dialogues, sports tournaments, and fellowship, we nurture resilient and peaceful communities.',
      6,
      'Kajiado, Narok & Samburu Outreach, Kenya',
      800000.00,
      540000.00,
      '/images/church-1.jpeg',
      'published',
      0,
      '2025-06-01',
      '2026-12-31'
    ]
  ];

  for (const p of projects) {
    try {
      await query(`
        INSERT OR IGNORE INTO projects 
        (title, slug, short_description, full_description, category_id, location, target_amount, raised_amount, cover_image, status, featured, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, p);
    } catch (_) {}
  }

  // 4. Team Members
  const team = [
    [
      'Peter Shuel',
      'Founder & Executive Patron',
      'Executive Leadership',
      'Visionary community leader and founder of Ereto Namunyak CBO. Peter has dedicated over 15 years to grassroots mobilization, youth mentorship, and sustainable community empowerment across Kenya.',
      '/images/peter-shuel-founder.jpeg',
      'peter.shuel@eretonamunyak.org',
      '+254 722 000 001',
      1
    ],
    [
      'Felix Siatoi',
      'Executive Coordinator',
      'Operations & Programs',
      'Dynamic development coordinator overseeing programmatic execution, donor relationships, community field chapters, and strategic partnerships.',
      '/images/felix-siatoi-coordinator.jpeg',
      'felix.siatoi@eretonamunyak.org',
      '+254 722 000 002',
      2
    ],
    [
      'Isaiah Nkeeni',
      'Secretary General',
      'Administration & Governance',
      'Experienced administrator ensuring institutional compliance, official records, legal governance, and inter-agency coordination for the organization.',
      '/images/isaiah-nkeeni-secretary.jpeg',
      'isaiah.nkeeni@eretonamunyak.org',
      '+254 722 000 003',
      3
    ],
    [
      'Maria Linti',
      'Treasurer & Finance Lead',
      'Finance & Audits',
      'Prudent financial steward overseeing transparent budget allocation, donor reporting, micro-grant management, and financial audit compliance.',
      '/images/maria-linti-treasurer.jpeg',
      'maria.linti@eretonamunyak.org',
      '+254 722 000 004',
      4
    ],
    [
      'Amos Letela',
      'ICT & Digital Strategy Director',
      'Technology & Media',
      'Technologist driving digital literacy programs, web management, communications, and data-driven impact monitoring for grassroots initiatives.',
      '/images/amos-letela-ict.jpeg',
      'amos.letela@eretonamunyak.org',
      '+254 722 000 005',
      5
    ],
    [
      'Esther Mpoyio',
      'Head of Women Affairs & Welfare',
      'Women & Family Welfare',
      'Passionate grassroots advocate spearheading women beadwork cooperatives, maternal health sensitization, and girl-child educational retention.',
      '/images/esther-mpoyio-women-affairs.jpeg',
      'esther.mpoyio@eretonamunyak.org',
      '+254 722 000 006',
      6
    ],
    [
      'Kariankei Kipain',
      'Head of Environmental & Conservation Affairs',
      'Climate & Agriculture',
      'Environmental specialist coordinating indigenous tree nurseries, pasture management, water pan desiltation, and community climate adaptation.',
      '/images/kariankei-kipain-environmental-affairs.jpeg',
      'kariankei.kipain@eretonamunyak.org',
      '+254 722 000 007',
      7
    ],
    [
      'Joel Morijoi',
      'Lead, PWSN Support & Church Affairs',
      'Special Needs & Faith Outreach',
      'Community champion advocating for Persons With Special Needs (PWSN), assistive mobility distribution, and church community outreach.',
      '/images/joel-morijoi-pwsn-church-affairs.jpeg',
      'joel.morijoi@eretonamunyak.org',
      '+254 722 000 008',
      8
    ]
  ];

  for (const t of team) {
    try {
      await query(`
        INSERT OR IGNORE INTO team_members 
        (name, role, department, bio, photo_url, email, phone, display_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
      `, t);
    } catch (_) {}
  }

  // 5. Mission Areas
  const missionAreas = [
    ['Education & Scholastic Growth', 'Unlocking the potential of vulnerable children through bursaries, school supplies, learning infrastructure, and academic mentorship.', 'fa-graduation-cap', '/images/education-2.jpeg', 1],
    ['Environmental Stewardship & Climate Action', 'Restoring semi-arid biodiversity, planting indigenous trees, harvesting rain water, and championing renewable clean energy.', 'fa-seedling', '/images/environment-4.jpeg', 2],
    ['Women Economic Self-Reliance', 'Equipping pastoralist women with financial literacy, value-added traditional craft exports, and cooperative micro-credit.', 'fa-female', '/images/women-empowerment.jpeg', 3],
    ['PWSN Dignity & Inclusion', 'Ensuring individuals with physical and developmental disabilities receive assistive mobility devices, therapy, and social inclusion.', 'fa-wheelchair', '/images/pwsn-support.jpeg', 4],
    ['Youth Empowerment & Digital Skills', 'Guiding the next generation through digital technology training, sports mentorship, vocational apprenticeships, and entrepreneurship.', 'fa-laptop-code', '/images/youth-empowerment.jpeg', 5],
    ['Faith, Peace & Cultural Heritage', 'Fostering peaceful coexistence, honoring noble cultural traditions, and mobilizing faith-based communities for collective service.', 'fa-church', '/images/church-2.jpeg', 6]
  ];

  for (const m of missionAreas) {
    try {
      await query(`
        INSERT OR IGNORE INTO mission_areas (title, description, icon, image_url, display_order, is_active)
        VALUES ($1, $2, $3, $4, $5, 1)
      `, m);
    } catch (_) {}
  }

  // 6. Gallery
  const galleryItems = [
    ['Tree Planting Drive at Olturoto', 'Environment', '/images/environment-conservation.jpeg', 'Volunteers planting indigenous acacia and cedar seedlings during the rains.', 1],
    ['School Desk & Stationery Handover', 'Education', '/images/education-1.jpeg', 'Delivering desks and textbooks to eager primary school learners.', 1],
    ['Pastoralist Women Artisan Collective', 'Empowerment', '/images/women-empowerment.jpeg', 'Traditional beadwork workshop showcasing intricate Maasai necklaces.', 1],
    ['Wheelchair Distribution Day', 'Special Needs', '/images/pwsn-support.jpeg', 'Providing new mobility wheelchairs to beneficiaries in rural outposts.', 1],
    ['Youth Tech Training Workshop', 'Youth', '/images/youth-empowerment.jpeg', 'Youth engaged in computer literacy and digital marketing training.', 1],
    ['Community Fellowship & Thanksgiving', 'Church', '/images/church-1.jpeg', 'Elders and community members gathering for peace prayer and fellowship.', 1],
    ['Classroom Learning Sessions', 'Education', '/images/education-3.jpeg', 'Young students participating attentively in their newly renovated classroom.', 1],
    ['Community Conservation Briefing', 'Environment', '/images/environment-3.jpeg', 'Field officers demonstrating sustainable soil and moisture conservation techniques.', 1],
    ['Inter-Generational Dialogue', 'Church', '/images/church-3.jpeg', 'Youth and community elders discussing community peace and stewardship.', 1]
  ];

  for (const g of galleryItems) {
    try {
      await query(`
        INSERT OR IGNORE INTO gallery (title, category, image_url, description, is_featured)
        VALUES ($1, $2, $3, $4, $5)
      `, g);
    } catch (_) {}
  }

  // 7. News & Articles
  const newsItems = [
    [
      'Over 10,000 Indigenous Seedlings Planted in Kajiado Reforestation Drive',
      'over-10000-indigenous-seedlings-planted',
      'Ereto Namunyak CBO rallied over 300 volunteers and school children in a transformative environmental conservation exercise.',
      'In our ongoing quest to combat desertification and restore indigenous tree cover, Ereto Namunyak CBO, in collaboration with local schools and environmental agencies, successfully planted 10,250 native tree seedlings across selected hilltops and water catchment areas. The event was led by Kariankei Kipain, Head of Environmental Affairs, who emphasized the importance of post-planting care and community guardianship.',
      '/images/environment-conservation.jpeg',
      'Ereto Editorial Team',
      1
    ],
    [
      'Ereto Neema Scholarship Fund Expands to 60 New Secondary Students',
      'scholarship-fund-expands-to-60-new-students',
      'Thanks to our generous donors and partners, 60 additional bright students from pastoralist families have received full bursaries.',
      'Securing an uninterrupted high school education remains a huge milestone for many vulnerable youth in the Maasai region. Executive Patron Peter Shuel and Coordinator Felix Siatoi presided over the awarding of scholarship letters and boarding necessities kits to 60 beneficiaries. We extend heartfelt gratitude to all individual donors and Pesapal contributors who made this milestone possible.',
      '/images/education-2.jpeg',
      'Amos Letela',
      1
    ],
    [
      'Empowering Lives: 40 Wheelchairs & Assistive Kits Distributed to PWSN',
      'empowering-lives-40-wheelchairs-distributed',
      'A landmark medical and mobility outreach brings freedom of movement and dignity to people living with disabilities.',
      'Under the stewardship of Joel Morijoi, our PWSN support division conducted an intensive mapping exercise that culminated in the direct handover of 40 custom-fitted rough-terrain wheelchairs, walking crutches, and dietary nutritional packs. Beneficiary families expressed profound relief and joy as their loved ones regained mobility and inclusion.',
      '/images/pwsn-support.jpeg',
      'Esther Mpoyio',
      1
    ]
  ];

  for (const n of newsItems) {
    try {
      await query(`
        INSERT OR IGNORE INTO news (title, slug, summary, content, cover_image, author, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, n);
    } catch (_) {}
  }

  // 8. Events
  const events = [
    [
      'Annual Ereto Namunyak Green Marathon & Tree Planting Expo',
      'Join hundreds of community athletes, conservationists, and families for a 10km run followed by mass tree planting at Olturoto grounds.',
      '2026-12-05',
      '07:00 AM - 01:00 PM EAT',
      'Olturoto Community Grounds, Kajiado County',
      '/images/environment-initiative.jpeg',
      1,
      '/join.html?type=volunteer'
    ],
    [
      'Pastoralist Youth Digital Skills & Innovation Summit',
      'A two-day immersive summit covering practical digital freelancing, renewable solar tech, and small business financial management.',
      '2026-12-18',
      '09:00 AM - 04:00 PM EAT',
      'Ereto Community Center, Isinya',
      '/images/youth-empowerment.jpeg',
      1,
      '/join.html?type=member'
    ],
    [
      'PWSN Community Medical & Assistive Device Outreach',
      'Free medical assessment, orthopedic screening, and distribution of mobility aids for persons with physical challenges.',
      '2027-01-16',
      '08:30 AM - 04:30 PM EAT',
      'Kajiado Central Health Compound',
      '/images/pwsn-support.jpeg',
      1,
      '/contact.html'
    ]
  ];

  for (const e of events) {
    try {
      await query(`
        INSERT OR IGNORE INTO events (title, description, event_date, event_time, location, cover_image, is_upcoming, registration_link)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, e);
    } catch (_) {}
  }

  // 9. Testimonials
  const testimonials = [
    [
      'Siparo Ole Sankale',
      'Community Elder & Parent',
      'Before Ereto Namunyak stepped in, two of my daughters faced dropping out of school. Today, one is in Form 3 and the other in college. Ereto has brought a bright dawn to our clan.',
      '/images/church-3.jpeg',
      5,
      1
    ],
    [
      'Naisula Mary',
      'Chairperson, Women Beadwork Hub',
      'Through the table banking and beadwork training, I bought my own dairy goat and paid my son examination fees. We have discovered our dignity as Maasai women.',
      '/images/women-empowerment.jpeg',
      5,
      1
    ],
    [
      'Jackson Kilonzo',
      'PWSN Beneficiary',
      'The all-terrain wheelchair I received from Ereto Namunyak transformed my life. I can now commute to the market and run my small electronics repair shop with independence.',
      '/images/pwsn-support.jpeg',
      5,
      1
    ]
  ];

  for (const t of testimonials) {
    try {
      await query(`
        INSERT OR IGNORE INTO testimonials (author_name, role_or_title, quote, photo_url, rating, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, t);
    } catch (_) {}
  }

  // 10. Website Settings
  const settings = [
    ['site_name', 'Ereto Namunyak CBO', 'general', 'Organization legal name'],
    ['site_tagline', 'Empowering Communities, Restoring Hope, Building Resilient Futures', 'general', 'Motto & slogan'],
    ['contact_email', 'info@eretonamunyak.org', 'contact', 'Public inquiry email address'],
    ['contact_phone', '+254 722 000 000', 'contact', 'Official helpline and WhatsApp phone'],
    ['contact_address', 'P.O. Box 128 - 01100, Kajiado Central, Kenya', 'contact', 'Physical office address'],
    ['reg_number', 'CBO/KJD/2022/0488', 'general', 'Government CBO registration certificate number'],
    ['hero_title', 'Empowering Maasai Communities with Dignity & Sustainable Hope', 'homepage', 'Main hero heading text'],
    ['hero_subtitle', 'Rooted in mutual support (Ereto Namunyak), we champion quality education, climate restoration, women cooperatives, youth skills, and dignity for persons with disabilities.', 'homepage', 'Hero sub-headline text'],
    ['stats_trees', '35,000+', 'stats', 'Trees planted to date'],
    ['stats_students', '480+', 'stats', 'Students supported with bursaries'],
    ['stats_women', '350+', 'stats', 'Women empowered in micro-finance'],
    ['stats_pwsn', '180+', 'stats', 'Persons with special needs assisted'],
    ['pesapal_mode', 'sandbox', 'payments', 'Pesapal environment (sandbox or live)'],
    ['pesapal_currency', 'KES', 'payments', 'Default transaction currency']
  ];

  for (const s of settings) {
    try {
      await query(`
        INSERT OR IGNORE INTO website_settings (setting_key, setting_value, category, description)
        VALUES ($1, $2, $3, $4)
      `, s);
    } catch (_) {}
  }

  // 11. Initial Super Admin Account
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.INITIAL_ADMIN_EMAIL || !process.env.INITIAL_ADMIN_PASSWORD)
  ) {
    throw new Error('Production database seeding requires INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD.');
  }

  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@eretonamunyak.org';
  const adminPass = process.env.INITIAL_ADMIN_PASSWORD || 'AdminEreto2026!';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Ereto Super Admin';
  const adminRole = process.env.INITIAL_ADMIN_ROLE || 'super_admin';
  const adminPhone = process.env.INITIAL_ADMIN_PHONE || '+254722000000';

  const checkUser = await query(`SELECT id FROM admin_users WHERE email = $1`, [adminEmail]);
  if (!checkUser.rows || checkUser.rows.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPass, salt);
    await query(`
      INSERT INTO admin_users (name, email, password_hash, role, phone, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
    `, [adminName, adminEmail, hash, adminRole, adminPhone]);
    console.log(`[DB] Created initial administrator: ${adminEmail}`);
  }
}

module.exports = { runLocalSeed };
