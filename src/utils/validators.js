/**
 * Input validation utilities for PostPilot
 */

const { isValidEmail } = require('./helpers');

/**
 * Validate user registration data
 */
const validateRegistration = (data) => {
  const errors = [];

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate login data
 */
const validateLogin = (data) => {
  const errors = [];

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password) {
    errors.push('Password is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate content data
 */
const validateContent = (data) => {
  const errors = [];

  if (!data.title || data.title.trim().length < 1) {
    errors.push('Title is required');
  }

  if (data.caption && data.caption.length > 2200) {
    errors.push('Caption must be less than 2200 characters');
  }

  const validPlatforms = ['instagram', 'tiktok'];
  if (data.platform && !validPlatforms.includes(data.platform)) {
    errors.push('Invalid platform. Must be instagram or tiktok');
  }

  const validTypes = ['image', 'video', 'carousel'];
  if (data.mediaType && !validTypes.includes(data.mediaType)) {
    errors.push('Invalid media type. Must be image, video, or carousel');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate grid data
 */
const validateGrid = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 1) {
    errors.push('Grid name is required');
  }

  if (!data.platform) {
    errors.push('Platform is required');
  }

  if (!data.columns || data.columns < 1 || data.columns > 6) {
    errors.push('Columns must be between 1 and 6');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate file upload
 */
const validateFileUpload = (file) => {
  const errors = [];
  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }

  if (file.size > maxSize) {
    errors.push('File size must be less than 100MB');
  }

  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  if (!allowedTypes.includes(file.mimetype)) {
    errors.push('Invalid file type. Allowed: JPG, PNG, GIF, WEBP, MP4, MOV, AVI');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate hashtags
 */
const validateHashtags = (hashtags) => {
  const errors = [];

  if (!Array.isArray(hashtags)) {
    errors.push('Hashtags must be an array');
    return { isValid: false, errors };
  }

  if (hashtags.length > 30) {
    errors.push('Maximum 30 hashtags allowed');
  }

  hashtags.forEach((tag, index) => {
    if (!tag.startsWith('#')) {
      errors.push(`Hashtag ${index + 1} must start with #`);
    }
    if (tag.length > 30) {
      errors.push(`Hashtag ${index + 1} is too long (max 30 characters)`);
    }
    if (!/^#[a-zA-Z0-9_]+$/.test(tag)) {
      errors.push(`Hashtag ${index + 1} contains invalid characters`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate schedule date
 */
const validateScheduleDate = (date) => {
  const errors = [];
  const scheduleDate = new Date(date);
  const now = new Date();

  if (isNaN(scheduleDate.getTime())) {
    errors.push('Invalid date format');
  } else if (scheduleDate < now) {
    errors.push('Schedule date must be in the future');
  }

  // Instagram/TikTok typically don't allow scheduling more than 30 days out
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);

  if (scheduleDate > maxDate) {
    errors.push('Cannot schedule more than 30 days in advance');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate ObjectId format
 */
const validateObjectId = (id) => {
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id);
};

/**
 * Sanitize user input (prevent XSS)
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};

/**
 * Validate environment variables
 */
const validateEnvVars = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'SESSION_SECRET'];
  const missing = [];

  required.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    console.warn('⚠️  Missing environment variables:', missing.join(', '));
    console.warn('⚠️  Some features may not work correctly');
  }

  return {
    isValid: missing.length === 0,
    missing
  };
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateContent,
  validateGrid,
  validateFileUpload,
  validateHashtags,
  validateScheduleDate,
  validateObjectId,
  sanitizeInput,
  validateEnvVars
};
