require('dotenv').config();
const mongoose = require('mongoose');

async function setup() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/postpanda');
  
  const User = require('../models/User');
  
  // Delete existing test user first
  await User.deleteOne({ email: 'test@profiles.dev' });
  
  // Create new user with simpler password
  const user = new User({
    email: 'test@profiles.dev',
    password: 'testpassword123',  // Simple password without special chars
    name: 'Profile Test User',
    isVerified: true
  });
  await user.save();
  console.log('Created test user: test@profiles.dev');
  console.log('User ID:', user._id.toString());
  
  // Verify password works
  const isMatch = await user.comparePassword('testpassword123');
  console.log('Password verification:', isMatch ? 'PASS' : 'FAIL');
  
  await mongoose.disconnect();
}

setup().catch(console.error);
