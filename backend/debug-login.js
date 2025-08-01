const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

async function debugLogin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/betting-app');
    console.log('Connected to database');
    
    // Check all users
    const users = await User.find({}, 'email username emailVerified createdAt');
    console.log('\n=== ALL USERS ===');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email} | Username: ${user.username} | Verified: ${user.emailVerified} | Created: ${user.createdAt}`);
    });
    
    // Check if any test users exist
    const testUsers = await User.find({ 
      $or: [
        { email: { $regex: /test/i } },
        { email: { $regex: /admin/i } },
        { email: { $regex: /demo/i } }
      ]
    });
    
    if (testUsers.length > 0) {
      console.log('\n=== TEST USERS FOUND ===');
      testUsers.forEach(user => {
        console.log(`- Email: ${user.email} | Username: ${user.username} | Verified: ${user.emailVerified}`);
      });
    }
    
    // Check for common test emails
    const commonTests = [
      'test@example.com',
      'admin@example.com',
      'user@example.com',
      'demo@example.com',
      'test@test.com'
    ];
    
    console.log('\n=== CHECKING COMMON TEST EMAILS ===');
    for (const testEmail of commonTests) {
      const user = await User.findOne({ email: testEmail });
      if (user) {
        console.log(`✅ ${testEmail} - Found! Username: ${user.username}, Verified: ${user.emailVerified}`);
        
        // Test common passwords
        const commonPasswords = ['password123', 'admin123', 'test123', 'demo123'];
        for (const testPassword of commonPasswords) {
          const isValid = await bcrypt.compare(testPassword, user.password);
          if (isValid) {
            console.log(`   🔑 Password "${testPassword}" is VALID for ${testEmail}`);
          }
        }
      }
    }
    
    // Check for any unverified users
    const unverifiedUsers = await User.find({ emailVerified: false });
    if (unverifiedUsers.length > 0) {
      console.log('\n=== UNVERIFIED USERS ===');
      unverifiedUsers.forEach(user => {
        console.log(`- ${user.email} (${user.username}) - needs verification`);
      });
    }
    
    // Check recent users
    const recentUsers = await User.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('\n=== RECENT USERS ===');
    recentUsers.forEach(user => {
      console.log(`- ${user.email} (${user.username}) - ${user.createdAt}`);
    });
    
    console.log('\n=== DEBUG COMPLETE ===');
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('Debug error:', error.message);
    process.exit(1);
  }
}

// Run the debug
if (require.main === module) {
  debugLogin();
}

module.exports = { debugLogin };
