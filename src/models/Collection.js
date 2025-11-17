const mongoose = require('mongoose');

/**
 * Collection Model
 * A collection represents a planned grid/feed layout that can be scheduled for posting
 */
const collectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  platform: {
    type: String,
    enum: ['instagram', 'tiktok', 'both'],
    default: 'instagram',
    required: true
  },

  // Grid layout configuration
  gridConfig: {
    columns: {
      type: Number,
      default: 3,
      min: 1,
      max: 9
    },
    rows: {
      type: Number,
      default: 3,
      min: 1,
      max: 20
    },
    gridType: {
      type: String,
      enum: ['standard', 'reel'],
      default: 'standard'
    }
  },

  // Ordered content items in the collection
  items: [{
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true
    },
    position: {
      row: { type: Number, required: true },
      col: { type: Number, required: true }
    },
    order: Number, // For posting sequence
    posted: {
      type: Boolean,
      default: false
    },
    postedAt: Date,
    postId: String, // Platform-specific post ID
    postUrl: String // Direct link to post
  }],

  // Scheduling configuration
  scheduling: {
    enabled: {
      type: Boolean,
      default: false
    },
    startDate: Date,
    endDate: Date,
    interval: {
      type: String,
      enum: ['daily', 'every-other-day', 'weekly', 'custom'],
      default: 'daily'
    },
    customIntervalHours: Number,
    postingTimes: [{
      hour: Number,
      minute: Number,
      timezone: {
        type: String,
        default: 'UTC'
      }
    }],
    autoPost: {
      type: Boolean,
      default: false
    },
    postSequentially: {
      type: Boolean,
      default: true // Post items in order
    }
  },

  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'posting', 'completed', 'paused', 'failed'],
    default: 'draft'
  },

  // Statistics
  stats: {
    totalItems: {
      type: Number,
      default: 0
    },
    postedItems: {
      type: Number,
      default: 0
    },
    failedItems: {
      type: Number,
      default: 0
    },
    lastPostedAt: Date,
    nextPostAt: Date
  },

  // Settings
  settings: {
    isActive: {
      type: Boolean,
      default: true
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    allowReordering: {
      type: Boolean,
      default: true
    },
    autoDeleteAfterPosting: {
      type: Boolean,
      default: false
    }
  },

  // Tags for organization
  tags: [String],

  // Error tracking
  errors: [{
    timestamp: Date,
    itemIndex: Number,
    errorMessage: String,
    errorCode: String
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

// Indexes for better query performance
collectionSchema.index({ userId: 1, status: 1 });
collectionSchema.index({ 'scheduling.nextPostAt': 1 });
collectionSchema.index({ 'scheduling.enabled': 1, status: 1 });

// Update the updatedAt timestamp before saving
collectionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Update stats
  this.stats.totalItems = this.items.length;
  this.stats.postedItems = this.items.filter(item => item.posted).length;
  this.stats.failedItems = this.errors.length;

  next();
});

// Virtual for completion percentage
collectionSchema.virtual('completionPercentage').get(function() {
  if (this.stats.totalItems === 0) return 0;
  return Math.round((this.stats.postedItems / this.stats.totalItems) * 100);
});

// Virtual for remaining items
collectionSchema.virtual('remainingItems').get(function() {
  return this.stats.totalItems - this.stats.postedItems;
});

// Method to add content to collection
collectionSchema.methods.addContent = function(contentId, position) {
  const order = this.items.length;
  this.items.push({
    contentId,
    position,
    order,
    posted: false
  });
  return this.save();
};

// Method to remove content from collection
collectionSchema.methods.removeContent = function(contentId) {
  this.items = this.items.filter(
    item => item.contentId.toString() !== contentId.toString()
  );
  // Reorder remaining items
  this.items.forEach((item, index) => {
    item.order = index;
  });
  return this.save();
};

// Method to reorder content
collectionSchema.methods.reorderContent = function(contentId, newPosition) {
  const itemIndex = this.items.findIndex(
    item => item.contentId.toString() === contentId.toString()
  );

  if (itemIndex === -1) return;

  this.items[itemIndex].position = newPosition;
  return this.save();
};

// Method to mark item as posted
collectionSchema.methods.markAsPosted = function(contentId, postData) {
  const item = this.items.find(
    item => item.contentId.toString() === contentId.toString()
  );

  if (item) {
    item.posted = true;
    item.postedAt = new Date();
    item.postId = postData.postId;
    item.postUrl = postData.postUrl;

    this.stats.lastPostedAt = new Date();
  }

  return this.save();
};

// Method to calculate next post time
collectionSchema.methods.calculateNextPostTime = function() {
  if (!this.scheduling.enabled || !this.scheduling.startDate) {
    return null;
  }

  const now = new Date();
  let nextTime = new Date(this.scheduling.startDate);

  // If start date is in the past, calculate from last posted or now
  if (nextTime < now) {
    nextTime = this.stats.lastPostedAt ? new Date(this.stats.lastPostedAt) : now;
  }

  // Add interval
  switch (this.scheduling.interval) {
    case 'daily':
      nextTime.setDate(nextTime.getDate() + 1);
      break;
    case 'every-other-day':
      nextTime.setDate(nextTime.getDate() + 2);
      break;
    case 'weekly':
      nextTime.setDate(nextTime.getDate() + 7);
      break;
    case 'custom':
      if (this.scheduling.customIntervalHours) {
        nextTime.setHours(nextTime.getHours() + this.scheduling.customIntervalHours);
      }
      break;
  }

  // Set to specific posting time if configured
  if (this.scheduling.postingTimes && this.scheduling.postingTimes.length > 0) {
    const postingTime = this.scheduling.postingTimes[0];
    nextTime.setHours(postingTime.hour, postingTime.minute, 0, 0);
  }

  // Check if past end date
  if (this.scheduling.endDate && nextTime > this.scheduling.endDate) {
    return null;
  }

  return nextTime;
};

// Method to get next item to post
collectionSchema.methods.getNextItemToPost = function() {
  return this.items.find(item => !item.posted);
};

// Static method to find collections ready to post
collectionSchema.statics.findReadyToPost = function() {
  const now = new Date();

  return this.find({
    'scheduling.enabled': true,
    'scheduling.autoPost': true,
    status: { $in: ['scheduled', 'posting'] },
    'stats.nextPostAt': { $lte: now },
    'settings.isActive': true
  }).populate('items.contentId');
};

// Enable virtuals in JSON
collectionSchema.set('toJSON', { virtuals: true });
collectionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Collection', collectionSchema);
