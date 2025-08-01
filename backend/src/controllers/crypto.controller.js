const Transaction = require('../models/Transaction.js');
const User = require('../models/User.js');
const axios = require('axios');
const crypto = require('crypto');

const USDT_TRX_ADDR = process.env.USDT_WALLET_ADDRESS;
const TRON_API = 'https://api.trongrid.io';

const createCryptoDeposit = async (req, res) => {
  try {
    const { amount } = req.body;
    
    const tx = await Transaction.create({
      user: req.user.id,
      type: 'deposit',
      method: 'usdt_trx',
      amount,
      status: 'pending',
      walletAddress: USDT_TRX_ADDR,
    });

    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`tronlink://send?address=${USDT_TRX_ADDR}&amount=${amount}`)}`;
    
    res.json({ 
      txId: tx._id, 
      qr, 
      address: USDT_TRX_ADDR 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create crypto deposit' });
  }
};

const checkDeposits = async () => {
  try {
    const pending = await Transaction.find({ 
      method: 'usdt_trx', 
      status: 'pending' 
    });

    for (const p of pending) {
      const { data } = await axios.get(`${TRON_API}/v1/accounts/${USDT_TRX_ADDR}/transactions/trc20`, {
        params: { 
          contract_address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' 
        },
      });

      const match = data.data.find(t =>
        t.to === USDT_TRX_ADDR.toLowerCase() &&
        +t.value === p.amount * 1e6 &&
        t.confirmed
      );

      if (match) {
        p.status = 'approved';
        await p.save();
        await User.findByIdAndUpdate(p.user, { $inc: { balance: p.amount } });
      }
    }
  } catch (error) {
    console.error('Error checking deposits:', error);
  }
};

module.exports = {
  createCryptoDeposit,
  checkDeposits
};
