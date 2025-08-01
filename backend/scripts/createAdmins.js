const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
require('dotenv').config();

const createAdmins = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/game-app');
    console.log('Connected to MongoDB');

    const admins = [
      {
        email: process.env.ADMIN_EMAIL_SUPER || 'super@site.com',
        username: 'superadmin',
        password: process.env.ADMIN_PASS_SUPER || 'super123',
        role: 'super-admin',
        balance: 0,
        emailVerified: true
      },
      {
        email: process.env.ADMIN_EMAIL_MOD || 'mod@site.com',
        username: 'moderator',
        password: process.env.ADMIN_PASS_MOD || 'mod123',
        role: 'moderator',
        balance: 0,
        emailVerified: true
      },
      {
        email: process.env.ADMIN_EMAIL_FIN || 'finance@site.com',
        username: 'finance',
        password: process.env.ADMIN_PASS_FIN || 'finance123',
        role: 'finance',
        balance: 0,
        emailVerified: true
      }
    ];

    for (const admin of admins) {
      const existing = await User.findOne({ email: admin.email });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(admin.password, 12);
        admin.password = hashedPassword;
        await User.create(admin);
        console.log(`Created ${admin.role}: ${admin.email}`);
      } else {
        console.log(`${admin.role} already exists: ${admin.email}`);
      }
    }

    console.log('Admin creation completed');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admins:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  createAdmins();
}

module.exports = createAdmins;
