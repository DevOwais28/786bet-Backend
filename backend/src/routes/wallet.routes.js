const express = require('express');
const { authenticate } = require('../middleware/auth.middleware.js');
const { createCryptoDeposit } = require('../controllers/crypto.controller.js');

const router = express.Router();

router.post('/crypto-deposit', authenticate, createCryptoDeposit);

module.exports = router;
