const User = require('../models/User');
const Bet = require('../models/Bet');
const GameResult = require('../models/GameResult');
const Transaction = require('../models/Transaction');

// Place a bet
const placeBet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid bet amount' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Deduct balance
    user.balance -= amount;
    await user.save();

    // Create bet
    const bet = new Bet({
      user: userId,
      amount,
      multiplier: 1.0,
      status: 'active'
    });
    await bet.save();

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      type: 'bet',
      amount: -amount,
      referenceId: bet._id
    });
    await transaction.save();

    res.json({
      success: true,
      message: 'Bet placed successfully',
      bet: {
        id: bet._id,
        amount: bet.amount,
        multiplier: bet.multiplier,
        status: bet.status
      },
      balance: user.balance
    });
  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cash out a bet
const cashOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const { betId, multiplier } = req.body;

    if (!betId || !multiplier || multiplier <= 1) {
      return res.status(400).json({ message: 'Invalid cashout data' });
    }

    const bet = await Bet.findOne({ _id: betId, user: userId });
    if (!bet) {
      return res.status(404).json({ message: 'Bet not found' });
    }

    if (bet.status !== 'active') {
      return res.status(400).json({ message: 'Bet is no longer active' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate payout
    const payout = bet.amount * multiplier;
    const profit = payout - bet.amount;

    // Update bet
    bet.multiplier = multiplier;
    bet.profit = profit;
    bet.status = 'cashed_out';
    await bet.save();

    // Update user balance
    user.balance += payout;
    await user.save();

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      type: 'win',
      amount: payout,
      referenceId: bet._id
    });
    await transaction.save();

    res.json({
      success: true,
      message: `Cashed out at ${multiplier}x!`,
      payout,
      profit,
      balance: user.balance
    });
  } catch (error) {
    console.error('Error cashing out:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active bets
const getActiveBets = async (req, res) => {
  try {
    const userId = req.user.id;
    const activeBets = await Bet.find({
      user: userId,
      status: 'active'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      bets: activeBets
    });
  } catch (error) {
    console.error('Error fetching active bets:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get game history
const getGameHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const bets = await Bet.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Bet.countDocuments({ user: userId });

    res.json({
      success: true,
      bets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user balance
const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('balance');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      balance: user.balance
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  placeBet,
  cashOut,
  getActiveBets,
  getGameHistory,
  getBalance
};
