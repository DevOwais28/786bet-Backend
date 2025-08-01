const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      console.error('Admin email or password not found in .env');
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists:', adminEmail);
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const adminUser = new User({
      username: 'admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      balance: 0,
      referralCode: 'ADMIN001',
      isEmailVerified: true,
      isActive: true
    });

    await adminUser.save();
    console.log('Admin user created successfully:', adminEmail);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
