#!/usr/bin/env node

/**
 * Stress Test Script for Multi-Profile System
 *
 * Tests:
 * 1. Profile CRUD operations
 * 2. Profile social status
 * 3. Grid filtering by profile
 * 4. Profile switching
 * 5. Concurrent operations
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Grid = require('../models/Grid');
const Collection = require('../models/Collection');
const ReelCollection = require('../models/ReelCollection');

const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function assert(condition, testName, details = '') {
  if (condition) {
    TEST_RESULTS.passed++;
    TEST_RESULTS.tests.push({ name: testName, passed: true });
    log(`  ✓ ${testName}`, 'success');
  } else {
    TEST_RESULTS.failed++;
    TEST_RESULTS.tests.push({ name: testName, passed: false, details });
    log(`  ✗ ${testName}: ${details}`, 'error');
  }
}

// Connect to MongoDB
async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/postpanda';
  await mongoose.connect(mongoUri);
  log('Connected to MongoDB\n', 'info');
}

// Test 1: Profile Model Validation
async function testProfileModel() {
  log('\n=== Test 1: Profile Model Validation ===\n', 'info');

  const testUser = await User.findOne({});
  if (!testUser) {
    log('No users found for testing!', 'error');
    return;
  }

  // Test required fields
  try {
    const invalidProfile = new Profile({});
    await invalidProfile.validate();
    assert(false, 'Profile requires userId', 'Should have thrown validation error');
  } catch (err) {
    assert(err.errors.userId, 'Profile requires userId');
  }

  // Test valid profile creation
  const validProfile = new Profile({
    userId: testUser._id,
    name: 'Test Profile',
    platform: 'instagram'
  });

  try {
    await validProfile.validate();
    assert(true, 'Valid profile passes validation');
  } catch (err) {
    assert(false, 'Valid profile passes validation', err.message);
  }

  // Test platform enum
  const badPlatformProfile = new Profile({
    userId: testUser._id,
    name: 'Bad Platform',
    platform: 'invalid'
  });

  try {
    await badPlatformProfile.validate();
    assert(false, 'Profile platform enum validation', 'Should reject invalid platform');
  } catch (err) {
    assert(err.errors.platform, 'Profile platform enum validation');
  }
}

// Test 2: Profile CRUD Operations
async function testProfileCRUD() {
  log('\n=== Test 2: Profile CRUD Operations ===\n', 'info');

  const testUser = await User.findOne({});
  const testProfileData = {
    userId: testUser._id,
    name: 'CRUD Test Profile',
    username: 'crudtest',
    bio: 'Testing CRUD operations',
    platform: 'both',
    color: '#ff0000'
  };

  // CREATE
  const createdProfile = new Profile(testProfileData);
  await createdProfile.save();
  assert(createdProfile._id, 'CREATE: Profile created successfully');
  assert(createdProfile.name === 'CRUD Test Profile', 'CREATE: Name saved correctly');
  assert(createdProfile.color === '#ff0000', 'CREATE: Color saved correctly');

  // READ
  const readProfile = await Profile.findById(createdProfile._id);
  assert(readProfile, 'READ: Profile found by ID');
  assert(readProfile.username === 'crudtest', 'READ: Username matches');

  // UPDATE
  readProfile.name = 'Updated CRUD Profile';
  readProfile.bio = 'Updated bio';
  await readProfile.save();

  const updatedProfile = await Profile.findById(createdProfile._id);
  assert(updatedProfile.name === 'Updated CRUD Profile', 'UPDATE: Name updated');
  assert(updatedProfile.bio === 'Updated bio', 'UPDATE: Bio updated');
  assert(updatedProfile.updatedAt > createdProfile.updatedAt, 'UPDATE: Timestamp updated');

  // DELETE
  await Profile.findByIdAndDelete(createdProfile._id);
  const deletedProfile = await Profile.findById(createdProfile._id);
  assert(!deletedProfile, 'DELETE: Profile removed');
}

// Test 3: Profile Static Methods
async function testProfileStaticMethods() {
  log('\n=== Test 3: Profile Static Methods ===\n', 'info');

  const testUser = await User.findOne({});

  // Test getOrCreateDefault
  const defaultProfile = await Profile.getOrCreateDefault(testUser._id, {
    name: testUser.name,
    avatar: testUser.avatar
  });

  assert(defaultProfile, 'getOrCreateDefault: Returns profile');
  assert(defaultProfile.isDefault === true, 'getOrCreateDefault: Profile is default');

  // Call again - should return same profile
  const sameProfile = await Profile.getOrCreateDefault(testUser._id);
  assert(
    sameProfile._id.toString() === defaultProfile._id.toString(),
    'getOrCreateDefault: Returns existing profile on second call'
  );
}

// Test 4: Profile Social Connection Methods
async function testProfileSocialConnections() {
  log('\n=== Test 4: Profile Social Connections ===\n', 'info');

  const testUser = await User.findOne({});
  const profile = await Profile.findOne({ userId: testUser._id });

  if (!profile) {
    log('No profile found for testing!', 'error');
    return;
  }

  // Test getEffectiveConnection for Instagram
  const igConnection = await profile.getEffectiveConnection('instagram');
  assert(typeof igConnection.connected === 'boolean', 'getEffectiveConnection: Returns connection status');
  assert(typeof igConnection.useParent === 'boolean', 'getEffectiveConnection: Returns useParent flag');

  // Test getEffectiveConnection for TikTok
  const ttConnection = await profile.getEffectiveConnection('tiktok');
  assert(typeof ttConnection.connected === 'boolean', 'getEffectiveConnection (TikTok): Returns connection status');

  // Test useParentConnection flag
  profile.socialAccounts.instagram.useParentConnection = true;
  await profile.save();

  const updatedProfile = await Profile.findById(profile._id);
  assert(
    updatedProfile.socialAccounts.instagram.useParentConnection === true,
    'useParentConnection flag persists'
  );
}

// Test 5: Grid Profile Filtering
async function testGridProfileFiltering() {
  log('\n=== Test 5: Grid Profile Filtering ===\n', 'info');

  const testUser = await User.findOne({});
  const profiles = await Profile.find({ userId: testUser._id });

  if (profiles.length === 0) {
    log('No profiles found for grid testing!', 'warn');
    return;
  }

  const profile = profiles[0];

  // Get grids for profile
  const profileGrids = await Grid.find({
    userId: testUser._id,
    profileId: profile._id
  });

  assert(Array.isArray(profileGrids), 'Grid filtering: Returns array');
  log(`  Found ${profileGrids.length} grids for profile ${profile.name}`, 'info');

  // Create a test grid with profile
  const testGrid = new Grid({
    userId: testUser._id,
    profileId: profile._id,
    name: 'Test Grid for Profile',
    platform: 'instagram',
    columns: 3,
    totalRows: 3,
    cells: []
  });
  await testGrid.save();

  // Verify it's findable by profile
  const foundGrid = await Grid.findOne({
    _id: testGrid._id,
    profileId: profile._id
  });
  assert(foundGrid, 'Grid filtering: New grid found by profileId');

  // Clean up
  await Grid.findByIdAndDelete(testGrid._id);
}

// Test 6: Collection Profile Filtering
async function testCollectionProfileFiltering() {
  log('\n=== Test 6: Collection Profile Filtering ===\n', 'info');

  const testUser = await User.findOne({});
  const profile = await Profile.findOne({ userId: testUser._id });

  if (!profile) {
    log('No profile found for collection testing!', 'warn');
    return;
  }

  // Get collections for profile
  const profileCollections = await Collection.find({
    userId: testUser._id,
    profileId: profile._id
  });

  assert(Array.isArray(profileCollections), 'Collection filtering: Returns array');
  log(`  Found ${profileCollections.length} collections for profile ${profile.name}`, 'info');

  // Create a test collection with profile
  const testCollection = new Collection({
    userId: testUser._id,
    profileId: profile._id,
    name: 'Test Collection for Profile',
    platform: 'instagram'
  });
  await testCollection.save();

  // Verify it's findable by profile
  const foundCollection = await Collection.findOne({
    _id: testCollection._id,
    profileId: profile._id
  });
  assert(foundCollection, 'Collection filtering: New collection found by profileId');

  // Clean up
  await Collection.findByIdAndDelete(testCollection._id);
}

// Test 7: Default Profile Uniqueness
async function testDefaultProfileUniqueness() {
  log('\n=== Test 7: Default Profile Uniqueness ===\n', 'info');

  const testUser = await User.findOne({});

  // Create two profiles
  const profile1 = new Profile({
    userId: testUser._id,
    name: 'Default Test 1',
    isDefault: true
  });
  await profile1.save();

  const profile2 = new Profile({
    userId: testUser._id,
    name: 'Default Test 2',
    isDefault: true
  });
  await profile2.save();

  // Refresh profile1 from DB
  const refreshedProfile1 = await Profile.findById(profile1._id);

  // profile1 should no longer be default (profile2's pre-save hook should have updated it)
  assert(
    refreshedProfile1.isDefault === false,
    'Default uniqueness: Old default is unset when new default is created'
  );

  assert(
    profile2.isDefault === true,
    'Default uniqueness: New default is set'
  );

  // Clean up
  await Profile.findByIdAndDelete(profile1._id);
  await Profile.findByIdAndDelete(profile2._id);
}

// Test 8: Concurrent Profile Operations
async function testConcurrentOperations() {
  log('\n=== Test 8: Concurrent Profile Operations ===\n', 'info');

  const testUser = await User.findOne({});

  // Create multiple profiles concurrently
  const createPromises = [];
  for (let i = 0; i < 5; i++) {
    createPromises.push(
      new Profile({
        userId: testUser._id,
        name: `Concurrent Profile ${i}`,
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
      }).save()
    );
  }

  const createdProfiles = await Promise.all(createPromises);
  assert(createdProfiles.length === 5, 'Concurrent creates: All profiles created');

  // Read all concurrently
  const readPromises = createdProfiles.map(p => Profile.findById(p._id));
  const readProfiles = await Promise.all(readPromises);
  assert(
    readProfiles.every(p => p !== null),
    'Concurrent reads: All profiles found'
  );

  // Update all concurrently
  const updatePromises = createdProfiles.map((p, i) =>
    Profile.findByIdAndUpdate(p._id, { bio: `Updated bio ${i}` }, { new: true })
  );
  const updatedProfiles = await Promise.all(updatePromises);
  assert(
    updatedProfiles.every((p, i) => p.bio === `Updated bio ${i}`),
    'Concurrent updates: All profiles updated correctly'
  );

  // Delete all concurrently
  const deletePromises = createdProfiles.map(p => Profile.findByIdAndDelete(p._id));
  await Promise.all(deletePromises);

  const remainingProfiles = await Profile.find({
    _id: { $in: createdProfiles.map(p => p._id) }
  });
  assert(remainingProfiles.length === 0, 'Concurrent deletes: All profiles removed');
}

// Test 9: ReelCollection Profile Filtering
async function testReelCollectionProfileFiltering() {
  log('\n=== Test 9: ReelCollection Profile Filtering ===\n', 'info');

  const testUser = await User.findOne({});
  const profile = await Profile.findOne({ userId: testUser._id });

  if (!profile) {
    log('No profile found for reel collection testing!', 'warn');
    return;
  }

  // Get reel collections for profile
  const profileReelCollections = await ReelCollection.find({
    userId: testUser._id,
    profileId: profile._id
  });

  assert(Array.isArray(profileReelCollections), 'ReelCollection filtering: Returns array');
  log(`  Found ${profileReelCollections.length} reel collections for profile ${profile.name}`, 'info');

  // Create a test reel collection with profile
  const testReelCollection = new ReelCollection({
    userId: testUser._id,
    profileId: profile._id,
    name: 'Test Reel Collection for Profile',
    platform: 'tiktok'
  });
  await testReelCollection.save();

  // Verify it's findable by profile
  const foundReelCollection = await ReelCollection.findOne({
    _id: testReelCollection._id,
    profileId: profile._id
  });
  assert(foundReelCollection, 'ReelCollection filtering: New reel collection found by profileId');

  // Clean up
  await ReelCollection.findByIdAndDelete(testReelCollection._id);
}

// Test 10: Profile Data Isolation
async function testProfileDataIsolation() {
  log('\n=== Test 10: Profile Data Isolation ===\n', 'info');

  const testUser = await User.findOne({});

  // Create two profiles
  const profileA = new Profile({
    userId: testUser._id,
    name: 'Profile A',
    platform: 'instagram'
  });
  await profileA.save();

  const profileB = new Profile({
    userId: testUser._id,
    name: 'Profile B',
    platform: 'tiktok'
  });
  await profileB.save();

  // Create grids for each profile
  const gridA = new Grid({
    userId: testUser._id,
    profileId: profileA._id,
    name: 'Grid for Profile A',
    platform: 'instagram',
    columns: 3,
    totalRows: 3,
    cells: []
  });
  await gridA.save();

  const gridB = new Grid({
    userId: testUser._id,
    profileId: profileB._id,
    name: 'Grid for Profile B',
    platform: 'tiktok',
    columns: 3,
    totalRows: 3,
    cells: []
  });
  await gridB.save();

  // Query grids for Profile A should not include Profile B's grids
  const gridsForA = await Grid.find({ userId: testUser._id, profileId: profileA._id });
  const gridsForB = await Grid.find({ userId: testUser._id, profileId: profileB._id });

  assert(
    gridsForA.every(g => g.profileId.toString() === profileA._id.toString()),
    'Data isolation: Profile A grids contain only Profile A items'
  );

  assert(
    gridsForB.every(g => g.profileId.toString() === profileB._id.toString()),
    'Data isolation: Profile B grids contain only Profile B items'
  );

  assert(
    !gridsForA.some(g => g._id.toString() === gridB._id.toString()),
    'Data isolation: Profile A query does not include Profile B grid'
  );

  // Clean up
  await Grid.findByIdAndDelete(gridA._id);
  await Grid.findByIdAndDelete(gridB._id);
  await Profile.findByIdAndDelete(profileA._id);
  await Profile.findByIdAndDelete(profileB._id);
}

// Run all tests
async function runTests() {
  try {
    await connectDB();

    log('╔══════════════════════════════════════════════╗', 'info');
    log('║    Multi-Profile System Stress Test Suite    ║', 'info');
    log('╚══════════════════════════════════════════════╝', 'info');

    await testProfileModel();
    await testProfileCRUD();
    await testProfileStaticMethods();
    await testProfileSocialConnections();
    await testGridProfileFiltering();
    await testCollectionProfileFiltering();
    await testDefaultProfileUniqueness();
    await testConcurrentOperations();
    await testReelCollectionProfileFiltering();
    await testProfileDataIsolation();

    // Print summary
    log('\n╔══════════════════════════════════════════════╗', 'info');
    log('║              Test Results Summary            ║', 'info');
    log('╚══════════════════════════════════════════════╝\n', 'info');

    log(`Total Tests: ${TEST_RESULTS.passed + TEST_RESULTS.failed}`, 'info');
    log(`Passed: ${TEST_RESULTS.passed}`, 'success');
    log(`Failed: ${TEST_RESULTS.failed}`, TEST_RESULTS.failed > 0 ? 'error' : 'success');

    if (TEST_RESULTS.failed > 0) {
      log('\nFailed Tests:', 'error');
      TEST_RESULTS.tests
        .filter(t => !t.passed)
        .forEach(t => log(`  - ${t.name}: ${t.details}`, 'error'));
    }

    log('\n', 'info');

  } catch (error) {
    log(`\nTest suite error: ${error.message}`, 'error');
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log('Disconnected from MongoDB', 'info');
    process.exit(TEST_RESULTS.failed > 0 ? 1 : 0);
  }
}

runTests();
