const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const readline = require('readline');

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const setupAdmin = async () => {
  try {
    require('dotenv').config();
    await mongoose.connect(process.env.MONGO_URI);
    
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (!adminEmail) {
      console.error('ADMIN_EMAIL not found in .env file');
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail, role: 'admin' });
    if (existingAdmin) {
      console.log('Admin already exists:', adminEmail);
      process.exit(0);
    }

    // Prompt for secure admin password
    rl.question('Enter secure admin password: ', async (password) => {
      if (!password || password.length < 6) {
        console.error('Password must be at least 6 characters');
        process.exit(1);
      }

      rl.question('Enter admin username (default: admin): ', async (username) => {
        try {
          const hashedPassword = await bcrypt.hash(password, 12);
          
          const adminUser = new User({
            username: username || 'admin',
            email: adminEmail,
            password: hashedPassword,
            role: 'super-admin',
            balance: 0,
            referralCode: 'ADMIN001',
            isEmailVerified: true,
            isActive: true
          });

          await adminUser.save();
          console.log('✅ Admin user created successfully!');
          console.log('Email:', adminEmail);
          console.log('Username:', username || 'admin');
          console.log('Role: admin');
          
          process.exit(0);
        } catch (error) {
          console.error('Error creating admin:', error);
          process.exit(1);
        } finally {
          rl.close();
        }
      });
    });

  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Run the setup
setupAdmin();
