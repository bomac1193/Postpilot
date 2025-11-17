const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy (only if credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        return done(null, user);
      }

      // Check if user exists with this email (local account)
      user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // Link Google account to existing local account
        user.googleId = profile.id;
        user.authProvider = 'google';
        user.avatar = profile.photos[0]?.value;
        user.lastLogin = new Date();
        await user.save();
        return done(null, user);
      }

      // Create new user
      user = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0]?.value,
        authProvider: 'google',
        lastLogin: new Date()
      });

      await user.save();
      done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      done(error, null);
    }
  }));
  console.log('✅ Google OAuth enabled');
} else {
  console.log('⚠️  Google OAuth disabled (missing credentials)');
}

module.exports = passport;
