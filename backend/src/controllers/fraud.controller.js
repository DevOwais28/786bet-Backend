const User = require('../models/User.js');
const LoginLog = require('../models/LoginLog.js');
const { FraudDetectionService } = require('../services/fraudDetection.service.js');

const getFraudAlerts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const alerts = await LoginLog.find({ isSuspicious: true })
      .populate('user', 'email username')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LoginLog.countDocuments({ isSuspicious: true });

    res.json({
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fraud alerts' });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const loginLogs = await LoginLog.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        balance: user.balance,
        lastLoginAt: user.lastLoginAt,
        lastLoginIP: user.lastLoginIP
      },
      loginLogs
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
};

const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBlocked = true;
    user.blockReason = reason;
    user.blockedAt = new Date();
    user.blockedBy = req.user.id;

    await user.save();

    res.json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block user' });
  }
};

const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBlocked = false;
    user.blockReason = '';
    user.blockedAt = null;
    user.blockedBy = null;

    await user.save();

    res.json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
};

module.exports = {
  getFraudAlerts,
  getUserActivity,
  blockUser,
  unblockUser
};
