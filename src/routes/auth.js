const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Local authentication
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);

// Google OAuth
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Instagram OAuth
router.get('/instagram', authController.instagramAuth);
router.get('/instagram/callback', authController.instagramCallback);
router.post('/instagram/disconnect', authenticate, authController.disconnectInstagram);

// TikTok OAuth
router.get('/tiktok', authController.tiktokAuth);
router.get('/tiktok/callback', authController.tiktokCallback);
router.post('/tiktok/disconnect', authenticate, authController.disconnectTiktok);

// Check social media connection status
router.get('/social/status', authenticate, authController.getSocialStatus);

module.exports = router;
