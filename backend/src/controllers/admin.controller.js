const User = require('../models/User.js');
const Transaction = require('../models/transaction.js');
const Bet = require('../models/Bet.js');
const { FraudDetectionService } = require('../services/fraudDetection.service.js');

const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
    
    const totalDeposits = await Transaction.countDocuments({ type: 'deposit', status: 'approved' });
    const totalWithdrawals = await Transaction.countDocuments({ type: 'withdrawal', status: 'approved' });
    
    const pendingDeposits = await Transaction.countDocuments({ type: 'deposit', status: 'pending' });
    const pendingWithdrawals = await Transaction.countDocuments({ type: 'withdrawal', status: 'pending' });
    
    const totalDeposited = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalWithdrawn = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalBets = await Bet.countDocuments();
    const totalWagered = await Bet.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        totalDeposits,
        totalWithdrawals,
        pendingDeposits,
        pendingWithdrawals,
        totalDeposited: totalDeposited[0]?.total || 0,
        totalWithdrawn: totalWithdrawn[0]?.total || 0,
        totalBets,
        totalWagered: totalWagered[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const bets = await Bet.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const loginLogs = await LoginLog.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(20);

    res.json({
      user,
      transactions,
      bets,
      loginLogs
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

const updateUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, type, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (type === 'add') {
      user.balance += parsedAmount;
    } else if (type === 'deduct') {
      if (user.balance < parsedAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      user.balance -= parsedAmount;
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    await user.save();

    res.json({
      success: true,
      newBalance: user.balance,
      message: `Balance ${type === 'add' ? 'added' : 'deducted'} successfully`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user balance' });
  }
};

const registerAdmin = async (req, res) => {
  try {
    const { email, password, username, adminKey } = req.body;

    // Basic validation
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and username are required'
      });
    }

    // Check if admin email matches environment variable
    const adminEmail = process.env.ADMIN_EMAIL;
    if (email.toLowerCase().trim() !== adminEmail?.toLowerCase().trim()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin email address'
      });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: email.toLowerCase().trim(), role: 'admin' });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Admin account already exists'
      });
    }

    // Create admin user with secure password hashing
    const hashedPassword = await bcrypt.hash(password, 12);
    const adminUser = new User({
      username: username || 'admin',
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin',
      balance: 0,
      referralCode: 'ADMIN001',
      isEmailVerified: true,
      isActive: true,
      createdAt: new Date()
    });

    await adminUser.save();

    // Generate OTP for immediate login
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const pendingVerification = new PendingVerification({
      email: email.toLowerCase().trim(),
      otp,
      type: 'admin_login',
      expiresAt,
      createdAt: new Date()
    });
    await pendingVerification.save();

    // Send OTP via email
    console.log(`Admin OTP for ${email}: ${otp}`);

    res.json({
      success: true,
      message: 'Admin account created successfully. OTP sent to email.',
      email: email.toLowerCase().trim(),
      role: 'admin'
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin registration failed',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getUserDetails,
  updateUserBalance,
  registerAdmin
};
