const { Router } = require('express');
const Bet = require('../models/Bet.js');
const User = require('../models/User.js');
const Round = require('../models/Round.js');
const { authenticate } = require('../middleware/auth.middleware.js');

const router = Router();

// Place a bet
router.post('/place', authenticate, async (req, res) => {
  try {
    const { amount, roundNumber } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid bet amount is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const currentRound = await Round.findOne({ roundNumber });
    if (!currentRound || currentRound.status !== 'running') {
      return res.status(400).json({ error: 'Round not available for betting' });
    }

    // Check if user already has a bet in this round
    const existingBet = await Bet.findOne({ user: userId, round: roundNumber });
    if (existingBet) {
      return res.status(400).json({ error: 'You already have a bet in this round' });
    }

    // Deduct balance
    user.balance -= amount;
    await user.save();

    // Create bet
    const bet = new Bet({
      user: userId,
      round: roundNumber,
      amount,
      status: 'active'
    });

    await bet.save();

    res.json({
      success: true,
      bet: {
        id: bet._id,
        round: bet.round,
        amount: bet.amount,
        status: bet.status
      },
      newBalance: user.balance
    });
  } catch (error) {
    console.error('Bet placement error:', error);
    res.status(500).json({ error: 'Failed to place bet' });
  }
});

// Cash out a bet
router.post('/cashout', authenticate, async (req, res) => {
  try {
    const { betId, multiplier } = req.body;
    const userId = req.user.id;

    const bet = await Bet.findOne({ _id: betId, user: userId });
    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.status !== 'active') {
      return res.status(400).json({ error: 'Bet already cashed out or lost' });
    }

    const currentRound = await Round.findOne({ roundNumber: bet.round });
    if (!currentRound || currentRound.status !== 'running') {
      return res.status(400).json({ error: 'Round has ended' });
    }

    // Calculate profit
    const profit = bet.amount * multiplier;
    
    // Update bet
    bet.cashOutAt = Date.now();
    bet.multiplier = multiplier;
    bet.profit = profit - bet.amount;
    bet.status = 'cashed_out';
    await bet.save();

    // Add winnings to user balance
    const user = await User.findById(userId);
    if (user) {
      user.balance += profit;
      await user.save();
    }

    res.json({
      success: true,
      bet: {
        id: bet._id,
        multiplier: bet.multiplier,
        profit: bet.profit,
        amount: bet.amount
      },
      newBalance: user.balance
    });
  } catch (error) {
    console.error('Cashout error:', error);
    res.status(500).json({ error: 'Failed to cash out' });
  }
});

// Get user's bets
router.get('/my-bets', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const bets = await Bet.find({ user: userId })
      .populate('round', 'roundNumber status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Bet.countDocuments({ user: userId });

    res.json({
      bets,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Bets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch bets' });
  }
});

// Get active bets for current round
router.get('/active/:roundNumber', authenticate, async (req, res) => {
  try {
    const { roundNumber } = req.params;
    const userId = req.user.id;

    const activeBets = await Bet.find({
      user: userId,
      round: parseInt(roundNumber),
      status: 'active'
    });

    res.json({ activeBets });
  } catch (error) {
    console.error('Active bets error:', error);
    res.status(500).json({ error: 'Failed to fetch active bets' });
  }
});

// GET /api/bets/history?limit=10
router.get('/history', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user.id;

    const bets = await Bet.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'username email');

    // Format response to match frontend expectations
    const formattedBets = bets.map(bet => ({
      id: bet._id,
      game: bet.game || 'Aviator',
      betAmount: bet.amount,
      multiplier: bet.multiplier || 0,
      payout: bet.payout || 0,
      timeAgo: formatTimeAgo(bet.createdAt),
      createdAt: bet.createdAt,
      status: bet.status
    }));

    res.json(formattedBets);
  } catch (error) {
    console.error('Bet history error:', error);
    res.status(500).json({ error: 'Failed to fetch bet history' });
  }
});

// Helper function to format time ago
function formatTimeAgo(date) {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

module.exports = router;
