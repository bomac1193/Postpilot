#!/usr/bin/env node

/**
 * Final Verification Test for Multi-Profile System
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Grid = require('../models/Grid');

const TESTS = { passed: 0, failed: 0 };

function test(condition, name) {
  if (condition) {
    console.log(`\x1b[32m✓ ${name}\x1b[0m`);
    TESTS.passed++;
    return true;
  } else {
    console.log(`\x1b[31m✗ ${name}\x1b[0m`);
    TESTS.failed++;
    return false;
  }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/postpanda');
  console.log('\n\x1b[36m╔═══════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║   Multi-Profile System Final Verification     ║\x1b[0m');
  console.log('\x1b[36m╚═══════════════════════════════════════════════╝\x1b[0m\n');

  const testUser = await User.findOne({ email: 'test@profiles.dev' });
  if (!testUser) {
    console.log('Test user not found! Run setup-test-user.js first.');
    process.exit(1);
  }

  // Test 1: Profile Creation
  console.log('\x1b[33m=== Profile Creation ===\x1b[0m');
  const profile1 = new Profile({
    userId: testUser._id,
    name: 'Verification Profile 1',
    platform: 'instagram',
    color: '#3b82f6'
  });
  await profile1.save();
  test(profile1._id, 'Profile created with ID');
  test(profile1.name === 'Verification Profile 1', 'Profile name saved correctly');
  test(profile1.socialAccounts.instagram.useParentConnection === true, 'Default useParentConnection is true');

  // Test 2: Second Profile
  console.log('\n\x1b[33m=== Multiple Profiles ===\x1b[0m');
  const profile2 = new Profile({
    userId: testUser._id,
    name: 'Verification Profile 2',
    platform: 'tiktok',
    color: '#10b981'
  });
  await profile2.save();
  test(profile2._id, 'Second profile created');

  const userProfiles = await Profile.find({ userId: testUser._id });
  test(userProfiles.length >= 2, `User has ${userProfiles.length} profiles`);

  // Test 3: Grid-Profile Association
  console.log('\n\x1b[33m=== Grid-Profile Association ===\x1b[0m');
  const grid1 = new Grid({
    userId: testUser._id,
    profileId: profile1._id,
    name: 'Grid for Profile 1',
    platform: 'instagram',
    columns: 3,
    totalRows: 3,
    cells: []
  });
  await grid1.save();
  test(grid1.profileId.toString() === profile1._id.toString(), 'Grid has correct profileId');

  const grid2 = new Grid({
    userId: testUser._id,
    profileId: profile2._id,
    name: 'Grid for Profile 2',
    platform: 'tiktok',
    columns: 3,
    totalRows: 3,
    cells: []
  });
  await grid2.save();
  test(grid2.profileId.toString() === profile2._id.toString(), 'Second grid has correct profileId');

  // Test 4: Profile Filtering
  console.log('\n\x1b[33m=== Profile Filtering ===\x1b[0m');
  const gridsForProfile1 = await Grid.find({ userId: testUser._id, profileId: profile1._id });
  test(gridsForProfile1.length >= 1, `Profile 1 has ${gridsForProfile1.length} grids`);
  test(gridsForProfile1.every(g => g.profileId.toString() === profile1._id.toString()), 'All filtered grids belong to Profile 1');

  const gridsForProfile2 = await Grid.find({ userId: testUser._id, profileId: profile2._id });
  test(gridsForProfile2.length >= 1, `Profile 2 has ${gridsForProfile2.length} grids`);
  test(!gridsForProfile2.some(g => g.profileId.toString() === profile1._id.toString()), 'Profile 2 grids do not include Profile 1 grids');

  // Test 5: Profile Update
  console.log('\n\x1b[33m=== Profile Update ===\x1b[0m');
  profile1.name = 'Updated Profile 1';
  profile1.bio = 'This is updated bio';
  await profile1.save();
  const updatedProfile = await Profile.findById(profile1._id);
  test(updatedProfile.name === 'Updated Profile 1', 'Profile name updated');
  test(updatedProfile.bio === 'This is updated bio', 'Profile bio updated');

  // Test 6: Default Profile Logic
  console.log('\n\x1b[33m=== Default Profile Logic ===\x1b[0m');
  profile1.isDefault = true;
  await profile1.save();
  test(profile1.isDefault === true, 'Profile 1 set as default');

  profile2.isDefault = true;
  await profile2.save();
  
  const refreshedProfile1 = await Profile.findById(profile1._id);
  test(refreshedProfile1.isDefault === false, 'Profile 1 unset as default when Profile 2 became default');
  test(profile2.isDefault === true, 'Profile 2 is now default');

  // Test 7: Social Connection Methods
  console.log('\n\x1b[33m=== Social Connection Methods ===\x1b[0m');
  const igConnection = await profile1.getEffectiveConnection('instagram');
  test(typeof igConnection.connected === 'boolean', 'getEffectiveConnection returns connected status');
  test(typeof igConnection.useParent === 'boolean', 'getEffectiveConnection returns useParent flag');

  // Clean up
  console.log('\n\x1b[33m=== Cleanup ===\x1b[0m');
  await Grid.deleteMany({ _id: { $in: [grid1._id, grid2._id] } });
  await Profile.deleteMany({ _id: { $in: [profile1._id, profile2._id] } });
  console.log('Test data cleaned up');

  // Summary
  console.log('\n\x1b[36m╔═══════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║              Verification Results             ║\x1b[0m');
  console.log('\x1b[36m╚═══════════════════════════════════════════════╝\x1b[0m\n');
  console.log(`Total Tests: ${TESTS.passed + TESTS.failed}`);
  console.log(`\x1b[32mPassed: ${TESTS.passed}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${TESTS.failed}\x1b[0m`);
  console.log(`Success Rate: ${Math.round(TESTS.passed / (TESTS.passed + TESTS.failed) * 100)}%\n`);

  await mongoose.disconnect();
  process.exit(TESTS.failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
