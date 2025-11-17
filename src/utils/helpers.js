/**
 * Utility helper functions for PostPilot
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize filename for safe storage
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

/**
 * Generate random string for unique identifiers
 */
const generateRandomString = (length = 16) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format file size for display
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Calculate optimal posting time based on platform
 */
const getOptimalPostingTime = (platform = 'instagram') => {
  const times = {
    instagram: {
      weekdays: ['11:00 AM', '1:00 PM', '7:00 PM'],
      weekends: ['10:00 AM', '2:00 PM', '5:00 PM']
    },
    tiktok: {
      weekdays: ['6:00 AM', '12:00 PM', '9:00 PM'],
      weekends: ['9:00 AM', '3:00 PM', '8:00 PM']
    }
  };

  const isWeekend = new Date().getDay() % 6 === 0;
  const platformTimes = times[platform] || times.instagram;

  return isWeekend ? platformTimes.weekends : platformTimes.weekdays;
};

/**
 * Validate hashtag format
 */
const isValidHashtag = (hashtag) => {
  // Hashtags should start with #, contain only alphanumeric and underscores
  const hashtagRegex = /^#[a-zA-Z0-9_]+$/;
  return hashtagRegex.test(hashtag);
};

/**
 * Extract hashtags from caption text
 */
const extractHashtags = (caption) => {
  if (!caption) return [];
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  return caption.match(hashtagRegex) || [];
};

/**
 * Calculate caption engagement potential
 */
const calculateCaptionScore = (caption) => {
  if (!caption) return 0;

  let score = 0;

  // Length (optimal: 125-150 chars for Instagram)
  if (caption.length >= 125 && caption.length <= 150) score += 20;
  else if (caption.length > 0) score += 10;

  // Contains question
  if (caption.includes('?')) score += 15;

  // Contains call-to-action words
  const ctaWords = ['comment', 'share', 'tag', 'follow', 'like', 'click', 'link', 'swipe'];
  const hasCallToAction = ctaWords.some(word =>
    caption.toLowerCase().includes(word)
  );
  if (hasCallToAction) score += 20;

  // Contains emojis
  const emojiRegex = /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u;
  if (emojiRegex.test(caption)) score += 15;

  // Has hashtags
  const hashtags = extractHashtags(caption);
  if (hashtags.length >= 3 && hashtags.length <= 15) score += 20;
  else if (hashtags.length > 0) score += 10;

  // Line breaks (makes reading easier)
  if (caption.includes('\n')) score += 10;

  return Math.min(100, score);
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(date).toLocaleDateString('en-US', options);
};

/**
 * Get relative time string (e.g., "2 hours ago")
 */
const getRelativeTime = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
};

/**
 * Validate content type
 */
const isValidContentType = (type) => {
  const validTypes = ['image', 'video', 'carousel'];
  return validTypes.includes(type);
};

/**
 * Get file extension from filename
 */
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Check if file is an image
 */
const isImageFile = (filename) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];
  const ext = getFileExtension(filename).toLowerCase();
  return imageExtensions.includes(ext);
};

/**
 * Check if file is a video
 */
const isVideoFile = (filename) => {
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
  const ext = getFileExtension(filename).toLowerCase();
  return videoExtensions.includes(ext);
};

/**
 * Generate slug from text
 */
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

/**
 * Truncate text with ellipsis
 */
const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Calculate percentage
 */
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Clamp number between min and max
 */
const clamp = (num, min, max) => {
  return Math.min(Math.max(num, min), max);
};

module.exports = {
  isValidEmail,
  sanitizeFilename,
  generateRandomString,
  formatFileSize,
  getOptimalPostingTime,
  isValidHashtag,
  extractHashtags,
  calculateCaptionScore,
  formatDate,
  getRelativeTime,
  isValidContentType,
  getFileExtension,
  isImageFile,
  isVideoFile,
  generateSlug,
  truncateText,
  calculatePercentage,
  clamp
};
