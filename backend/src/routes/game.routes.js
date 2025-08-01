const { Router } = require('express');
const GameResult = require('../models/GameResult.js');
const Round = require('../models/Round.js');
const { authenticate } = require('../middleware/auth.middleware.js');

const router = Router();

// Get current game state
router.get('/current', async (req, res) => {
  try { 
    const currentRound = await Round.findOne({ status: 'running' })
      .sort({ roundNumber: -1 });

    if (!currentRound) {
      return res.json({ 
        status: 'waiting',
        message: 'Waiting for next round to start'
      });
    }

    const elapsed = Date.now() - currentRound.startTime.getTime();
    const multiplier = Math.max(1, Math.floor(elapsed / 100) / 10);

    res.json({
      roundNumber: currentRound.roundNumber,
      status: currentRound.status,
      multiplier: Math.min(multiplier, currentRound.crashPoint),
      elapsed
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game state' });
  }
});

// Get game history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;
    
    const games = await GameResult.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    res.json({
      success: true,
      games,
      total: await GameResult.countDocuments()
    });
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get round details
router.get('/round/:roundNumber', async (req, res) => {
  try {
    const { roundNumber } = req.params;
    const round = await GameResult.findOne({ round: parseInt(roundNumber) });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    res.json({ round });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch round details' });
  }
});

// Verify game fairness
router.post('/verify', async (req, res) => {
  try {
    const { serverSeed, clientSeed, nonce } = req.body;
    
    // Simple hash-based verification
    const hash = require('crypto')
      .createHash('sha256')
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest('hex');
    
    const crashPoint = parseInt(hash.substring(0, 8), 16) % 1000;
    const normalizedCrashPoint = Math.max(1, crashPoint / 100);

    res.json({
      crashPoint: normalizedCrashPoint,
      hash,
      verified: true
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify game' });
  }
});

module.exports = router;
