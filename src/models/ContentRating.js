/**
 * Content Rating Model
 * Stores user ratings and feedback on AI-generated content
 * Used for Refyn-style taste learning
 */

const mongoose = require('mongoose');

const contentRatingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
  },
  // The generated content that was rated
  content: {
    variant: { type: String, required: true }, // The actual text
    hookType: String,
    tone: String,
    performanceScore: Number,
    tasteScore: Number,
  },
  // Rating details
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  // Optional feedback
  feedback: {
    liked: [String],    // What they liked: ['hook', 'tone', 'length', 'style']
    disliked: [String], // What they didn't like
    comment: String,    // Free-form feedback
  },
  // Context when rated
  context: {
    topic: String,
    platform: { type: String, enum: ['instagram', 'tiktok', 'youtube', 'linkedin'] },
    characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
    source: { type: String, enum: ['local', 'folio'], default: 'local' },
  },
  // Was this variant applied/used?
  wasApplied: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for querying user's ratings
contentRatingSchema.index({ userId: 1, createdAt: -1 });
contentRatingSchema.index({ userId: 1, rating: 1 });
contentRatingSchema.index({ userId: 1, 'context.platform': 1 });

module.exports = mongoose.model('ContentRating', contentRatingSchema);
