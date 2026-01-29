/**
 * Stress Test for YouTube Collections
 * Tests data persistence, multi-user isolation, and robustness
 */

const mongoose = require('mongoose');
const YoutubeCollection = require('../models/YoutubeCollection');
const YoutubeVideo = require('../models/YoutubeVideo');
const User = require('../models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/slayt';

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const prefix = type === 'pass' ? '✓' : type === 'fail' ? '✗' : '→';
  console.log(`${prefix} ${message}`);
}

function recordTest(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    log(`${name}`, 'pass');
  } else {
    results.failed++;
    log(`${name}: ${details}`, 'fail');
  }
}

async function cleanupTestData() {
  // Clean up test users and their data
  const testUsers = await User.find({ email: /^stresstest/ });
  for (const user of testUsers) {
    await YoutubeVideo.deleteMany({ userId: user._id });
    await YoutubeCollection.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }
}

async function createTestUser(suffix) {
  const user = new User({
    email: `stresstest${suffix}@test.com`,
    password: 'testpassword123',
    name: `Test User ${suffix}`
  });
  await user.save();
  return user;
}

async function runTests() {
  console.log('\n========================================');
  console.log('YouTube Collections Stress Test');
  console.log('========================================\n');

  try {
    // Connect to database
    await mongoose.connect(MONGO_URI);
    log('Connected to MongoDB');

    // Cleanup any previous test data
    await cleanupTestData();
    log('Cleaned up previous test data');

    // Create test users
    const user1 = await createTestUser('1');
    const user2 = await createTestUser('2');
    log(`Created test users: ${user1._id}, ${user2._id}`);

    // ========================================
    // TEST 1: Basic Collection CRUD
    // ========================================
    console.log('\n--- Test 1: Basic Collection CRUD ---');

    const collection1 = new YoutubeCollection({
      userId: user1._id,
      name: 'My First Collection',
      color: '#ff0000'
    });
    await collection1.save();
    recordTest('Create collection', !!collection1._id);

    // Verify it persisted
    const fetched1 = await YoutubeCollection.findById(collection1._id);
    recordTest('Fetch collection by ID', fetched1?.name === 'My First Collection');

    // Update collection
    fetched1.name = 'Updated Collection Name';
    await fetched1.save();
    const updated1 = await YoutubeCollection.findById(collection1._id);
    recordTest('Update collection name', updated1?.name === 'Updated Collection Name');

    // ========================================
    // TEST 2: Multi-User Isolation
    // ========================================
    console.log('\n--- Test 2: Multi-User Isolation ---');

    const user2Collection = new YoutubeCollection({
      userId: user2._id,
      name: 'User 2 Collection',
      color: '#00ff00'
    });
    await user2Collection.save();

    // User 1 should only see their collections
    const user1Collections = await YoutubeCollection.find({ userId: user1._id });
    const user2Collections = await YoutubeCollection.find({ userId: user2._id });

    recordTest('User 1 sees only their collections', user1Collections.length === 1);
    recordTest('User 2 sees only their collections', user2Collections.length === 1);
    recordTest('Collections are isolated', user1Collections[0]?.name !== user2Collections[0]?.name);

    // ========================================
    // TEST 3: Video CRUD and Collection Association
    // ========================================
    console.log('\n--- Test 3: Video CRUD and Collection Association ---');

    const video1 = new YoutubeVideo({
      userId: user1._id,
      collectionId: collection1._id,
      title: 'Test Video 1',
      description: 'This is a test video',
      status: 'draft',
      position: 0
    });
    await video1.save();
    recordTest('Create video', !!video1._id);

    // Fetch video
    const fetchedVideo = await YoutubeVideo.findById(video1._id);
    recordTest('Fetch video by ID', fetchedVideo?.title === 'Test Video 1');

    // Verify video belongs to collection
    const collectionVideos = await YoutubeVideo.find({ collectionId: collection1._id });
    recordTest('Video associated with collection', collectionVideos.length === 1);

    // ========================================
    // TEST 4: Data Persistence After Reconnect
    // ========================================
    console.log('\n--- Test 4: Data Persistence After Reconnect ---');

    const collectionIdToCheck = collection1._id.toString();
    const videoIdToCheck = video1._id.toString();

    // Disconnect and reconnect
    await mongoose.disconnect();
    log('Disconnected from MongoDB');

    await mongoose.connect(MONGO_URI);
    log('Reconnected to MongoDB');

    // Verify data persisted
    const persistedCollection = await YoutubeCollection.findById(collectionIdToCheck);
    const persistedVideo = await YoutubeVideo.findById(videoIdToCheck);

    recordTest('Collection persisted after reconnect', persistedCollection?.name === 'Updated Collection Name');
    recordTest('Video persisted after reconnect', persistedVideo?.title === 'Test Video 1');

    // ========================================
    // TEST 5: Bulk Operations
    // ========================================
    console.log('\n--- Test 5: Bulk Operations ---');

    // Create 50 videos quickly
    const bulkVideos = [];
    for (let i = 0; i < 50; i++) {
      bulkVideos.push({
        userId: user1._id,
        collectionId: collection1._id,
        title: `Bulk Video ${i}`,
        description: `Description for bulk video ${i}`,
        status: 'draft',
        position: i + 1
      });
    }

    const insertResult = await YoutubeVideo.insertMany(bulkVideos);
    recordTest('Bulk insert 50 videos', insertResult.length === 50);

    // Verify all videos exist
    const allVideos = await YoutubeVideo.find({ collectionId: collection1._id });
    recordTest('All 51 videos retrievable', allVideos.length === 51);

    // ========================================
    // TEST 6: Concurrent Updates
    // ========================================
    console.log('\n--- Test 6: Concurrent Updates ---');

    // Simulate concurrent updates
    const updatePromises = [];
    for (let i = 0; i < 10; i++) {
      updatePromises.push(
        YoutubeVideo.findByIdAndUpdate(
          video1._id,
          { description: `Concurrent update ${i}` },
          { new: true }
        )
      );
    }

    const updateResults = await Promise.all(updatePromises);
    const successfulUpdates = updateResults.filter(r => r !== null);
    recordTest('Concurrent updates handled', successfulUpdates.length === 10);

    // ========================================
    // TEST 7: Special Characters and Edge Cases
    // ========================================
    console.log('\n--- Test 7: Special Characters and Edge Cases ---');

    const specialCollection = new YoutubeCollection({
      userId: user1._id,
      name: 'Test <script>alert("xss")</script> & Special "Characters" 日本語',
      color: '#0000ff'
    });
    await specialCollection.save();

    const fetchedSpecial = await YoutubeCollection.findById(specialCollection._id);
    recordTest('Special characters preserved', fetchedSpecial?.name.includes('日本語'));

    // Empty description
    const emptyDescVideo = new YoutubeVideo({
      userId: user1._id,
      collectionId: collection1._id,
      title: 'Video with empty description',
      description: '',
      status: 'draft'
    });
    await emptyDescVideo.save();
    recordTest('Empty description allowed', !!emptyDescVideo._id);

    // Very long title (100 chars max for YouTube)
    const longTitle = 'A'.repeat(100);
    const longTitleVideo = new YoutubeVideo({
      userId: user1._id,
      collectionId: collection1._id,
      title: longTitle,
      status: 'draft'
    });
    await longTitleVideo.save();
    recordTest('Long title (100 chars) saved', longTitleVideo.title.length === 100);

    // ========================================
    // TEST 8: Cascade Delete
    // ========================================
    console.log('\n--- Test 8: Collection Delete (Videos Remain) ---');

    // Create a collection with videos
    const tempCollection = new YoutubeCollection({
      userId: user1._id,
      name: 'Temp Collection'
    });
    await tempCollection.save();

    const tempVideo = new YoutubeVideo({
      userId: user1._id,
      collectionId: tempCollection._id,
      title: 'Temp Video'
    });
    await tempVideo.save();

    // Delete collection
    await YoutubeCollection.findByIdAndDelete(tempCollection._id);

    // Check if collection is deleted
    const deletedCollection = await YoutubeCollection.findById(tempCollection._id);
    recordTest('Collection deleted', deletedCollection === null);

    // Note: In current implementation, videos are NOT auto-deleted
    // This is intentional - the controller handles cascade delete
    const orphanedVideo = await YoutubeVideo.findById(tempVideo._id);
    log('Note: Videos need manual cleanup (controller handles this)');

    // ========================================
    // TEST 9: Position Ordering
    // ========================================
    console.log('\n--- Test 9: Position Ordering ---');

    const orderedVideos = await YoutubeVideo.find({ collectionId: collection1._id })
      .sort({ position: 1 })
      .limit(5);

    let positionsCorrect = true;
    for (let i = 1; i < orderedVideos.length; i++) {
      if (orderedVideos[i].position < orderedVideos[i-1].position) {
        positionsCorrect = false;
        break;
      }
    }
    recordTest('Videos ordered by position', positionsCorrect);

    // ========================================
    // TEST 10: Index Performance
    // ========================================
    console.log('\n--- Test 10: Index Performance ---');

    const startTime = Date.now();
    await YoutubeCollection.find({ userId: user1._id });
    await YoutubeVideo.find({ userId: user1._id, collectionId: collection1._id });
    const queryTime = Date.now() - startTime;

    recordTest(`Indexed queries fast (${queryTime}ms)`, queryTime < 100);

    // ========================================
    // Cleanup
    // ========================================
    console.log('\n--- Cleanup ---');
    await cleanupTestData();
    log('Test data cleaned up');

  } catch (error) {
    console.error('\nTest Error:', error);
    results.failed++;
    results.tests.push({ name: 'Unexpected Error', passed: false, details: error.message });
  } finally {
    await mongoose.disconnect();
    log('Disconnected from MongoDB');
  }

  // Print summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total:  ${results.passed + results.failed}`);
  console.log('========================================\n');

  if (results.failed > 0) {
    console.log('Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.details}`);
    });
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
