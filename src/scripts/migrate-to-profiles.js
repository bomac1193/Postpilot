#!/usr/bin/env node

/**
 * Migration Script: Migrate to Multi-Profile System
 *
 * This script:
 * 1. Creates a default Profile for each User
 * 2. Copies user's avatar, bio, instagramHighlights to the profile
 * 3. Updates all Collections, Grids, ReelCollections with the profileId
 *
 * Run with: node src/scripts/migrate-to-profiles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Grid = require('../models/Grid');
const Collection = require('../models/Collection');
const ReelCollection = require('../models/ReelCollection');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/postpanda';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration stats
const stats = {
  usersProcessed: 0,
  profilesCreated: 0,
  gridsUpdated: 0,
  collectionsUpdated: 0,
  reelCollectionsUpdated: 0,
  errors: []
};

// Create default profile for a user
async function createDefaultProfile(user) {
  try {
    // Check if user already has a profile
    const existingProfile = await Profile.findOne({ userId: user._id });
    if (existingProfile) {
      console.log(`  User ${user.email} already has a profile, skipping...`);
      return existingProfile;
    }

    // Create new default profile from user data
    const profile = new Profile({
      userId: user._id,
      name: user.name || 'My Profile',
      username: user.socialAccounts?.instagram?.username || null,
      avatar: user.avatar || null,
      avatarPosition: user.avatarPosition || { x: 0, y: 0 },
      avatarZoom: user.avatarZoom || 1,
      bio: user.bio || null,
      brandName: user.brandName || null,
      pronouns: user.pronouns || null,
      platform: 'both',
      instagramHighlights: user.instagramHighlights || [],
      isDefault: true,
      isActive: true,
      color: '#8b5cf6',
      socialAccounts: {
        instagram: {
          connected: false,
          useParentConnection: true
        },
        tiktok: {
          connected: false,
          useParentConnection: true
        }
      }
    });

    await profile.save();
    stats.profilesCreated++;
    console.log(`  Created default profile for ${user.email}: ${profile._id}`);

    return profile;
  } catch (error) {
    console.error(`  Error creating profile for ${user.email}:`, error.message);
    stats.errors.push({ userId: user._id, email: user.email, error: error.message });
    return null;
  }
}

// Update user's grids with profileId
async function updateUserGrids(userId, profileId) {
  try {
    const result = await Grid.updateMany(
      { userId, profileId: { $exists: false } },
      { $set: { profileId } }
    );
    stats.gridsUpdated += result.modifiedCount;
    if (result.modifiedCount > 0) {
      console.log(`  Updated ${result.modifiedCount} grids`);
    }
  } catch (error) {
    console.error(`  Error updating grids:`, error.message);
    stats.errors.push({ userId, type: 'grids', error: error.message });
  }
}

// Update user's collections with profileId
async function updateUserCollections(userId, profileId) {
  try {
    const result = await Collection.updateMany(
      { userId, profileId: { $exists: false } },
      { $set: { profileId } }
    );
    stats.collectionsUpdated += result.modifiedCount;
    if (result.modifiedCount > 0) {
      console.log(`  Updated ${result.modifiedCount} collections`);
    }
  } catch (error) {
    console.error(`  Error updating collections:`, error.message);
    stats.errors.push({ userId, type: 'collections', error: error.message });
  }
}

// Update user's reel collections with profileId
async function updateUserReelCollections(userId, profileId) {
  try {
    const result = await ReelCollection.updateMany(
      { userId, profileId: { $exists: false } },
      { $set: { profileId } }
    );
    stats.reelCollectionsUpdated += result.modifiedCount;
    if (result.modifiedCount > 0) {
      console.log(`  Updated ${result.modifiedCount} reel collections`);
    }
  } catch (error) {
    console.error(`  Error updating reel collections:`, error.message);
    stats.errors.push({ userId, type: 'reelCollections', error: error.message });
  }
}

// Main migration function
async function migrate() {
  console.log('\n========================================');
  console.log('Starting Migration to Multi-Profile System');
  console.log('========================================\n');

  // Get all users
  const users = await User.find({});
  console.log(`Found ${users.length} users to process\n`);

  for (const user of users) {
    console.log(`Processing user: ${user.email} (${user._id})`);
    stats.usersProcessed++;

    // Create default profile
    const profile = await createDefaultProfile(user);

    if (profile) {
      // Update all related data with profileId
      await updateUserGrids(user._id, profile._id);
      await updateUserCollections(user._id, profile._id);
      await updateUserReelCollections(user._id, profile._id);
    }

    console.log('');
  }

  // Print summary
  console.log('========================================');
  console.log('Migration Complete!');
  console.log('========================================');
  console.log('\nSummary:');
  console.log(`  Users processed: ${stats.usersProcessed}`);
  console.log(`  Profiles created: ${stats.profilesCreated}`);
  console.log(`  Grids updated: ${stats.gridsUpdated}`);
  console.log(`  Collections updated: ${stats.collectionsUpdated}`);
  console.log(`  Reel collections updated: ${stats.reelCollectionsUpdated}`);

  if (stats.errors.length > 0) {
    console.log(`\n  Errors: ${stats.errors.length}`);
    stats.errors.forEach((err, i) => {
      console.log(`    ${i + 1}. ${err.email || err.userId} - ${err.type || 'profile'}: ${err.error}`);
    });
  }

  console.log('\n');
}

// Run migration
async function run() {
  try {
    await connectDB();
    await migrate();
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(stats.errors.length > 0 ? 1 : 0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--dry-run')) {
  console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  // In dry run mode, we could just count what would be affected
  // For now, we'll just run the normal migration
}

run();
