const mongoose = require('mongoose');

const reelCollectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Profile this reel collection belongs to (optional for backward compatibility)
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    index: true
  },
  name: {
    type: String,
    required: true,
    default: 'Untitled Collection'
  },
  platform: {
    type: String,
    enum: ['instagram', 'tiktok', 'both'],
    default: 'instagram'
  },
  description: {
    type: String,
    default: ''
  },
  // Array of reel references with order
  reels: [{
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content'
    },
    order: {
      type: Number,
      default: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Collection settings
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#8b5cf6'
  },
  tags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
reelCollectionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Add a reel to collection
reelCollectionSchema.methods.addReel = function(contentId) {
  const maxOrder = this.reels.length > 0
    ? Math.max(...this.reels.map(r => r.order))
    : -1;

  // Check if reel already exists
  const exists = this.reels.some(r => r.contentId.toString() === contentId.toString());
  if (!exists) {
    this.reels.push({
      contentId,
      order: maxOrder + 1,
      addedAt: new Date()
    });
  }
  return this;
};

// Remove a reel from collection
reelCollectionSchema.methods.removeReel = function(contentId) {
  this.reels = this.reels.filter(r => r.contentId.toString() !== contentId.toString());
  // Reorder remaining reels
  this.reels.forEach((r, i) => {
    r.order = i;
  });
  return this;
};

// Reorder reels
reelCollectionSchema.methods.reorderReels = function(reelIds) {
  const reorderedReels = [];
  console.log('[ReelCollection.reorderReels] Input reelIds:', reelIds);
  console.log('[ReelCollection.reorderReels] Current reels contentIds:', this.reels.map(r => r.contentId?.toString()));

  reelIds.forEach((id, index) => {
    const idStr = id?.toString() || id;
    const reel = this.reels.find(r => {
      const contentIdStr = r.contentId?.toString() || r.contentId;
      return contentIdStr === idStr;
    });
    if (reel) {
      reel.order = index;
      reorderedReels.push(reel);
      console.log(`[ReelCollection.reorderReels] Matched reel at index ${index}:`, idStr);
    } else {
      console.warn(`[ReelCollection.reorderReels] No match found for id:`, idStr);
    }
  });

  console.log('[ReelCollection.reorderReels] Reordered reels count:', reorderedReels.length);
  this.reels = reorderedReels;
  return this;
};

// Static method to find collections by user
reelCollectionSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ updatedAt: -1 });
};

const ReelCollection = mongoose.model('ReelCollection', reelCollectionSchema);

module.exports = ReelCollection;
