const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Profile = require('../models/Profile');

/**
 * Social Media Posting Service
 * Handles posting to Instagram and TikTok platforms
 */

class SocialMediaService {
  /**
   * Get credentials for a profile, resolving to profile's own or parent's credentials
   * @param {string} profileId - Profile ID
   * @param {string} platform - 'instagram' or 'tiktok'
   * @returns {Promise<Object>} Credentials object or null
   */
  async getCredentialsForProfile(profileId, platform) {
    try {
      const profile = await Profile.findById(profileId);
      if (!profile) {
        return null;
      }

      return await profile.getEffectiveConnection(platform);
    } catch (error) {
      console.error('Get credentials for profile error:', error);
      return null;
    }
  }

  /**
   * Post content using profile credentials (resolves to profile or parent user)
   * @param {string} profileId - Profile ID
   * @param {Object} content - Content document to post
   * @param {Object} options - Posting options
   * @returns {Promise<Object>} Post result
   */
  async postWithProfile(profileId, content, options = {}) {
    const profile = await Profile.findById(profileId).populate('userId');
    if (!profile) {
      throw new Error('Profile not found');
    }

    const platform = options.platform || content.platform || 'instagram';
    const credentials = await this.getCredentialsForProfile(profileId, platform);

    if (!credentials || !credentials.connected) {
      throw new Error(`${platform} is not connected for this profile`);
    }

    // Create a mock user object with the resolved credentials
    const userWithCredentials = {
      socialAccounts: {
        [platform]: {
          connected: credentials.connected,
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          userId: credentials.userId,
          username: credentials.username,
          expiresAt: credentials.expiresAt
        }
      }
    };

    if (platform === 'instagram') {
      return await this.postToInstagram(userWithCredentials, content, options);
    } else if (platform === 'tiktok') {
      return await this.postToTikTok(userWithCredentials, content, options);
    } else if (platform === 'both') {
      return await this.postToBothWithProfile(profileId, content, options);
    }

    throw new Error(`Unsupported platform: ${platform}`);
  }

  /**
   * Post to both platforms using profile credentials
   */
  async postToBothWithProfile(profileId, content, options = {}) {
    const results = {
      instagram: null,
      tiktok: null,
      errors: []
    };

    // Post to Instagram
    try {
      results.instagram = await this.postWithProfile(profileId, content, { ...options, platform: 'instagram' });
    } catch (error) {
      results.errors.push({ platform: 'instagram', error: error.message });
    }

    // Post to TikTok
    try {
      results.tiktok = await this.postWithProfile(profileId, content, { ...options, platform: 'tiktok' });
    } catch (error) {
      results.errors.push({ platform: 'tiktok', error: error.message });
    }

    return results;
  }

  /**
   * Post content to Instagram
   * @param {Object} user - User document with Instagram credentials
   * @param {Object} content - Content document to post
   * @param {Object} options - Posting options (caption, location, etc.)
   * @returns {Promise<Object>} Post result with post ID and URL
   */
  async postToInstagram(user, content, options = {}) {
    try {
      if (!user.socialAccounts.instagram.connected) {
        throw new Error('Instagram account not connected');
      }

      if (!user.socialAccounts.instagram.accessToken) {
        throw new Error('Instagram access token missing');
      }

      // Check if token is expired
      if (user.socialAccounts.instagram.expiresAt < new Date()) {
        throw new Error('Instagram access token expired. Please reconnect your account.');
      }

      const accessToken = user.socialAccounts.instagram.accessToken;
      const userId = user.socialAccounts.instagram.userId;

      // Determine media type and post accordingly
      if (content.mediaType === 'image') {
        return await this.postInstagramImage(userId, accessToken, content, options);
      } else if (content.mediaType === 'video') {
        return await this.postInstagramVideo(userId, accessToken, content, options);
      } else if (content.mediaType === 'carousel') {
        return await this.postInstagramCarousel(userId, accessToken, content, options);
      } else {
        throw new Error(`Unsupported media type: ${content.mediaType}`);
      }
    } catch (error) {
      console.error('Instagram posting error:', error);
      throw error;
    }
  }

  /**
   * Post image to Instagram
   */
  async postInstagramImage(userId, accessToken, content, options) {
    try {
      // Step 1: Create media container
      const containerResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${userId}/media`,
        {
          image_url: this.getPublicMediaUrl(content.mediaUrl),
          caption: options.caption || content.caption || '',
          access_token: accessToken
        }
      );

      const creationId = containerResponse.data.id;

      // Step 2: Publish the media container
      const publishResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${userId}/media_publish`,
        {
          creation_id: creationId,
          access_token: accessToken
        }
      );

      const postId = publishResponse.data.id;

      // Step 3: Get post permalink
      const permalinkResponse = await axios.get(
        `https://graph.instagram.com/v18.0/${postId}`,
        {
          params: {
            fields: 'permalink',
            access_token: accessToken
          }
        }
      );

      return {
        success: true,
        platform: 'instagram',
        postId: postId,
        postUrl: permalinkResponse.data.permalink,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Instagram image post error:', error.response?.data || error);
      throw new Error(`Instagram posting failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Post video to Instagram
   */
  async postInstagramVideo(userId, accessToken, content, options) {
    try {
      // Step 1: Create video container
      const containerResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${userId}/media`,
        {
          media_type: 'VIDEO',
          video_url: this.getPublicMediaUrl(content.mediaUrl),
          caption: options.caption || content.caption || '',
          access_token: accessToken
        }
      );

      const creationId = containerResponse.data.id;

      // Step 2: Wait for video processing (poll status)
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 20; // Max 2 minutes (20 * 6 seconds)

      while (!isReady && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds

        const statusResponse = await axios.get(
          `https://graph.instagram.com/v18.0/${creationId}`,
          {
            params: {
              fields: 'status_code',
              access_token: accessToken
            }
          }
        );

        const statusCode = statusResponse.data.status_code;

        if (statusCode === 'FINISHED') {
          isReady = true;
        } else if (statusCode === 'ERROR') {
          throw new Error('Video processing failed');
        }

        attempts++;
      }

      if (!isReady) {
        throw new Error('Video processing timeout');
      }

      // Step 3: Publish the video
      const publishResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${userId}/media_publish`,
        {
          creation_id: creationId,
          access_token: accessToken
        }
      );

      const postId = publishResponse.data.id;

      // Step 4: Get post permalink
      const permalinkResponse = await axios.get(
        `https://graph.instagram.com/v18.0/${postId}`,
        {
          params: {
            fields: 'permalink',
            access_token: accessToken
          }
        }
      );

      return {
        success: true,
        platform: 'instagram',
        postId: postId,
        postUrl: permalinkResponse.data.permalink,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Instagram video post error:', error.response?.data || error);
      throw new Error(`Instagram video posting failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Post carousel to Instagram
   */
  async postInstagramCarousel(userId, accessToken, content, options) {
    // Carousel posting requires multiple media items
    // This is a placeholder - implement based on your content structure
    throw new Error('Carousel posting not yet implemented');
  }

  /**
   * Post content to TikTok
   * @param {Object} user - User document with TikTok credentials
   * @param {Object} content - Content document to post
   * @param {Object} options - Posting options
   * @returns {Promise<Object>} Post result
   */
  async postToTikTok(user, content, options = {}) {
    try {
      if (!user.socialAccounts.tiktok.connected) {
        throw new Error('TikTok account not connected');
      }

      if (!user.socialAccounts.tiktok.accessToken) {
        throw new Error('TikTok access token missing');
      }

      const accessToken = user.socialAccounts.tiktok.accessToken;

      // TikTok only supports video content
      if (content.mediaType !== 'video') {
        throw new Error('TikTok only supports video content');
      }

      // Step 1: Initialize video upload
      const initResponse = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
          post_info: {
            title: options.caption || content.caption || content.title,
            privacy_level: options.privacyLevel || 'MUTUAL_FOLLOW_FRIENDS',
            disable_duet: options.disableDuet || false,
            disable_comment: options.disableComment || false,
            disable_stitch: options.disableStitch || false,
            video_cover_timestamp_ms: 1000
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: content.fileSize || 0,
            chunk_size: 10000000, // 10MB chunks
            total_chunk_count: 1
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8'
          }
        }
      );

      const publishId = initResponse.data.data.publish_id;
      const uploadUrl = initResponse.data.data.upload_url;

      // Step 2: Upload video file
      const videoBuffer = fs.readFileSync(content.mediaUrl);

      await axios.put(uploadUrl, videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoBuffer.length
        }
      });

      // Step 3: Check publish status
      let publishComplete = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!publishComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await axios.post(
          'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
          {
            publish_id: publishId
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=UTF-8'
            }
          }
        );

        const status = statusResponse.data.data.status;

        if (status === 'PUBLISH_COMPLETE') {
          publishComplete = true;
        } else if (status === 'FAILED') {
          throw new Error('TikTok publish failed');
        }

        attempts++;
      }

      if (!publishComplete) {
        throw new Error('TikTok publish timeout');
      }

      return {
        success: true,
        platform: 'tiktok',
        postId: publishId,
        postUrl: `https://www.tiktok.com/@${user.socialAccounts.tiktok.username}/video/${publishId}`,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('TikTok posting error:', error.response?.data || error);
      throw new Error(`TikTok posting failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Post to both platforms
   */
  async postToBoth(user, content, options = {}) {
    const results = {
      instagram: null,
      tiktok: null,
      errors: []
    };

    // Post to Instagram
    try {
      results.instagram = await this.postToInstagram(user, content, options);
    } catch (error) {
      results.errors.push({ platform: 'instagram', error: error.message });
    }

    // Post to TikTok
    try {
      results.tiktok = await this.postToTikTok(user, content, options);
    } catch (error) {
      results.errors.push({ platform: 'tiktok', error: error.message });
    }

    return results;
  }

  /**
   * Get public URL for media (for Instagram API)
   * Note: Instagram requires publicly accessible URLs
   */
  getPublicMediaUrl(mediaPath) {
    // If already a full URL, return as is
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
      return mediaPath;
    }

    // Construct public URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/${path.basename(mediaPath)}`;
  }

  /**
   * Refresh Instagram access token
   */
  async refreshInstagramToken(user) {
    try {
      const currentToken = user.socialAccounts.instagram.accessToken;

      const response = await axios.get(
        'https://graph.instagram.com/refresh_access_token',
        {
          params: {
            grant_type: 'ig_refresh_token',
            access_token: currentToken
          }
        }
      );

      const newToken = response.data.access_token;
      const expiresIn = response.data.expires_in;

      // Update user token
      user.socialAccounts.instagram.accessToken = newToken;
      user.socialAccounts.instagram.expiresAt = new Date(Date.now() + expiresIn * 1000);
      await user.save();

      return newToken;
    } catch (error) {
      console.error('Instagram token refresh error:', error);
      throw error;
    }
  }

  /**
   * Validate social media credentials before posting
   */
  async validateCredentials(user, platform) {
    if (platform === 'instagram' || platform === 'both') {
      if (!user.socialAccounts.instagram.connected) {
        return { valid: false, error: 'Instagram not connected' };
      }

      if (user.socialAccounts.instagram.expiresAt < new Date()) {
        return { valid: false, error: 'Instagram token expired', needsRefresh: true };
      }
    }

    if (platform === 'tiktok' || platform === 'both') {
      if (!user.socialAccounts.tiktok.connected) {
        return { valid: false, error: 'TikTok not connected' };
      }
    }

    return { valid: true };
  }
}

module.exports = new SocialMediaService();
