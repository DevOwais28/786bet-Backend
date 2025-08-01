const { Router } = require('express');
const Transaction = require('../models/Transaction.js');
const User = require('../models/User.js');
const { upload } = require('../middleware/upload.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const paymentService = require('../services/payment.service.js');

const router = Router();

// Create deposit
router.post('/deposit', authenticate, async (req, res) => {
  try {
    const { amount, method = 'usdt', network = 'TRX' } = req.body;
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Amount is required and must be a number' });
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount < 10) {
      return res.status(400).json({ error: 'Minimum deposit amount is $10' });
    }

    const transaction = await paymentService.createDeposit(userId, {
      amount: parsedAmount,
      method,
      network
    });

    res.json({ 
      success: true, 
      data: transaction,
      message: 'Deposit request created successfully. Please send the funds to the provided address.'
    });
  } catch (error) {
    console.error('Deposit creation error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message || 'Failed to create deposit request' 
    });
  }
});

// Create withdrawal
router.post('/withdraw', authenticate, async (req, res) => {
  try {
    const { amount, method = 'usdt', network = 'TRX', address } = req.body;
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Amount is required and must be a number' });
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount < 10) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is $10' });
    }

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const transaction = await paymentService.createWithdrawal(userId, {
      amount: parsedAmount,
      method,
      network,
      address
    });

    res.json({ 
      success: true, 
      data: transaction,
      message: 'Withdrawal request submitted. It will be processed shortly.'
    });
  } catch (error) {
    console.error('Withdrawal creation error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message || 'Failed to create withdrawal request' 
    });
  }
});

// Get user transactions
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, type } = req.query;

    const result = await paymentService.getUserTransactions(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type
    });

    res.json(result);
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Upload payment proof
router.post('/upload-proof', authenticate, upload.single('proof'), async (req, res) => {
  try {
    const { transactionId } = req.body;
    const proofImage = req.file?.path;

    if (!proofImage) {
      return res.status(400).json({ error: 'Proof image is required' });
    }

    const transaction = await Transaction.findOne({
      transactionId,
      user: req.user.userId
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    transaction.proofImage = proofImage;
    await transaction.save();

    res.json({ 
      success: true, 
      message: 'Payment proof uploaded successfully',
      proofImage: transaction.proofImage
    });
  } catch (error) {
    console.error('Proof upload error:', error);
    res.status(500).json({ error: 'Failed to upload payment proof' });
  }
});

// Get payment methods
router.get('/methods', async (req, res) => {
  try {
    const methods = await paymentService.getPaymentMethods();
    res.json({ methods });
  } catch (error) {
    console.error('Payment methods error:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

module.exports = router;
