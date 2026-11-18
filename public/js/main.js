/**
 * Ereto Namunyak CBO - Main Public Client Controller
 * Handles dynamic content fetching, mobile navigation, toast alerts,
 * gallery lightbox, and site-wide interactivity.
 */

// Global Toast Notification Helper
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const toastType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'success';
  toast.className = `toast ${toastType}`;

  let iconClass = 'fa-check-circle';
  if (toastType === 'error') iconClass = 'fa-exclamation-circle';
  else if (toastType === 'warning') iconClass = 'fa-exclamation-triangle';
  else if (toastType === 'info') iconClass = 'fa-info-circle';

  const icon = document.createElement('i');
  icon.className = `fas ${iconClass} toast-icon`;
  const messageElement = document.createElement('div');
  messageElement.className = 'toast-message';
  messageElement.textContent = String(message ?? '');
  toast.append(icon, messageElement);

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('print-receipt')?.addEventListener('click', () => window.print());

  // 1. Mobile Navigation Drawer Toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileNav = document.getElementById('mobile-nav-drawer');
  const mobileBackdrop = document.getElementById('mobile-nav-backdrop');
  const mobileClose = document.getElementById('mobile-nav-close');

  function openMobileNav() {
    if (mobileNav) mobileNav.classList.add('open');
    if (mobileBackdrop) mobileBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    if (mobileNav) mobileNav.classList.remove('open');
    if (mobileBackdrop) mobileBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (mobileToggle) mobileToggle.addEventListener('click', openMobileNav);
  if (mobileClose) mobileClose.addEventListener('click', closeMobileNav);
  if (mobileBackdrop) mobileBackdrop.addEventListener('click', closeMobileNav);

  // 2. Navbar Scrolled State
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  }, { passive: true });

  // 3. Highlight Current Nav Link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '/' && href === 'index.html') || (href && currentPath.endsWith(href))) {
      link.classList.add('active');
    }
  });

  // 4. Load Website Settings (Dynamic phone, email, stats)
  async function loadDynamicSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.data) {
        const s = data.data;

        // Apply dynamically to elements with data-setting attribute
        document.querySelectorAll('[data-setting]').forEach(el => {
          const key = el.getAttribute('data-setting');
          if (s[key]) {
            el.innerText = s[key];
          }
        });

        // Update stats if present on homepage
        if (s.stats_trees) {
          const el = document.getElementById('stat-trees');
          if (el) el.setAttribute('data-target', s.stats_trees);
        }
        if (s.stats_students) {
          const el = document.getElementById('stat-students');
          if (el) el.setAttribute('data-target', s.stats_students);
        }
        if (s.stats_women) {
          const el = document.getElementById('stat-women');
          if (el) el.setAttribute('data-target', s.stats_women);
        }
        if (s.stats_pwsn) {
          const el = document.getElementById('stat-pwsn');
          if (el) el.setAttribute('data-target', s.stats_pwsn);
        }

        if (window.initGsapCounters) {
          window.initGsapCounters();
        }
      }
    } catch (err) {
      console.warn('[Settings Load Notice]', err.message);
    }
  }
  loadDynamicSettings();

  // 5. Load Featured Projects
  const projectsContainer = document.getElementById('projects-container');
  if (projectsContainer) {
    loadProjects(projectsContainer);
  }

  // 6. Load Mission Pillars
  const missionContainer = document.getElementById('mission-pillars-container');
  if (missionContainer) {
    loadMissionPillars(missionContainer);
  }

  // 7. Load Team Members
  const teamContainer = document.getElementById('team-members-container');
  if (teamContainer) {
    loadTeam(teamContainer);
  }

  // 8. Load News Articles
  const newsContainer = document.getElementById('news-articles-container');
  if (newsContainer) {
    loadNews(newsContainer);
  }

  // 9. Load Events
  const eventsContainer = document.getElementById('events-container');
  if (eventsContainer) {
    loadEvents(eventsContainer);
  }

  // 10. Load Photo Gallery
  const galleryContainer = document.getElementById('gallery-items-container');
  if (galleryContainer) {
    loadGallery(galleryContainer, 'all');
  }

  // 11. Newsletter Subscription AJAX
  const newsletterForms = document.querySelectorAll('.newsletter-form');
  newsletterForms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      if (!emailInput || !emailInput.value) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      }

      try {
        const res = await fetch('/api/forms/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value.trim() })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'Subscribed successfully!', 'success');
          form.reset();
        } else {
          showToast(data.message || 'Subscription failed.', 'error');
        }
      } catch (err) {
        showToast('Unable to connect to server. Please try again.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });
  });

  // 12. Lightbox Setup
  setupLightbox();
});

/**
 * Load Projects Dynamically into a Container
 */
async function loadProjects(container, category = 'all', search = '') {
  const requestId = String((Number(container.dataset.requestId) || 0) + 1);
  container.dataset.requestId = requestId;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
      <i class="fas fa-circle-notch fa-spin fa-2x" style="color: var(--primary);"></i>
      <p style="margin-top: 12px; color: var(--text-muted);">Loading projects from database...</p>
    </div>
  `;

  try {
    let url = '/api/projects';
    const limit = container.getAttribute('data-limit');
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (category && category !== 'all') params.append('category', category);
    if (search.trim()) params.append('search', search.trim());

    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    const data = await res.json();
    if (container.dataset.requestId !== requestId) return;

    if (!data.success || !data.data || data.data.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: #f8faf9; border-radius: 16px;">
          <i class="fas fa-folder-open fa-3x" style="color: #cbd5e0; margin-bottom: 15px;"></i>
          <h3>No projects found</h3>
          <p style="color: var(--text-muted);">Projects matching this criteria will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    data.data.forEach(p => {
      const target = parseFloat(p.target_amount) || 0;
      const raised = parseFloat(p.raised_amount) || 0;
      const percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
      const coverImage = p.cover_image || '/images/environment-conservation.jpeg';
      const categoryName = p.category_name || 'Community Outreach';

      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <div class="project-card-image">
          <img src="${coverImage}" alt="${p.title}" loading="lazy">
          <span class="project-badge-cat">${categoryName}</span>
        </div>
        <div class="project-card-body">
          <div class="project-location">
            <i class="fas fa-map-marker-alt" style="color: var(--primary);"></i>
            <span>${p.location}</span>
          </div>
          <h3 class="project-title">
            <a href="/project-detail.html?slug=${encodeURIComponent(p.slug)}">${p.title}</a>
          </h3>
          <p class="project-desc">${p.short_description}</p>
          
          <div class="project-progress-wrap">
            <div class="progress-labels">
              <span>Raised: <strong>KES ${Number(raised).toLocaleString()}</strong></span>
              <span>${percent}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${percent}%;"></div>
            </div>
          </div>

          <div class="project-card-footer">
            <a href="/project-detail.html?slug=${encodeURIComponent(p.slug)}" class="btn btn-outline btn-sm">
              Learn More <i class="fas fa-arrow-right"></i>
            </a>
            <a href="/donate.html?project=${encodeURIComponent(p.id)}" class="btn btn-secondary btn-sm">
              <i class="fas fa-heart"></i> Donate
            </a>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    if (container.dataset.requestId === requestId) {
      container.innerHTML = `<p style="color: red; text-align: center;">Failed to load projects: ${err.message}</p>`;
    }
  }
}

/**
 * Load Mission Pillars
 */
async function loadMissionPillars(container) {
  try {
    const res = await fetch('/api/mission');
    const data = await res.json();
    if (!data.success || !data.data) return;

    container.innerHTML = '';
    data.data.forEach(m => {
      const card = document.createElement('div');
      card.className = 'pillar-card';
      card.innerHTML = `
        <div class="pillar-icon-box">
          <i class="fas ${m.icon || 'fa-seedling'}"></i>
        </div>
        <h3 class="pillar-title">${m.title}</h3>
        <p class="pillar-text">${m.description}</p>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Mission load error', err);
  }
}

/**
 * Load Team Members
 */
async function loadTeam(container) {
  const searchInput = document.getElementById('team-search-input');
  const departmentFilter = document.getElementById('team-department-filter');
  const resultsCount = document.getElementById('team-results-count');

  try {
    const res = await fetch('/api/team');
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Invalid team response.');
    }

    const members = data.data;
    if (departmentFilter) {
      const departments = [...new Set(members.map(member => member.department).filter(Boolean))].sort();
      departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department;
        option.textContent = department;
        departmentFilter.appendChild(option);
      });
    }

    function renderTeam() {
      const query = (searchInput?.value || '').trim().toLowerCase();
      const selectedDepartment = departmentFilter?.value || '';
      const filteredMembers = members.filter(member => {
        const searchableText = [member.name, member.role, member.department, member.bio]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchableText.includes(query) &&
          (!selectedDepartment || member.department === selectedDepartment);
      });

      container.innerHTML = '';
      filteredMembers.forEach(member => {
        const card = document.createElement('div');
        card.className = 'team-card';
        card.innerHTML = `
          <div class="team-photo-wrap">
            <img src="${member.photo_url || '/images/peter-shuel-founder.jpeg'}" alt="${member.name}" loading="lazy">
          </div>
          <div class="team-body">
            <h3 class="team-name">${member.name}</h3>
            <p class="team-role">${member.role}</p>
            <p class="team-bio">${member.bio || ''}</p>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 8px;">
              ${member.email ? `<a href="mailto:${member.email}" style="color: var(--primary);"><i class="fas fa-envelope"></i> ${member.email}</a>` : ''}
            </div>
          </div>
        `;
        container.appendChild(card);
      });

      if (resultsCount) {
        resultsCount.textContent = filteredMembers.length
          ? `Showing ${filteredMembers.length} of ${members.length} team members.`
          : 'No team members match your search.';
      }
      if (filteredMembers.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'Try a different name, role, or department.';
        emptyMessage.style.gridColumn = '1 / -1';
        emptyMessage.style.textAlign = 'center';
        container.appendChild(emptyMessage);
      }
    }

    searchInput?.addEventListener('input', renderTeam);
    departmentFilter?.addEventListener('change', renderTeam);
    renderTeam();
  } catch (err) {
    console.error('Team load error', err);
    if (resultsCount) resultsCount.textContent = 'Unable to load team members. Please try again later.';
    container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Team members could not be loaded.</p>';
  }
}

/**
 * Load News
 */
async function loadNews(container) {
  try {
    const limit = container.getAttribute('data-limit');
    let url = '/api/news';
    if (limit) url += `?limit=${limit}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data.success || !data.data) return;

    container.innerHTML = '';
    data.data.forEach(n => {
      const dateStr = new Date(n.published_at || n.created_at).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const card = document.createElement('div');
      card.className = 'project-card';
      card.id = n.slug;
      card.innerHTML = `
        <div class="project-card-image" style="height: 200px;">
          <img src="${n.cover_image || '/images/environment-conservation.jpeg'}" alt="${n.title}" loading="lazy">
        </div>
        <div class="project-card-body">
          <span style="font-size: 0.8rem; color: var(--text-muted);"><i class="far fa-calendar-alt"></i> ${dateStr} &bull; ${n.author || 'Ereto'}</span>
          <h3 class="project-title" style="margin-top: 8px; font-size: 1.15rem;">
            <a href="/news.html#${encodeURIComponent(n.slug)}">${n.title}</a>
          </h3>
          <p class="project-desc">${n.summary}</p>
          <div class="project-card-footer" style="padding-top: 12px;">
            <a href="/news.html#${encodeURIComponent(n.slug)}" class="btn btn-outline btn-sm">
              Read Story <i class="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    if (window.location.pathname === '/news.html' && window.location.hash) {
      const targetFragment = window.location.hash.slice(1);
      const targetCard = Array.from(container.children).find(card =>
        card.id === targetFragment || encodeURIComponent(card.id) === targetFragment
      );
      if (targetCard) targetCard.scrollIntoView();
    }
  } catch (err) {
    console.error('News load error', err);
  }
}

/**
 * Load Events
 */
async function loadEvents(container) {
  try {
    const res = await fetch('/api/events');
    const data = await res.json();
    if (!data.success || !data.data) return;

    container.innerHTML = '';
    data.data.forEach(e => {
      const card = document.createElement('div');
      card.className = 'pillar-card';
      card.style.borderLeft = '4px solid var(--secondary)';
      card.innerHTML = `
        <div style="display: flex; gap: 14px; margin-bottom: 12px; font-size: 0.85rem; color: var(--primary); font-weight: 700;">
          <span><i class="far fa-calendar"></i> ${e.event_date}</span>
          <span><i class="far fa-clock"></i> ${e.event_time || ''}</span>
        </div>
        <h3 class="pillar-title" style="font-size: 1.25rem;">${e.title}</h3>
        <p class="pillar-text" style="margin-bottom: 16px;">${e.description}</p>
        <div style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 18px;">
          <i class="fas fa-map-marker-alt" style="color: var(--primary);"></i> ${e.location}
        </div>
        <a href="${e.registration_link || '/join.html'}" class="btn btn-primary btn-sm">Register / RSVP</a>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Events load error', err);
  }
}

/**
 * Load Gallery with Filter Category
 */
async function loadGallery(container, category = 'all') {
  try {
    let url = '/api/gallery';
    if (category && category !== 'all') url += `?category=${category}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data.success || !data.data) return;

    container.innerHTML = '';
    data.data.forEach(g => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.setAttribute('data-img', g.image_url);
      item.setAttribute('data-title', g.title);
      item.setAttribute('data-desc', g.description || '');
      item.innerHTML = `
        <img src="${g.image_url}" alt="${g.title}" loading="lazy">
        <div class="gallery-overlay">
          <h4>${g.title}</h4>
          <p>${g.category || 'Community'}</p>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    console.error('Gallery load error', err);
  }
}

/**
 * Lightbox Modal functionality
 */
function setupLightbox() {
  let modal = document.getElementById('lightbox-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lightbox-modal';
    modal.className = 'lightbox-modal';
    modal.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close" id="lightbox-close-btn">&times;</button>
        <img id="lightbox-img" src="" alt="" style="width: 100%; max-height: 70vh; object-fit: contain; background: #000;">
        <div style="padding: 20px;">
          <h3 id="lightbox-title" style="margin-bottom: 6px;"></h3>
          <p id="lightbox-desc" style="color: var(--text-muted); font-size: 0.95rem;"></p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const closeBtn = document.getElementById('lightbox-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    const galleryItem = e.target.closest('.gallery-item');
    if (galleryItem) {
      const img = galleryItem.getAttribute('data-img');
      const title = galleryItem.getAttribute('data-title');
      const desc = galleryItem.getAttribute('data-desc');

      document.getElementById('lightbox-img').src = img;
      document.getElementById('lightbox-title').innerText = title || '';
      document.getElementById('lightbox-desc').innerText = desc || '';
      modal.classList.add('open');
    }
  });
}
