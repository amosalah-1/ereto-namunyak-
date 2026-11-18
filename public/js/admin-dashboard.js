/**
 * Ereto Namunyak CBO - Complete Admin Dashboard SPA Controller
 * Real-time REST API bindings for all organizational management operations.
 */

let currentAdminUser = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function safeImageUrl(value, fallback = '/images/environment-conservation.jpeg') {
  const url = String(value || '').trim();
  return /^(https?:\/\/|\/(images|uploads)\/)/i.test(url) ? url : fallback;
}

async function readAdminResponse(response, fallbackMessage = 'The request could not be completed.') {
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.href = data.redirect || '/admin/login';
    throw new Error(data.message || 'Your session has expired. Please sign in again.');
  }
  if (!response.ok || data.success === false) {
    throw new Error(data.message || fallbackMessage);
  }
  return data;
}

function initAdminDashboard() {
  // Bind controls immediately so tab clicks are not blocked by the session request.
  setupTabNavigation();
  setupDashboardControls();

  const logoutBtn = document.getElementById('admin-logout-btn');
  logoutBtn?.addEventListener('click', handleLogout);

  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.admin-sidebar');
  sidebarToggle?.addEventListener('click', () => sidebar?.classList.toggle('open'));

  // Verify the session and load initial analytics without delaying control binding.
  initAdminSession().then(authenticated => {
    if (authenticated) loadAnalytics();
  });
}

// This script is loaded at the end of the dashboard document. The ready-state
// check also covers cached or dynamically loaded pages where DOMContentLoaded
// may already have fired before this file executes.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminDashboard, { once: true });
} else {
  initAdminDashboard();
}

/**
 * Verify Session & Populate User Info
 */
async function initAdminSession() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      window.location.href = '/admin/login';
      return false;
    }
    const data = await readAdminResponse(res);
    if (data.success && data.user) {
      currentAdminUser = data.user;
      document.getElementById('logged-admin-name').innerText = currentAdminUser.name;
      document.getElementById('logged-admin-role').innerText = formatRoleName(currentAdminUser.role);

      restrictDashboardByRole(currentAdminUser.role);
      return true;
    } else {
      window.location.href = '/admin/login';
      return false;
    }
  } catch (err) {
    console.error('Session check failed', err);
    window.location.href = '/admin/login';
    return false;
  }
}

function restrictDashboardByRole(role) {
  const tabsByRole = {
    super_admin: null,
    content_admin: [
      'tab-overview', 'tab-projects', 'tab-mission', 'tab-team', 'tab-news',
      'tab-events', 'tab-gallery', 'tab-media', 'tab-members', 'tab-volunteers',
      'tab-messages', 'tab-logs'
    ],
    finance_admin: ['tab-overview', 'tab-donations', 'tab-media', 'tab-logs'],
    editor: ['tab-overview', 'tab-projects', 'tab-news', 'tab-messages']
  };
  const allowedTabs = Object.prototype.hasOwnProperty.call(tabsByRole, role)
    ? tabsByRole[role]
    : ['tab-overview'];

  document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
    link.hidden = Array.isArray(allowedTabs) && !allowedTabs.includes(link.getAttribute('data-tab'));
  });
  document.querySelectorAll('[data-dashboard-tab]').forEach(button => {
    button.hidden = Array.isArray(allowedTabs) && !allowedTabs.includes(button.getAttribute('data-dashboard-tab'));
  });
}

function formatRoleName(role) {
  const map = {
    super_admin: 'Super Administrator',
    content_admin: 'Content Administrator',
    finance_admin: 'Finance Administrator',
    editor: 'Editor'
  };
  return map[role] || role;
}

function canManageContent() {
  return ['super_admin', 'content_admin'].includes(currentAdminUser?.role);
}

function populateContentForm(form, record) {
  const booleanFields = new Set(['is_active', 'is_published', 'is_upcoming', 'is_featured']);

  Object.entries(record).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (!field || field.type === 'file') return;

    if (booleanFields.has(name)) {
      field.value = value === true || value === 1 || ['1', 'true', 't', 'yes'].includes(String(value).toLowerCase())
        ? 'true'
        : 'false';
      return;
    }

    const fieldValue = value ?? '';
    if (field.tagName === 'SELECT' && fieldValue !== '' &&
        !Array.from(field.options).some(option => option.value === String(fieldValue))) {
      const option = new Option(String(fieldValue), String(fieldValue));
      option.dataset.adminGenerated = 'true';
      field.add(option);
    }
    field.value = field.type === 'date' && fieldValue
      ? String(fieldValue).slice(0, 10)
      : fieldValue;
  });
}

function prepareContentModal(formId, titleId, submitId, title, submitText, record, fileFieldName, requireFileOnCreate = false) {
  const form = document.getElementById(formId);
  form.querySelectorAll('option[data-admin-generated]').forEach(option => option.remove());
  form.reset();
  form.elements.namedItem('id').value = record?.id ?? '';
  if (record) populateContentForm(form, record);
  form.elements.namedItem(fileFieldName).required = !record && requireFileOnCreate;
  document.getElementById(titleId).textContent = title;
  document.getElementById(submitId).textContent = submitText;
  return form;
}

async function getAdminRecord(endpoint, id, entityName) {
  const res = await fetch(endpoint);
  const data = await readAdminResponse(res);
  const record = Array.isArray(data.data)
    ? data.data.find(item => String(item.id) === String(id))
    : null;
  if (!record) throw new Error(`${entityName} not found.`);
  return record;
}

/**
 * Setup Tab Navigation
 */
function setupTabNavigation() {
  document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
    link.addEventListener('click', event => {
      const tabId = link.getAttribute('data-tab');
      if (!tabId) return;
    event.preventDefault();
      activateDashboardTab(tabId);
    });
  });
}

function setupDashboardControls() {
  const forms = {
    'settings-form': saveAdminSettings,
    'project-form': saveProjectForm,
    'team-form': saveTeamForm,
    'mission-form': saveMissionForm,
    'news-form': saveNewsForm,
    'event-form': saveEventForm,
    'gallery-form': saveGalleryForm,
    'user-form': saveUserForm
  };

  Object.entries(forms).forEach(([formId, handler]) => {
    document.getElementById(formId)?.addEventListener('submit', handler);
  });

  document.getElementById('media-direct-upload')?.addEventListener('change', uploadDirectMedia);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;

    const copyButton = target.closest('[data-copy-media-url]');
    if (copyButton) {
      copyMediaUrl(copyButton.getAttribute('data-copy-media-url'));
      return;
    }

    const verifyButton = target.closest('[data-verify-pesapal]');
    if (verifyButton) {
      verifyPesapalTx(
        verifyButton.getAttribute('data-order-tracking-id'),
        verifyButton.getAttribute('data-merchant-reference')
      );
      return;
    }

    const tabButton = target.closest('[data-dashboard-tab]');
    if (tabButton) {
      activateDashboardTab(tabButton.getAttribute('data-dashboard-tab'));
      return;
    }

    const button = target.closest('[data-action]');
    if (!button) return;

    const id = button.dataset.id;
    switch (button.dataset.action) {
      case 'add-project': openAddProjectModal(); break;
      case 'add-mission': openAddMissionModal(); break;
      case 'add-team': openAddTeamModal(); break;
      case 'add-news': openAddNewsModal(); break;
      case 'add-event': openAddEventModal(); break;
      case 'add-gallery': openAddGalleryModal(); break;
      case 'add-user': openAddUserModal(); break;
      case 'refresh-donations': loadAdminDonations(); break;
      case 'refresh-members': loadAdminMembers(); break;
      case 'refresh-volunteers': loadAdminVolunteers(); break;
      case 'refresh-messages': loadAdminMessages(); break;
      case 'refresh-logs': loadAdminLogs(); break;
      case 'select-media-file': document.getElementById('media-direct-upload')?.click(); break;
      case 'edit-project': openEditProjectModal(id); break;
      case 'edit-team': openEditTeamModal(id); break;
      case 'edit-mission': openEditMissionModal(id); break;
      case 'edit-news': openEditNewsModal(id); break;
      case 'edit-event': openEditEventModal(id); break;
      case 'edit-gallery': openEditGalleryModal(id); break;
      case 'delete-project': deleteProject(id); break;
      case 'delete-team': deleteTeamMember(id); break;
      case 'delete-mission': deleteMissionPillar(id); break;
      case 'delete-news': deleteNewsArticle(id); break;
      case 'delete-event': deleteEventRecord(id); break;
      case 'delete-gallery': deleteGalleryPhoto(id); break;
      case 'member-status': updateMemberStatus(id, button.dataset.status); break;
      case 'delete-member': deleteMemberRecord(id); break;
      case 'volunteer-status': updateVolunteerStatus(id, button.dataset.status); break;
      case 'delete-volunteer': deleteVolunteerRecord(id); break;
      case 'mark-message-read': markMsgRead(id); break;
      case 'delete-message': deleteContactMsg(id); break;
      case 'toggle-user-status': toggleUserStatus(id); break;
    }
  });
}

function activateDashboardTab(tabId) {
  const activePane = document.getElementById(tabId);
  const activeLink = document.querySelector(`.sidebar-link[data-tab="${tabId}"]`);
  if (!activePane || activeLink?.hidden) return;

  document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => link.classList.remove('active'));
  document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.classList.remove('active'));
  activeLink?.classList.add('active');
  activePane.classList.add('active');

  const pageTitle = document.getElementById('page-heading-title');
  if (pageTitle) {
    pageTitle.innerText = activeLink?.querySelector('span')?.innerText || 'Dashboard';
  }

  document.querySelector('.admin-sidebar')?.classList.remove('open');
  triggerTabLoader(tabId);
}

function triggerTabLoader(tabId) {
  switch (tabId) {
    case 'tab-overview':
      loadAnalytics();
      break;
    case 'tab-projects':
      loadAdminProjects();
      break;
    case 'tab-mission':
      loadAdminMission();
      break;
    case 'tab-team':
      loadAdminTeam();
      break;
    case 'tab-news':
      loadAdminNews();
      break;
    case 'tab-events':
      loadAdminEvents();
      break;
    case 'tab-gallery':
      loadAdminGallery();
      break;
    case 'tab-donations':
      loadAdminDonations();
      break;
    case 'tab-members':
      loadAdminMembers();
      break;
    case 'tab-volunteers':
      loadAdminVolunteers();
      break;
    case 'tab-messages':
      loadAdminMessages();
      break;
    case 'tab-settings':
      loadAdminSettings();
      break;
    case 'tab-users':
      loadAdminUsers();
      break;
    case 'tab-logs':
      loadAdminLogs();
      break;
    case 'tab-media':
      loadAdminMedia();
      break;
  }
}

/**
 * Handle Logout
 */
async function handleLogout() {
  if (confirm('Are you sure you want to end your administrative session?')) {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    window.location.href = '/admin/login';
  }
}

// ==========================================================================
// 1. OVERVIEW & ANALYTICS
// ==========================================================================
async function loadAnalytics() {
  try {
    const res = await fetch('/api/admin/analytics');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    const a = data.analytics;

    // Stat cards
    document.getElementById('stat-total-donations').innerText = `KES ${Number(a.donations.totalRaised).toLocaleString()}`;
    document.getElementById('stat-active-projects').innerText = `${a.projects.active} / ${a.projects.total}`;
    document.getElementById('stat-total-members').innerText = Number(a.members.total).toLocaleString();
    document.getElementById('stat-total-volunteers').innerText = Number(a.volunteers.total).toLocaleString();

    // Recent Donations Table
    const donationsTbody = document.getElementById('recent-donations-tbody');
    if (donationsTbody) {
      if (a.recentDonations.length === 0) {
        donationsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No donation records yet.</td></tr>';
      } else {
        donationsTbody.innerHTML = a.recentDonations.map(d => `
          <tr>
            <td><strong>${escapeHtml(d.donor_name)}</strong></td>
            <td>KES ${Number(d.amount).toLocaleString()}</td>
            <td>${escapeHtml(d.project_title || 'General Fund')}</td>
            <td><span class="status-pill ${escapeHtml(String(d.payment_status || '').toLowerCase())}">${escapeHtml(d.payment_status || 'Unknown')}</span></td>
            <td>${new Date(d.created_at).toLocaleDateString('en-KE')}</td>
          </tr>
        `).join('');
      }
    }

    // Recent Activity Feed
    const activityFeed = document.getElementById('recent-activity-feed');
    if (activityFeed) {
      if (a.recentActivities.length === 0) {
        activityFeed.innerHTML = '<p style="color: #718096; padding: 15px;">No recent administrative activity.</p>';
      } else {
        activityFeed.innerHTML = a.recentActivities.map(log => `
          <div style="display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid #edf2f7; font-size: 0.88rem;">
            <i class="fas fa-history" style="color: var(--admin-primary); margin-top: 3px;"></i>
            <div style="flex: 1;">
              <div><strong>${escapeHtml(log.user_email || 'System')}</strong>: ${escapeHtml(log.action)}</div>
              <div style="color: #718096; font-size: 0.82rem;">${escapeHtml(log.details || '')}</div>
              <div style="color: #a0aec0; font-size: 0.75rem;">${new Date(log.created_at).toLocaleString('en-KE')}</div>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Analytics load error', err);
  }
}

// ==========================================================================
// 2. PROJECT MANAGEMENT
// ==========================================================================
async function loadAdminProjects() {
  const tbody = document.getElementById('admin-projects-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading projects...</td></tr>';

  try {
    const res = await fetch('/api/admin/projects');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    if (data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No projects recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.data.map(p => `
      <tr>
        <td>
          <img src="${escapeHtml(safeImageUrl(p.cover_image))}" class="table-img-thumb" alt="${escapeHtml(p.title)}">
        </td>
        <td>
          <strong>${escapeHtml(p.title)}</strong>
          <div style="font-size: 0.8rem; color: #718096;">${escapeHtml(p.location)}</div>
        </td>
        <td>${escapeHtml(p.category_name || 'General')}</td>
        <td>
          <div>KES ${Number(p.raised_amount).toLocaleString()} / ${Number(p.target_amount).toLocaleString()}</div>
        </td>
        <td><span class="status-pill ${escapeHtml(p.status)}">${escapeHtml(p.status)}</span></td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn-action" data-action="edit-project" data-id="${Number(p.id)}" title="Edit Project"><i class="fas fa-edit"></i></button>
            ${canManageContent() ? `<button class="btn-action delete" data-action="delete-project" data-id="${Number(p.id)}" title="Delete Project"><i class="fas fa-trash-alt"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Failed to load: ${err.message}</td></tr>`;
  }
}

function openAddProjectModal() {
  document.getElementById('project-modal-title').innerText = 'Add New Project';
  document.getElementById('project-form').reset();
  document.getElementById('project-id-input').value = '';
  document.getElementById('project-modal').classList.add('open');
}

async function openEditProjectModal(id) {
  try {
    const res = await fetch(`/api/projects/${id}`);
    const data = await readAdminResponse(res);
    if (!data.success || !data.data) return;

    const p = data.data;
    document.getElementById('project-modal-title').innerText = 'Edit Project';
    document.getElementById('project-id-input').value = p.id;
    document.getElementById('project-title-input').value = p.title;
    document.getElementById('project-cat-select').value = p.category_id || 1;
    document.getElementById('project-location-input').value = p.location;
    document.getElementById('project-target-input').value = p.target_amount;
    document.getElementById('project-raised-input').value = p.raised_amount;
    document.getElementById('project-status-select').value = p.status;
    document.getElementById('project-featured-check').checked = p.featured == 1;
    document.getElementById('project-short-desc').value = p.short_description;
    document.getElementById('project-full-desc').value = p.full_description;

    document.getElementById('project-modal').classList.add('open');
  } catch (err) {
    showToast(err.message || 'Could not load project details.', 'error');
  }
}

async function saveProjectForm(e) {
  e.preventDefault();
  const form = document.getElementById('project-form');
  const formData = new FormData(form);
  const id = document.getElementById('project-id-input').value;
  formData.set('featured', document.getElementById('project-featured-check').checked ? '1' : '0');

  const url = id ? `/api/admin/projects/${id}` : '/api/admin/projects';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      body: formData
    });
    const data = await readAdminResponse(res);
    if (data.success) {
      showToast(data.message, 'success');
      document.getElementById('project-modal').classList.remove('open');
      loadAdminProjects();
    } else {
      showToast(data.message || 'Operation failed', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Failed to save project.', 'error');
  }
}

async function deleteProject(id) {
  if (confirm('Are you sure you want to permanently delete this project?')) {
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
      const data = await readAdminResponse(res);
      if (data.success) {
        showToast(data.message, 'success');
        loadAdminProjects();
      } else {
        showToast(data.message || 'Delete failed', 'error');
      }
    } catch (err) {
    showToast(err.message || 'Error deleting project.', 'error');
    }
  }
}

// ==========================================================================
// 3. TEAM MANAGEMENT
// ==========================================================================
async function loadAdminTeam() {
  const tbody = document.getElementById('admin-team-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading team...</td></tr>';

  try {
    const res = await fetch('/api/admin/team');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    tbody.innerHTML = data.data.map(t => `
      <tr>
        <td>
          <img src="${escapeHtml(safeImageUrl(t.photo_url, '/images/peter-shuel-founder.jpeg'))}" class="table-img-thumb" alt="${escapeHtml(t.name)}">
        </td>
        <td>
          <strong>${escapeHtml(t.name)}</strong>
          <div style="font-size: 0.8rem; color: #718096;">${escapeHtml(t.email || '')}</div>
        </td>
        <td>${escapeHtml(t.role)}</td>
        <td>${escapeHtml(t.department || 'General')}</td>
        <td>
          ${canManageContent() ? `
            <button class="btn-action" data-action="edit-team" data-id="${Number(t.id)}" title="Edit Team Member"><i class="fas fa-edit"></i></button>
            <button class="btn-action delete" data-action="delete-team" data-id="${Number(t.id)}" title="Delete Team Member"><i class="fas fa-trash-alt"></i></button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Failed to load team</td></tr>';
  }
}

function openAddTeamModal() {
  prepareContentModal('team-form', 'team-modal-title', 'team-submit-btn', 'Add Team Member', 'Save Team Member', null, 'photo');
  document.getElementById('team-modal').classList.add('open');
}

async function openEditTeamModal(id) {
  try {
    const member = await getAdminRecord('/api/admin/team', id, 'Team member');
    prepareContentModal('team-form', 'team-modal-title', 'team-submit-btn', 'Edit Team Member', 'Save Changes', member, 'photo');
    document.getElementById('team-modal').classList.add('open');
  } catch (err) {
    showToast(err.message || 'Could not load team member.', 'error');
  }
}

async function saveTeamForm(e) {
  e.preventDefault();
  const form = document.getElementById('team-form');
  const formData = new FormData(form);
  const id = formData.get('id');

  try {
    const res = await fetch(id ? `/api/admin/team/${encodeURIComponent(id)}` : '/api/admin/team', {
      method: id ? 'PUT' : 'POST',
      body: formData
    });
    const data = await readAdminResponse(res);
    if (data.success) {
      showToast(data.message, 'success');
      document.getElementById('team-modal').classList.remove('open');
      form.reset();
      loadAdminTeam();
    } else {
      showToast(data.message || 'Failed to add team member', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Error saving team member.', 'error');
  }
}

async function deleteTeamMember(id) {
  if (confirm('Delete this team member record?')) {
    try {
      const res = await fetch(`/api/admin/team/${id}`, { method: 'DELETE' });
      const data = await readAdminResponse(res);
      if (data.success) {
        showToast(data.message, 'success');
        loadAdminTeam();
      }
    } catch (err) {
    showToast(err.message || 'Could not delete team member.', 'error');
    }
  }
}

// ==========================================================================
// 4. MISSION PILLARS
// ==========================================================================
async function loadAdminMission() {
  const tbody = document.getElementById('admin-mission-tbody');
  try {
    const res = await fetch('/api/admin/mission');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    tbody.innerHTML = data.data.map(m => `
      <tr>
        <td><i class="fas ${escapeHtml(m.icon)}" style="font-size: 1.3rem; color: var(--admin-primary);"></i></td>
        <td><strong>${escapeHtml(m.title)}</strong></td>
        <td>${escapeHtml(m.description)}</td>
        <td>
          ${canManageContent() ? `
            <button class="btn-action" data-action="edit-mission" data-id="${Number(m.id)}" title="Edit Mission Pillar"><i class="fas fa-edit"></i></button>
            <button class="btn-action delete" data-action="delete-mission" data-id="${Number(m.id)}" title="Delete Mission Pillar"><i class="fas fa-trash-alt"></i></button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

function openAddMissionModal() {
  prepareContentModal('mission-form', 'mission-modal-title', 'mission-submit-btn', 'Add Strategic Mission Pillar', 'Save Pillar', null, 'image');
  document.getElementById('mission-modal').classList.add('open');
}

async function openEditMissionModal(id) {
  try {
    const mission = await getAdminRecord('/api/admin/mission', id, 'Mission pillar');
    prepareContentModal('mission-form', 'mission-modal-title', 'mission-submit-btn', 'Edit Mission Pillar', 'Save Changes', mission, 'image');
    document.getElementById('mission-modal').classList.add('open');
  } catch (err) {
    showToast(err.message || 'Could not load mission pillar.', 'error');
  }
}

async function saveMissionForm(e) {
  e.preventDefault();
  const form = document.getElementById('mission-form');
  const formData = new FormData(form);
  const id = formData.get('id');

  try {
    const res = await fetch(id ? `/api/admin/mission/${encodeURIComponent(id)}` : '/api/admin/mission', {
      method: id ? 'PUT' : 'POST',
      body: formData
    });
    const data = await readAdminResponse(res, 'Failed to save pillar.');
    showToast(data.message || 'Pillar saved.', 'success');
    document.getElementById('mission-modal').classList.remove('open');
    form.reset();
    loadAdminMission();
  } catch (err) {
    showToast(err.message || 'Failed to save pillar.', 'error');
  }
}

async function deleteMissionPillar(id) {
  if (confirm('Delete this mission pillar?')) {
    try {
      const res = await fetch(`/api/admin/mission/${id}`, { method: 'DELETE' });
      const data = await readAdminResponse(res, 'Could not delete pillar.');
      showToast(data.message || 'Pillar removed.', 'success');
      loadAdminMission();
    } catch (err) {
      showToast(err.message || 'Could not delete pillar.', 'error');
    }
  }
}

// ==========================================================================
// 5. NEWS & ARTICLES
// ==========================================================================
async function loadAdminNews() {
  const tbody = document.getElementById('admin-news-tbody');
  try {
    const res = await fetch('/api/admin/news');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    tbody.innerHTML = data.data.map(n => `
      <tr>
        <td><img src="${escapeHtml(safeImageUrl(n.cover_image))}" class="table-img-thumb" alt=""></td>
        <td><strong>${escapeHtml(n.title)}</strong></td>
        <td>${escapeHtml(n.author)}</td>
        <td><span class="status-pill ${n.is_published ? 'published' : 'draft'}">${n.is_published ? 'Published' : 'Draft'}</span></td>
        <td>
          <button class="btn-action" data-action="edit-news" data-id="${Number(n.id)}" title="Edit Article"><i class="fas fa-edit"></i></button>
          ${canManageContent() ? `<button class="btn-action delete" data-action="delete-news" data-id="${Number(n.id)}" title="Delete Article"><i class="fas fa-trash-alt"></i></button>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

function openAddNewsModal() {
  prepareContentModal('news-form', 'news-modal-title', 'news-submit-btn', 'Publish News / Field Story', 'Publish Article', null, 'cover_image');
  document.getElementById('news-modal').classList.add('open');
}

async function openEditNewsModal(id) {
  try {
    const article = await getAdminRecord('/api/admin/news', id, 'Article');
    prepareContentModal('news-form', 'news-modal-title', 'news-submit-btn', 'Edit News / Field Story', 'Save Changes', article, 'cover_image');
    document.getElementById('news-modal').classList.add('open');
  } catch (err) {
    showToast(err.message || 'Could not load article.', 'error');
  }
}

async function saveNewsForm(e) {
  e.preventDefault();
  const form = document.getElementById('news-form');
  const formData = new FormData(form);
  const id = formData.get('id');

  try {
    const res = await fetch(id ? `/api/admin/news/${encodeURIComponent(id)}` : '/api/admin/news', {
      method: id ? 'PUT' : 'POST',
      body: formData
    });
    const data = await readAdminResponse(res, 'Failed to save article.');
    showToast(data.message || 'Article published.', 'success');
    document.getElementById('news-modal').classList.remove('open');
    form.reset();
    loadAdminNews();
  } catch (err) {
    showToast(err.message || 'Failed to save article.', 'error');
  }
}

async function deleteNewsArticle(id) {
  if (confirm('Delete this article?')) {
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: 'DELETE' });
      const data = await readAdminResponse(res, 'Could not delete article.');
      showToast(data.message || 'Article deleted.', 'success');
      loadAdminNews();
    } catch (err) {
      showToast(err.message || 'Could not delete article.', 'error');
    }
  }
}

// ==========================================================================
// 6. EVENTS MANAGEMENT
// ==========================================================================
async function loadAdminEvents() {
  const tbody = document.getElementById('admin-events-tbody');
  try {
    const res = await fetch('/api/admin/events');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    tbody.innerHTML = data.data.map(e => `
      <tr>
        <td><strong>${escapeHtml(e.title)}</strong></td>
        <td>${escapeHtml(e.event_date)} (${escapeHtml(e.event_time || '')})</td>
        <td>${escapeHtml(e.location)}</td>
        <td>
          ${canManageContent() ? `
            <button class="btn-action" data-action="edit-event" data-id="${Number(e.id)}" title="Edit Event"><i class="fas fa-edit"></i></button>
            <button class="btn-action delete" data-action="delete-event" data-id="${Number(e.id)}" title="Delete Event"><i class="fas fa-trash-alt"></i></button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

function openAddEventModal() {
  prepareContentModal('event-form', 'event-modal-title', 'event-submit-btn', 'Schedule Community Event', 'Schedule Event', null, 'cover_image');
  document.getElementById('event-modal').classList.add('open');
}

async function openEditEventModal(id) {
  try {
    const event = await getAdminRecord('/api/admin/events', id, 'Event');
    prepareContentModal('event-form', 'event-modal-title', 'event-submit-btn', 'Edit Community Event', 'Save Changes', event, 'cover_image');
    document.getElementById('event-modal').classList.add('open');
  } catch (err) {
    showToast(err.message || 'Could not load event.', 'error');
  }
}

async function saveEventForm(e) {
  e.preventDefault();
  const form = document.getElementById('event-form');
  const formData = new FormData(form);
  const id = formData.get('id');

  try {
    const res = await fetch(id ? `/api/admin/events/${encodeURIComponent(id)}` : '/api/admin/events', {
      method: id ? 'PUT' : 'POST',
      body: formData
    });
    const data = await readAdminResponse(res, 'Failed to save event.');
    showToast(data.message || 'Event scheduled.', 'success');
    document.getElementById('event-modal').classList.remove('open');
    form.reset();
    loadAdminEvents();
  } catch (err) {
    showToast(err.message || 'Failed to save event.', 'error');
  }
}

async function deleteEventRecord(id) {
  if (confirm('Delete this event?')) {
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
      const data = await readAdminResponse(res, 'Could not delete event.');
      showToast(data.message || 'Event deleted.', 'success');
      loadAdminEvents();
    } catch (err) {
      showToast(err.message || 'Could not delete event.', 'error');
    }
  }
}

// ==========================================================================
// 7. PHOTO GALLERY
// ==========================================================================
async function loadAdminGallery() {
  const tbody = document.getElementById('admin-gallery-tbody');
  try {
    const res = await fetch('/api/admin/gallery');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    tbody.innerHTML = data.data.map(g => `
      <tr>
        <td><img src="${escapeHtml(safeImageUrl(g.image_url))}" class="table-img-thumb" alt="${escapeHtml(g.title)}"></td>
        <td><strong>${escapeHtml(g.title)}</strong></td>
        <td>${escapeHtml(g.category)}</td>
        <td>
          ${canManageContent() ? `
            <button class="btn-action" data-action="edit-gallery" data-id="${Number(g.id)}" title="Edit Gallery Item"><i class="fas fa-edit"></i></button>
            <button class="btn-action delete" data-action="delete-gallery" data-id="${Number(g.id)}" title="Delete Gallery Item"><i class="fas fa-trash-alt"></i></button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

function openAddGalleryModal() {
  prepareContentModal('gallery-form', 'gallery-modal-title', 'gallery-submit-btn', 'Upload Photo to Gallery', 'Upload Photo', null, 'image', true);
  document.getElementById('gallery-modal').classList.add('open');
}

async function openEditGalleryModal(id) {
  try {
    const item = await getAdminRecord('/api/admin/gallery', id, 'Gallery item');
    prepareContentModal('gallery-form', 'gallery-modal-title', 'gallery-submit-btn', 'Edit Gallery Item', 'Save Changes', item, 'image');
    document.getElementById('gallery-modal').classList.add('open');
  } catch (err) {
    showToast(err.message || 'Could not load gallery item.', 'error');
  }
}

async function saveGalleryForm(e) {
  e.preventDefault();
  const form = document.getElementById('gallery-form');
  const formData = new FormData(form);
  const id = formData.get('id');

  try {
    const res = await fetch(id ? `/api/admin/gallery/${encodeURIComponent(id)}` : '/api/admin/gallery', {
      method: id ? 'PUT' : 'POST',
      body: formData
    });
    const data = await readAdminResponse(res, 'Failed to add photo.');
    showToast(data.message || 'Photo added.', 'success');
    document.getElementById('gallery-modal').classList.remove('open');
    form.reset();
    loadAdminGallery();
  } catch (err) {
    showToast(err.message || 'Failed to add photo.', 'error');
  }
}

async function deleteGalleryPhoto(id) {
  if (confirm('Delete this photo?')) {
    try {
      const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
      const data = await readAdminResponse(res, 'Could not delete photo.');
      showToast(data.message || 'Photo removed.', 'success');
      loadAdminGallery();
    } catch (err) {
      showToast(err.message || 'Could not delete photo.', 'error');
    }
  }
}

// ==========================================================================
// 8. DONATIONS & PESAPAL AUDITS
// ==========================================================================
async function loadAdminDonations() {
  const tbody = document.getElementById('admin-donations-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading records...</td></tr>';

  try {
    const res = await fetch('/api/admin/donations');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    if (data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No donations recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.data.map(d => `
      <tr>
        <td><strong>${escapeHtml(d.donor_name)}</strong></td>
        <td>${escapeHtml(d.donor_email)}<br><small style="color:#718096;">${escapeHtml(d.donor_phone)}</small></td>
        <td><strong>KES ${Number(d.amount).toLocaleString()}</strong></td>
        <td>${escapeHtml(d.project_title || 'General Fund')}</td>
        <td><span class="status-pill ${escapeHtml(String(d.payment_status || '').toLowerCase())}">${escapeHtml(d.payment_status || 'Unknown')}</span></td>
        <td><small>${escapeHtml(d.pesapal_merchant_reference || 'N/A')}</small></td>
        <td>
          <button class="btn btn-outline btn-sm" data-verify-pesapal data-order-tracking-id="${escapeHtml(d.pesapal_order_tracking_id || '')}" data-merchant-reference="${escapeHtml(d.pesapal_merchant_reference || '')}" title="Verify directly with Pesapal API">
            <i class="fas fa-sync-alt"></i> Verify
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:red; text-align:center;">Failed to load donations</td></tr>';
  }
}

async function verifyPesapalTx(orderTrackingId, merchantReference) {
  showToast('Querying Pesapal API for live transaction status...', 'info');
  try {
    const query = new URLSearchParams({
      orderTrackingId: orderTrackingId || '',
      merchantReference: merchantReference || ''
    });
    const res = await fetch(`/api/donations/verify-payment?${query.toString()}`);
    const data = await readAdminResponse(res, 'Payment verification failed.');
    if (data.success && data.donation) {
      showToast(`Status verified: ${data.donation.payment_status} (${data.donation.payment_method || 'Pesapal'})`, 'success');
      loadAdminDonations();
    } else {
      showToast(data.message || 'Status check failed', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Failed to reach Pesapal API.', 'error');
  }
}

// ==========================================================================
// 9. MEMBERSHIP MANAGEMENT
// ==========================================================================
async function loadAdminMembers() {
  const tbody = document.getElementById('admin-members-tbody');
  try {
    const res = await fetch('/api/admin/members');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    tbody.innerHTML = data.data.map(m => `
      <tr>
        <td><strong>${escapeHtml(m.full_name)}</strong></td>
        <td>${escapeHtml(m.email)}<br><small>${escapeHtml(m.phone)}</small></td>
        <td>${escapeHtml(m.county || 'N/A')}</td>
        <td>${escapeHtml(m.membership_type)}</td>
        <td><span class="status-pill ${escapeHtml(m.status)}">${escapeHtml(m.status)}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-outline btn-sm" data-action="member-status" data-id="${Number(m.id)}" data-status="approved" title="Approve member"><i class="fas fa-check"></i></button>
            <button class="btn btn-outline btn-sm" data-action="member-status" data-id="${Number(m.id)}" data-status="rejected" title="Reject member"><i class="fas fa-times"></i></button>
            ${currentAdminUser?.role === 'super_admin' ? `<button class="btn-action delete" data-action="delete-member" data-id="${Number(m.id)}"><i class="fas fa-trash-alt"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function updateMemberStatus(id, status) {
  try {
    const res = await fetch(`/api/admin/members/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await readAdminResponse(res, 'Could not update member status.');
    showToast(data.message || `Member marked as ${status}.`, 'success');
    loadAdminMembers();
  } catch (err) {
    showToast(err.message || 'Could not update member status.', 'error');
  }
}

async function deleteMemberRecord(id) {
  if (confirm('Delete this member record?')) {
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: 'DELETE' });
      const data = await readAdminResponse(res, 'Could not delete member.');
      showToast(data.message || 'Member deleted.', 'success');
      loadAdminMembers();
    } catch (err) {
      showToast(err.message || 'Could not delete member.', 'error');
    }
  }
}

// ==========================================================================
// 10. VOLUNTEER MANAGEMENT
// ==========================================================================
async function loadAdminVolunteers() {
  const tbody = document.getElementById('admin-volunteers-tbody');
  try {
    const res = await fetch('/api/admin/volunteers');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    tbody.innerHTML = data.data.map(v => `
      <tr>
        <td><strong>${escapeHtml(v.full_name)}</strong></td>
        <td>${escapeHtml(v.email)}<br><small>${escapeHtml(v.phone)}</small></td>
        <td>${escapeHtml(v.area_of_interest || 'General')}</td>
        <td>${escapeHtml(v.skills || 'N/A')}</td>
        <td><span class="status-pill ${escapeHtml(v.status)}">${escapeHtml(v.status)}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-outline btn-sm" data-action="volunteer-status" data-id="${Number(v.id)}" data-status="accepted" title="Accept volunteer"><i class="fas fa-check"></i></button>
            <button class="btn btn-outline btn-sm" data-action="volunteer-status" data-id="${Number(v.id)}" data-status="declined" title="Decline volunteer"><i class="fas fa-times"></i></button>
            ${currentAdminUser?.role === 'super_admin' ? `<button class="btn-action delete" data-action="delete-volunteer" data-id="${Number(v.id)}"><i class="fas fa-trash-alt"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function updateVolunteerStatus(id, status) {
  try {
    const res = await fetch(`/api/admin/volunteers/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await readAdminResponse(res, 'Could not update volunteer status.');
    showToast(data.message || `Volunteer status updated to ${status}.`, 'success');
    loadAdminVolunteers();
  } catch (err) {
    showToast(err.message || 'Could not update volunteer status.', 'error');
  }
}

async function deleteVolunteerRecord(id) {
  if (confirm('Delete this volunteer application?')) {
    try {
      const res = await fetch(`/api/admin/volunteers/${id}`, { method: 'DELETE' });
      const data = await readAdminResponse(res, 'Could not delete volunteer application.');
      showToast(data.message || 'Application deleted.', 'success');
      loadAdminVolunteers();
    } catch (err) {
      showToast(err.message || 'Could not delete volunteer application.', 'error');
    }
  }
}

// ==========================================================================
// 11. MESSAGES & INQUIRIES
// ==========================================================================
async function loadAdminMessages() {
  const tbody = document.getElementById('admin-messages-tbody');
  try {
    const res = await fetch('/api/admin/messages');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    tbody.innerHTML = data.data.map(msg => `
      <tr style="${!msg.is_read ? 'background: #F0FDF4; font-weight: 600;' : ''}">
        <td><strong>${escapeHtml(msg.name)}</strong></td>
        <td>${escapeHtml(msg.email)}<br><small>${escapeHtml(msg.phone || '')}</small></td>
        <td>${escapeHtml(msg.subject || 'Inquiry')}</td>
        <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(msg.message)}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <a href="mailto:${escapeHtml(msg.email)}?subject=RE%3A%20${encodeURIComponent(msg.subject || 'Ereto Namunyak Inquiry')}" class="btn btn-outline btn-sm" title="Reply via Email"><i class="fas fa-reply"></i></a>
            <button class="btn btn-outline btn-sm" data-action="mark-message-read" data-id="${Number(msg.id)}" title="Mark Read"><i class="fas fa-envelope-open"></i></button>
            ${currentAdminUser?.role === 'super_admin' ? `<button class="btn-action delete" data-action="delete-message" data-id="${Number(msg.id)}"><i class="fas fa-trash-alt"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function markMsgRead(id) {
  try {
    const res = await fetch(`/api/admin/messages/${id}/read`, { method: 'PUT' });
    const data = await readAdminResponse(res, 'Could not mark message as read.');
    showToast(data.message || 'Message marked as read.', 'success');
    loadAdminMessages();
  } catch (err) {
    showToast(err.message || 'Could not mark message as read.', 'error');
  }
}

async function deleteContactMsg(id) {
  if (confirm('Delete this message?')) {
    try {
      const res = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
      const data = await readAdminResponse(res, 'Could not delete message.');
      showToast(data.message || 'Message deleted.', 'success');
      loadAdminMessages();
    } catch (err) {
      showToast(err.message || 'Could not delete message.', 'error');
    }
  }
}

// ==========================================================================
// 12. WEBSITE SETTINGS
// ==========================================================================
async function loadAdminSettings() {
  try {
    const res = await fetch('/api/admin/settings');
    const data = await readAdminResponse(res);
    if (!data.success || !data.data) return;

    const s = data.data;
    if (document.getElementById('setting-site-name')) document.getElementById('setting-site-name').value = s.site_name || '';
    if (document.getElementById('setting-tagline')) document.getElementById('setting-tagline').value = s.site_tagline || '';
    if (document.getElementById('setting-email')) document.getElementById('setting-email').value = s.contact_email || '';
    if (document.getElementById('setting-phone')) document.getElementById('setting-phone').value = s.contact_phone || '';
    if (document.getElementById('setting-address')) document.getElementById('setting-address').value = s.contact_address || '';
    if (document.getElementById('setting-reg-num')) document.getElementById('setting-reg-num').value = s.reg_number || '';
    if (document.getElementById('setting-hero-title')) document.getElementById('setting-hero-title').value = s.hero_title || '';
    if (document.getElementById('setting-hero-desc')) document.getElementById('setting-hero-desc').value = s.hero_subtitle || '';
    if (document.getElementById('setting-stat-trees')) document.getElementById('setting-stat-trees').value = s.stats_trees || '';
    if (document.getElementById('setting-stat-students')) document.getElementById('setting-stat-students').value = s.stats_students || '';
    if (document.getElementById('setting-stat-women')) document.getElementById('setting-stat-women').value = s.stats_women || '';
    if (document.getElementById('setting-stat-pwsn')) document.getElementById('setting-stat-pwsn').value = s.stats_pwsn || '';
  } catch (err) {
    console.error(err);
  }
}

async function saveAdminSettings(e) {
  e.preventDefault();
  const payload = {
    site_name: document.getElementById('setting-site-name')?.value,
    site_tagline: document.getElementById('setting-tagline')?.value,
    contact_email: document.getElementById('setting-email')?.value,
    contact_phone: document.getElementById('setting-phone')?.value,
    contact_address: document.getElementById('setting-address')?.value,
    reg_number: document.getElementById('setting-reg-num')?.value,
    hero_title: document.getElementById('setting-hero-title')?.value,
    hero_subtitle: document.getElementById('setting-hero-desc')?.value,
    stats_trees: document.getElementById('setting-stat-trees')?.value,
    stats_students: document.getElementById('setting-stat-students')?.value,
    stats_women: document.getElementById('setting-stat-women')?.value,
    stats_pwsn: document.getElementById('setting-stat-pwsn')?.value
  };

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await readAdminResponse(res, 'Failed to save settings.');
    showToast(data.message || 'Settings saved.', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to save settings.', 'error');
  }
}

// ==========================================================================
// 13. USER & ROLE MANAGEMENT (Super Admin Only)
// ==========================================================================
async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  try {
    const res = await fetch('/api/admin/users');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    tbody.innerHTML = data.data.map(u => `
      <tr>
        <td><strong>${escapeHtml(u.name)}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge badge-primary">${escapeHtml(formatRoleName(u.role))}</span></td>
        <td><span class="status-pill ${escapeHtml(u.status)}">${escapeHtml(u.status)}</span></td>
        <td>${u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-KE') : 'Never'}</td>
        <td>
          <button class="btn btn-outline btn-sm" data-action="toggle-user-status" data-id="${Number(u.id)}">
            ${u.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

function openAddUserModal() {
  document.getElementById('user-form').reset();
  document.getElementById('user-modal').classList.add('open');
}

async function saveUserForm(e) {
  e.preventDefault();
  const form = document.getElementById('user-form');
  const payload = {
    name: form.elements.namedItem('name').value.trim(),
    email: form.elements.namedItem('email').value.trim(),
    password: form.elements.namedItem('password').value,
    role: form.elements.namedItem('role').value,
    phone: form.elements.namedItem('phone').value.trim()
  };

  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await readAdminResponse(res, 'Could not create administrator account.');
    if (data.success) {
      showToast(data.message, 'success');
      document.getElementById('user-modal').classList.remove('open');
      loadAdminUsers();
    } else {
      showToast(data.message || 'Creation failed', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Could not create admin user', 'error');
  }
}

async function toggleUserStatus(id) {
  try {
    const res = await fetch(`/api/admin/users/${id}/toggle-status`, { method: 'POST' });
    const data = await readAdminResponse(res, 'Status toggle failed.');
    showToast(data.message || 'Account status updated.', 'success');
    loadAdminUsers();
  } catch (err) {
    showToast(err.message || 'Failed to toggle status.', 'error');
  }
}

// ==========================================================================
// 14. ACTIVITY LOGS
// ==========================================================================
async function loadAdminLogs() {
  const tbody = document.getElementById('admin-logs-tbody');
  try {
    const res = await fetch('/api/admin/activity-logs');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    tbody.innerHTML = data.data.map(log => `
      <tr>
        <td>${new Date(log.created_at).toLocaleString('en-KE')}</td>
        <td><strong>${escapeHtml(log.user_email || 'System')}</strong></td>
        <td><span class="badge badge-outline">${escapeHtml(log.action)}</span></td>
        <td>${escapeHtml(log.details || '')}</td>
        <td><small>${escapeHtml(log.ip_address || '')}</small></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// ==========================================================================
// 15. MEDIA LIBRARY
// ==========================================================================
async function loadAdminMedia() {
  const grid = document.getElementById('admin-media-grid');
  try {
    const res = await fetch('/api/admin/media');
    const data = await readAdminResponse(res);
    if (!data.success) return;

    grid.innerHTML = data.data.map(f => `
      <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #fff; text-align: center; padding: 10px;">
        <img src="${escapeHtml(safeImageUrl(f.url))}" alt="${escapeHtml(f.name)}" style="height: 120px; width: 100%; object-fit: cover; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 8px;">${escapeHtml(f.name)}</div>
        <button class="btn btn-outline btn-sm" data-copy-media-url="${escapeHtml(safeImageUrl(f.url))}" style="font-size: 0.75rem; padding: 4px 10px;">
          <i class="fas fa-copy"></i> Copy URL
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function copyMediaUrl(url) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
    } else {
      const input = document.createElement('textarea');
      input.value = url;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand('copy');
      input.remove();
      if (!copied) throw new Error('Clipboard access is unavailable in this browser.');
    }
    showToast(`Copied image URL to clipboard: ${url}`, 'success');
  } catch (err) {
    showToast(err.message || 'Could not copy the image URL.', 'error');
  }
}

async function uploadDirectMedia(event) {
  const input = event.currentTarget || event.target;
  const file = input?.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  showToast('Uploading image...', 'info');

  try {
    const response = await fetch('/api/admin/media/upload', { method: 'POST', body: formData });
    const data = await readAdminResponse(response, 'Image upload failed.');
    showToast(data.message || 'Image uploaded to the media library.', 'success');
    await loadAdminMedia();
  } catch (err) {
    showToast(err.message || 'Error uploading image.', 'error');
  } finally {
    if (input) input.value = '';
  }
}

// Close any admin modal when clicking backdrop or close buttons
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('admin-modal') || e.target.classList.contains('admin-modal-close')) {
    document.querySelectorAll('.admin-modal').forEach(m => m.classList.remove('open'));
  }
});
