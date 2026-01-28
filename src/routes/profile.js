const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const profileController = require('../controllers/profileController');

// All routes require authentication
router.use(authenticate);

/**
 * Profile CRUD operations
 */

// Get all profiles for user
router.get('/', profileController.getProfiles);

// Get current/active profile (creates default if none exists)
router.get('/current', profileController.getCurrentProfile);

// Get profile by ID
router.get('/:id', profileController.getProfileById);

// Create new profile
router.post('/', profileController.createProfile);

// Update profile
router.put('/:id', profileController.updateProfile);

// Delete profile (cannot delete last/only profile)
router.delete('/:id', profileController.deleteProfile);

/**
 * Profile activation
 */

// Set as current working profile
router.post('/:id/activate', profileController.activateProfile);

// Set as default profile
router.post('/:id/set-default', profileController.setDefaultProfile);

/**
 * Social connections for profiles
 */

// Get effective social connection status (considers parent fallback)
router.get('/:id/social/status', profileController.getSocialStatus);

// Instagram connection management
router.post('/:id/instagram/connect', profileController.connectInstagram);
router.post('/:id/instagram/use-parent', profileController.useParentInstagram);
router.post('/:id/instagram/disconnect', profileController.disconnectInstagram);

// TikTok connection management
router.post('/:id/tiktok/connect', profileController.connectTiktok);
router.post('/:id/tiktok/use-parent', profileController.useParentTiktok);
router.post('/:id/tiktok/disconnect', profileController.disconnectTiktok);

module.exports = router;
