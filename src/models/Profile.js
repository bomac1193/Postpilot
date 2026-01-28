const mongoose = require('mongoose');

/**
 * Profile Model
 * Represents a social media profile/account that a user manages.
 * Users can have multiple profiles (e.g., different IG accounts, TikTok accounts).
 * Each profile has its own collections and grids, but shares the user's media library.
 */
const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Profile identity
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'My Profile'
  },
  username: {
    type: String,
    trim: true
  },
  avatar: {
    type: String // Cloudinary URL
  },
  avatarPosition: {
    type: Object,
    default: { x: 0, y: 0 }
  },
  avatarZoom: {
    type: Number,
    default: 1
  },
  bio: {
    type: String,
    maxlength: 500
  },

  // Platform this profile is primarily for
  platform: {
    type: String,
    enum: ['instagram', 'tiktok', 'both'],
    default: 'both'
  },

  // Social account connections - can override parent user's connections
  socialAccounts: {
    instagram: {
      connected: { type: Boolean, default: false },
      accessToken: String,
      refreshToken: String,
      userId: String,
      username: String,
      expiresAt: Date,
      // If true, use the parent User's Instagram connection instead
      useParentConnection: { type: Boolean, default: true }
    },
    tiktok: {
      connected: { type: Boolean, default: false },
      accessToken: String,
      refreshToken: String,
      userId: String,
      username: String,
      expiresAt: Date,
      // If true, use the parent User's TikTok connection instead
      useParentConnection: { type: Boolean, default: true }
    }
  },

  // Instagram highlights for this profile
  instagramHighlights: [{
    highlightId: { type: String, required: true },
    name: { type: String, default: 'New' },
    cover: { type: String, default: null }, // Cloudinary URL
    coverPosition: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    },
    coverZoom: { type: Number, default: 1 },
    stories: [{ type: String }]
  }],

  // Profile status flags
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // UI customization
  color: {
    type: String,
    default: '#8b5cf6' // Purple
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
profileSchema.index({ userId: 1, isDefault: 1 });
profileSchema.index({ userId: 1, isActive: 1 });

// Update timestamp on save
profileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure only one default profile per user
profileSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Unset isDefault on all other profiles for this user
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Static method to get or create default profile for a user
profileSchema.statics.getOrCreateDefault = async function(userId, userData = {}) {
  let profile = await this.findOne({ userId, isDefault: true });

  if (!profile) {
    // Check if any profile exists
    profile = await this.findOne({ userId });

    if (!profile) {
      // Create default profile from user data
      profile = new this({
        userId,
        name: userData.name || 'My Profile',
        username: userData.username || null,
        avatar: userData.avatar || null,
        bio: userData.bio || null,
        instagramHighlights: userData.instagramHighlights || [],
        isDefault: true,
        isActive: true,
        socialAccounts: {
          instagram: { useParentConnection: true },
          tiktok: { useParentConnection: true }
        }
      });
      await profile.save();
    } else {
      // Make existing profile the default
      profile.isDefault = true;
      await profile.save();
    }
  }

  return profile;
};

// Static method to get active profile for a user
profileSchema.statics.getActiveProfile = async function(userId) {
  // First try to find the last active profile (we could store this in user session)
  // For now, just return the default profile
  return this.findOne({ userId, isDefault: true });
};

// Instance method to check if profile has its own connection or uses parent
profileSchema.methods.getEffectiveConnection = async function(platform) {
  const User = mongoose.model('User');
  const account = this.socialAccounts[platform];

  if (!account) {
    return { connected: false, useParent: false };
  }

  // If profile has its own connection and it's not set to use parent
  if (account.connected && !account.useParentConnection) {
    return {
      connected: true,
      useParent: false,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      userId: account.userId,
      username: account.username,
      expiresAt: account.expiresAt
    };
  }

  // Otherwise, try to use parent user's connection
  const user = await User.findById(this.userId);
  if (user && user.socialAccounts[platform]?.connected) {
    return {
      connected: true,
      useParent: true,
      accessToken: user.socialAccounts[platform].accessToken,
      refreshToken: user.socialAccounts[platform].refreshToken,
      userId: user.socialAccounts[platform].userId,
      username: user.socialAccounts[platform].username,
      expiresAt: user.socialAccounts[platform].expiresAt
    };
  }

  return { connected: false, useParent: account.useParentConnection };
};

// Enable virtuals in JSON
profileSchema.set('toJSON', { virtuals: true });
profileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Profile', profileSchema);
