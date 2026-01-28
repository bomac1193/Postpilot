const mongoose = require('mongoose');

const gridSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Profile this grid belongs to (optional for backward compatibility)
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    index: true
  },
  name: {
    type: String,
    required: true,
    default: 'Untitled Grid'
  },
  platform: {
    type: String,
    enum: ['instagram', 'tiktok', 'both'],
    default: 'instagram'
  },
  columns: {
    type: Number,
    default: 3,
    min: 1,
    max: 9
  },
  cells: [{
    position: {
      row: Number,
      col: Number
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content'
    },
    isEmpty: {
      type: Boolean,
      default: true
    },
    crop: {
      scale: { type: Number, default: 1 },
      offsetX: { type: Number, default: 0 },
      offsetY: { type: Number, default: 0 }
    }
  }],
  totalRows: {
    type: Number,
    default: 3
  },
  description: String,
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
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

// Update the updatedAt timestamp before saving
gridSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Grid', gridSchema);
