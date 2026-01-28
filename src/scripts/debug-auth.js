require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/postpanda');
  
  const User = require('../models/User');
  
  // Find the test user
  const user = await User.findOne({ email: 'test@profiles.dev' });
  
  if (!user) {
    console.log('User not found!');
    await mongoose.disconnect();
    return;
  }
  
  console.log('Found user:', user.email);
  console.log('Password hash:', user.password);
  
  // Test password comparison
  const testPassword = 'TestPass123!';
  const isMatch = await bcrypt.compare(testPassword, user.password);
  console.log('Password match:', isMatch);
  
  // If not matching, update password
  if (!isMatch) {
    console.log('Updating password...');
    user.password = await bcrypt.hash(testPassword, 10);
    await user.save();
    console.log('Password updated');
    
    // Verify again
    const updatedUser = await User.findOne({ email: 'test@profiles.dev' });
    const isMatchNow = await bcrypt.compare(testPassword, updatedUser.password);
    console.log('Password match after update:', isMatchNow);
  }
  
  await mongoose.disconnect();
}

debug().catch(console.error);
