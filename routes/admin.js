/**
 * Ereto Namunyak CBO - Protected Admin REST API Router
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const adminController = require('../controllers/adminController');
const projectController = require('../controllers/projectController');
const teamController = require('../controllers/teamController');
const contentController = require('../controllers/contentController');
const donationController = require('../controllers/donationController');
const formController = require('../controllers/formController');

// Protect all admin API routes with authentication
router.use(requireAuth);

// -------------------------------------------------------------
// Dashboard & Analytics
// -------------------------------------------------------------
router.get('/analytics', adminController.getDashboardAnalytics);
router.get('/activity-logs', adminController.getActivityLogs);

// -------------------------------------------------------------
// Media Library & Upload
// -------------------------------------------------------------
router.get('/media', adminController.getMediaFiles);
router.post('/media/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  return res.json({
    success: true,
    message: 'File uploaded successfully.',
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

// -------------------------------------------------------------
// Project Management
// -------------------------------------------------------------
router.get('/projects', projectController.getAdminProjects);
router.post('/projects', requireRole('super_admin', 'content_admin', 'editor'), upload.single('cover_image'), projectController.createProject);
router.put('/projects/:id', requireRole('super_admin', 'content_admin', 'editor'), upload.single('cover_image'), projectController.updateProject);
router.delete('/projects/:id', requireRole('super_admin', 'content_admin'), projectController.deleteProject);

// -------------------------------------------------------------
// Team Management
// -------------------------------------------------------------
router.get('/team', teamController.getAdminTeam);
router.post('/team', requireRole('super_admin', 'content_admin'), upload.single('photo'), teamController.createTeamMember);
router.put('/team/:id', requireRole('super_admin', 'content_admin'), upload.single('photo'), teamController.updateTeamMember);
router.delete('/team/:id', requireRole('super_admin', 'content_admin'), teamController.deleteTeamMember);

// -------------------------------------------------------------
// Mission Areas
// -------------------------------------------------------------
router.get('/mission', contentController.getAdminMissionAreas);
router.post('/mission', requireRole('super_admin', 'content_admin'), upload.single('image'), contentController.createMissionArea);
router.put('/mission/:id', requireRole('super_admin', 'content_admin'), upload.single('image'), contentController.updateMissionArea);
router.delete('/mission/:id', requireRole('super_admin', 'content_admin'), contentController.deleteMissionArea);

// -------------------------------------------------------------
// News & Articles
// -------------------------------------------------------------
router.get('/news', contentController.getAdminNews);
router.post('/news', requireRole('super_admin', 'content_admin', 'editor'), upload.single('cover_image'), contentController.createNews);
router.put('/news/:id', requireRole('super_admin', 'content_admin', 'editor'), upload.single('cover_image'), contentController.updateNews);
router.delete('/news/:id', requireRole('super_admin', 'content_admin'), contentController.deleteNews);

// -------------------------------------------------------------
// Events
// -------------------------------------------------------------
router.get('/events', contentController.getAdminEvents);
router.post('/events', requireRole('super_admin', 'content_admin'), upload.single('cover_image'), contentController.createEvent);
router.put('/events/:id', requireRole('super_admin', 'content_admin'), upload.single('cover_image'), contentController.updateEvent);
router.delete('/events/:id', requireRole('super_admin', 'content_admin'), contentController.deleteEvent);

// -------------------------------------------------------------
// Photo Gallery
// -------------------------------------------------------------
router.get('/gallery', contentController.getAdminGallery);
router.post('/gallery', requireRole('super_admin', 'content_admin'), upload.single('image'), contentController.createGalleryItem);
router.put('/gallery/:id', requireRole('super_admin', 'content_admin'), upload.single('image'), contentController.updateGalleryItem);
router.delete('/gallery/:id', requireRole('super_admin', 'content_admin'), contentController.deleteGalleryItem);

// -------------------------------------------------------------
// Donations & Transactions
// -------------------------------------------------------------
router.get('/donations', requireRole('super_admin', 'finance_admin'), donationController.getAdminDonations);
router.get('/transactions', requireRole('super_admin', 'finance_admin'), donationController.getAdminTransactions);

// -------------------------------------------------------------
// Members & Volunteers
// -------------------------------------------------------------
router.get('/members', formController.getMembers);
router.put('/members/:id/status', requireRole('super_admin', 'content_admin'), formController.updateMemberStatus);
router.delete('/members/:id', requireRole('super_admin'), formController.deleteMember);

router.get('/volunteers', formController.getVolunteers);
router.put('/volunteers/:id/status', requireRole('super_admin', 'content_admin'), formController.updateVolunteerStatus);
router.delete('/volunteers/:id', requireRole('super_admin'), formController.deleteVolunteer);

// -------------------------------------------------------------
// Messages & Subscribers
// -------------------------------------------------------------
router.get('/messages', formController.getMessages);
router.put('/messages/:id/read', formController.markMessageRead);
router.delete('/messages/:id', requireRole('super_admin'), formController.deleteMessage);
router.get('/subscribers', formController.getSubscribers);

// -------------------------------------------------------------
// Global Settings
// -------------------------------------------------------------
router.get('/settings', contentController.getSettings);
router.post('/settings', requireRole('super_admin'), contentController.updateSettings);

// -------------------------------------------------------------
// User & Role Management (Super Admin Only)
// -------------------------------------------------------------
router.get('/users', requireRole('super_admin'), adminController.getUsers);
router.post('/users', requireRole('super_admin'), adminController.createUser);
router.put('/users/:id', requireRole('super_admin'), adminController.updateUser);
router.post('/users/:id/toggle-status', requireRole('super_admin'), adminController.toggleUserStatus);

module.exports = router;
