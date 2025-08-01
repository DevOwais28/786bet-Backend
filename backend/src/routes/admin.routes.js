const { Router } = require('express');
const Transaction = require('../models/Transaction.js');
const User = require('../models/User.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { registerAdmin } = require('../controllers/admin.controller.js');

const router = Router();

// Get pending transactions for admin review
router.get('/transactions/pending', authenticate, async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'pending' })
      .populate('user', 'username email')
      .sort({ createdAt: -1 });
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending transactions' });
  }
});

// Approve transaction
router.post('/transactions/:id/approve', authenticate, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('user');
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Transaction already processed' });
    }

    transaction.status = 'approved';
    transaction.approvedBy = req.user.id;
    transaction.approvedAt = new Date();
    await transaction.save();

    // For deposits, add to user balance
    if (transaction.type === 'deposit') {
      const user = await User.findById(transaction.user);
      if (user) {
        user.balance += transaction.amount;
        await user.save();
      }
    }

    res.json({ success: true, message: 'Transaction approved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve transaction' });
  }
});

// Reject transaction
router.post('/transactions/:id/reject', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Transaction already processed' });
    }

    transaction.status = 'rejected';
    transaction.rejectedReason = reason;
    transaction.rejectedAt = new Date();
    transaction.processedBy = req.user.username;
    await transaction.save();

    res.json({ success: true, message: 'Transaction rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject transaction' });
  }
});

// Get all users (admin only)
router.get('/users', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get admin dashboard stats
router.get('/dashboard-stats', authenticate, async (req, res) => {
  try {
    const stats = {
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      totalDeposits: await Transaction.countDocuments({ type: 'deposit' }),
      totalWithdrawals: await Transaction.countDocuments({ type: 'withdrawal' }),
      pendingDeposits: await Transaction.countDocuments({ type: 'deposit', status: 'pending' }),
      pendingWithdrawals: await Transaction.countDocuments({ type: 'withdrawal', status: 'pending' }),
      totalBalance: await User.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }])
    };
    
    const totalDeposited = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalWithdrawn = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      stats: {
        totalUsers,
        totalDeposits,
        totalWithdrawals,
        pendingDeposits,
        pendingWithdrawals,
        totalDeposited: totalDeposited[0]?.total || 0,
        totalWithdrawn: totalWithdrawn[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Admin registration route (public but restricted to admin email)
router.post('/register-admin', registerAdmin);

module.exports = router;
