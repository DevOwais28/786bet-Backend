const express = require('express');
const User = require('../models/User.js');
const Transaction = require('../models/Transaction.js');
const Bet = require('../models/Bet.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const router = express.Router();

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        referralCode: user.referralCode,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user dashboard stats
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent transactions
    const recentTransactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get game statistics
    const gameStats = await Bet.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalBets: { $sum: 1 },
          totalWagered: { $sum: '$amount' },
          totalWon: { $sum: { $cond: [{ $gt: ['$profit', 0] }, '$profit', 0] } },
          totalLost: { $sum: { $cond: [{ $lt: ['$profit', 0] }, { $multiply: ['$amount', -1] }, 0] } }
        }
      }
    ]);

    res.json({
      profile: {
        username: user.username,
        email: user.email,
        balance: user.balance,
        role: user.role,
        referralCode: user.referralCode,
        createdAt: user.createdAt
      },
      stats: gameStats[0] || {
        totalBets: 0,
        totalWagered: 0,
        totalWon: 0,
        totalLost: 0
      },
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = username;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if current password is correct
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
