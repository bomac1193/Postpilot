const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const axios = require('axios');
const passport = require('../config/passport');

// Register new user
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = new User({ email, password, name });
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        socialAccounts: {
          instagram: { connected: user.socialAccounts.instagram.connected },
          tiktok: { connected: user.socialAccounts.tiktok.connected }
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    // In a JWT-based system, logout is handled client-side by removing the token
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Instagram OAuth - Initiate
exports.instagramAuth = (req, res) => {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/auth/instagram/callback';
  const scope = 'user_profile,user_media';

  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;

  res.redirect(authUrl);
};

// Instagram OAuth - Callback
exports.instagramCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const userId = req.user._id; // Assuming user is authenticated

    // Exchange code for access token
    const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', {
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/auth/instagram/callback',
      code
    });

    const { access_token, user_id } = tokenResponse.data;

    // Get long-lived token
    const longLivedResponse = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        access_token
      }
    });

    const longLivedToken = longLivedResponse.data.access_token;
    const expiresIn = longLivedResponse.data.expires_in;

    // Update user
    const user = await User.findById(userId);
    user.socialAccounts.instagram = {
      connected: true,
      accessToken: longLivedToken,
      userId: user_id,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    };
    await user.save();

    res.redirect('/?instagram=connected');
  } catch (error) {
    console.error('Instagram callback error:', error);
    res.redirect('/?instagram=error');
  }
};

// Disconnect Instagram
exports.disconnectInstagram = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.socialAccounts.instagram = {
      connected: false,
      accessToken: null,
      refreshToken: null,
      userId: null,
      username: null,
      expiresAt: null
    };
    await user.save();

    res.json({ message: 'Instagram disconnected successfully' });
  } catch (error) {
    console.error('Disconnect Instagram error:', error);
    res.status(500).json({ error: 'Failed to disconnect Instagram' });
  }
};

// TikTok OAuth - Initiate
exports.tiktokAuth = (req, res) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/auth/tiktok/callback';
  const scope = 'user.info.basic,video.list,video.upload';

  const csrfState = Math.random().toString(36).substring(7);
  req.session.csrfState = csrfState;

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}&state=${csrfState}`;

  res.redirect(authUrl);
};

// TikTok OAuth - Callback
exports.tiktokCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    // Verify CSRF state
    if (state !== req.session.csrfState) {
      return res.redirect('/?tiktok=error');
    }

    const userId = req.user._id;

    // Exchange code for access token
    const tokenResponse = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/auth/tiktok/callback'
    });

    const { access_token, refresh_token, expires_in, open_id } = tokenResponse.data;

    // Update user
    const user = await User.findById(userId);
    user.socialAccounts.tiktok = {
      connected: true,
      accessToken: access_token,
      refreshToken: refresh_token,
      userId: open_id,
      expiresAt: new Date(Date.now() + expires_in * 1000)
    };
    await user.save();

    res.redirect('/?tiktok=connected');
  } catch (error) {
    console.error('TikTok callback error:', error);
    res.redirect('/?tiktok=error');
  }
};

// Disconnect TikTok
exports.disconnectTiktok = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.socialAccounts.tiktok = {
      connected: false,
      accessToken: null,
      refreshToken: null,
      userId: null,
      username: null,
      expiresAt: null
    };
    await user.save();

    res.json({ message: 'TikTok disconnected successfully' });
  } catch (error) {
    console.error('Disconnect TikTok error:', error);
    res.status(500).json({ error: 'Failed to disconnect TikTok' });
  }
};

// Get social media connection status
exports.getSocialStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    res.json({
      instagram: {
        connected: user.socialAccounts.instagram.connected,
        username: user.socialAccounts.instagram.username
      },
      tiktok: {
        connected: user.socialAccounts.tiktok.connected,
        username: user.socialAccounts.tiktok.username
      }
    });
  } catch (error) {
    console.error('Get social status error:', error);
    res.status(500).json({ error: 'Failed to get social status' });
  }
};

// Google OAuth - Initiate (handled by passport)
exports.googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
});

// Google OAuth - Callback
exports.googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    try {
      if (err || !user) {
        console.error('Google auth error:', err || 'No user returned');
        return res.redirect('/?google=error');
      }

      // Generate JWT token
      const token = generateToken(user._id);

      // Redirect to frontend with token
      res.redirect(`/?google=success&token=${token}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect('/?google=error');
    }
  })(req, res, next);
};
