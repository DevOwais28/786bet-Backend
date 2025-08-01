const Transaction = require('../models/Transaction.js');
const User = require('../models/User.js');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

class PaymentService {
  constructor() {
    this.UPLOAD_DIR = path.join(__dirname, '../../uploads/payment-proofs');
    this.ensureUploadDir();
  }

  ensureUploadDir() {
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }
  }

  validatePaymentMethod(method) {
    const validMethods = ['usdt']; // Only USDT active for now
    return validMethods.includes(method);
  }

  async createDeposit(userId, depositData) {
    try {
      const { amount, method, walletAddress, network = 'TRX' } = depositData;

      if (!this.validatePaymentMethod(method)) {
        throw new Error('Invalid payment method');
      }

      if (isNaN(amount) || amount < 10) {
        throw new Error('Minimum deposit amount is $10');
      }

      const transactionId = `TXN_DEP_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      const paymentDetails = await this.getPaymentDetails();
      
      const transaction = new Transaction({
        user: userId,
        type: 'deposit',
        method: `${method}_${network.toLowerCase()}`,
        amount: parseFloat(amount),
        transactionId,
        network,
        status: 'pending',
        paymentDetails: {
          qrCode: paymentDetails.binance.qrCode,
          address: paymentDetails.binance.address,
          network: paymentDetails.binance.network,
          amount: parseFloat(amount)
        },
        createdAt: new Date()
      });

      await transaction.save();
      
      // Return payment details for the frontend
      return {
        ...transaction.toObject(),
        paymentDetails: {
          ...transaction.paymentDetails,
          instructions: `Send ${amount} USDT (${network}) to the address below`
        }
      };
    } catch (error) {
      console.error('Deposit creation error:', error);
      throw new Error(`Failed to create deposit: ${error.message}`);
    }
  }
  
  async createWithdrawal(userId, withdrawalData) {
    try {
      const { amount, method, network = 'TRX', address } = withdrawalData;

      if (!this.validatePaymentMethod(method)) {
        throw new Error('Invalid withdrawal method');
      }

      if (isNaN(amount) || amount < 10) {
        throw new Error('Minimum withdrawal amount is $10');
      }

      // Validate TRX address format
      if (network === 'TRX' && !/^T[A-Za-z0-9]{33}$/.test(address)) {
        throw new Error('Invalid TRX wallet address');
      }

      // Check user balance
      const user = await User.findById(userId);
      if (!user || user.balance < amount) {
        throw new Error('Insufficient balance');
      }

      const transactionId = `TXN_WDL_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Create withdrawal transaction
      const transaction = new Transaction({
        user: userId,
        type: 'withdrawal',
        method: `${method}_${network.toLowerCase()}`,
        amount: parseFloat(amount),
        transactionId,
        walletAddress: address,
        network,
        status: 'pending',
        createdAt: new Date()
      });

      await transaction.save();
      
      // Deduct from user balance immediately
      user.balance -= parseFloat(amount);
      await user.save();
      
      // In a real app, you would integrate with a payment processor here
      // For now, we'll just mark it as pending and process it manually
      
      return transaction;
    } catch (error) {
      console.error('Withdrawal creation error:', error);
      throw new Error(`Failed to create withdrawal: ${error.message}`);
    }
  }



  async getPaymentMethods() {
    // Return active payment methods - currently only USDT TRC20 is enabled
    return [
      {
        id: 'usdt',
        name: 'USDT TRX',
        type: 'crypto',
        qrCode: process.env.BINANCE_QR_CODE_URL,
        walletAddress: process.env.BINANCE_WALLET_ADDRESS,
        network: process.env.BINANCE_NETWORK || 'TRX',
        status: 'active',
        minAmount: 10,
        minWithdrawal: 10,
        instructions: 'Send USDT to the provided TRC20 address and upload the transaction hash'
      }
    ];
  }

  async getUserTransactions(userId, options = {}) {
    try {
      const { page = 1, limit = 10, type } = options;
      
      const query = { user: userId };
      if (type) query.type = type;

      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('approvedBy', 'username');

      const total = await Transaction.countDocuments(query);

      return {
        transactions,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    } catch (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
  }

  async uploadPaymentProof(transactionId, userId, proofImage) {
    try {
      const transaction = await Transaction.findOne({
        transactionId,
        user: userId
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      transaction.proofImage = proofImage;
      await transaction.save();

      return transaction;
    } catch (error) {
      throw new Error(`Failed to upload payment proof: ${error.message}`);
    }
  }

  async getPaymentDetails() {
    return {
      binance: {
        qrCode: process.env.BINANCE_QR_CODE_URL,
        address: process.env.BINANCE_WALLET_ADDRESS,
        network: process.env.BINANCE_NETWORK
      }
      // Easypaisa and JazzCash details commented out - removed
    };
  }
}

module.exports = new PaymentService();
