const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      // Password only required if not using OAuth
      return !this.googleId;
    }
  },
  name: {
    type: String,
    required: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values to be non-unique
  },
  avatar: {
    type: String
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  socialAccounts: {
    instagram: {
      connected: { type: Boolean, default: false },
      accessToken: String,
      refreshToken: String,
      userId: String,
      username: String,
      expiresAt: Date
    },
    tiktok: {
      connected: { type: Boolean, default: false },
      accessToken: String,
      refreshToken: String,
      userId: String,
      username: String,
      expiresAt: Date
    }
  },
  preferences: {
    defaultGridSize: { type: Number, default: 3 },
    theme: { type: String, default: 'light' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

// Hash password before saving (only for local auth)
userSchema.pre('save', async function(next) {
  // Skip hashing if password not modified or using OAuth
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
