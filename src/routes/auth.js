const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Local authentication
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/avatar', authenticate, upload.single('avatar'), authController.uploadAvatar);
router.post('/highlight-cover', authenticate, upload.single('cover'), authController.uploadHighlightCover);

// Google OAuth
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Instagram OAuth - Login (for signing in)
router.get('/instagram/login', authController.instagramAuthLogin);
router.get('/instagram/callback', authController.instagramLoginCallback);

// Instagram OAuth - Connect Account (for existing users)
router.get('/instagram/connect', authenticate, authController.instagramAuth);
router.get('/instagram/connect/callback', authenticate, authController.instagramCallback);
router.post('/instagram/disconnect', authenticate, authController.disconnectInstagram);

// TikTok OAuth
router.get('/tiktok', authController.tiktokAuth);
router.get('/tiktok/callback', authController.tiktokCallback);
router.post('/tiktok/disconnect', authenticate, authController.disconnectTiktok);

// Check social media connection status
router.get('/social/status', authenticate, authController.getSocialStatus);

module.exports = router;
