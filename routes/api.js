/**
 * Ereto Namunyak CBO - Public REST API Router
 */

const express = require('express');
const router = express.Router();
const { authLimiter, apiLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');
const projectController = require('../controllers/projectController');
const teamController = require('../controllers/teamController');
const contentController = require('../controllers/contentController');
const formController = require('../controllers/formController');
const donationController = require('../controllers/donationController');

// Apply general API rate limiter
router.use(apiLimiter);

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
router.post('/auth/login', authLimiter, authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', authController.getCurrentUser);
router.post('/auth/forgot-password', authLimiter, authController.forgotPassword);
router.post('/auth/reset-password', authLimiter, authController.resetPassword);

// -------------------------------------------------------------
// Projects Endpoints
// -------------------------------------------------------------
router.get('/projects', projectController.getPublicProjects);
router.get('/projects/:identifier', projectController.getProjectDetails);
router.get('/categories', projectController.getCategories);

// -------------------------------------------------------------
// Team Members
// -------------------------------------------------------------
router.get('/team', teamController.getPublicTeam);

// -------------------------------------------------------------
// Content (Mission, News, Events, Gallery, Settings)
// -------------------------------------------------------------
router.get('/mission', contentController.getMissionAreas);
router.get('/news', contentController.getPublicNews);
router.get('/news/:slug', contentController.getNewsBySlug);
router.get('/events', contentController.getPublicEvents);
router.get('/gallery', contentController.getPublicGallery);
router.get('/settings', contentController.getSettings);

// -------------------------------------------------------------
// Forms (Membership, Volunteer, Contact, Newsletter)
// -------------------------------------------------------------
router.post('/forms/member', formController.submitMember);
router.post('/forms/volunteer', formController.submitVolunteer);
router.post('/forms/contact', formController.submitContact);
router.post('/forms/newsletter', formController.submitNewsletter);

// -------------------------------------------------------------
// Donations & Pesapal Integration
// -------------------------------------------------------------
router.post('/donations/pesapal-order', donationController.createDonationOrder);
router.get('/donations/verify-payment', donationController.verifyPayment);
// Support both GET and POST for Pesapal IPN notifications
router.all('/donations/pesapal-ipn', donationController.pesapalIpn);

module.exports = router;
