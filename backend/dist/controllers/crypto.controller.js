"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDeposits = exports.createCryptoDeposit = void 0;
const transaction_1 = __importDefault(require("../models/transaction"));
const User_1 = __importDefault(require("../models/User"));
const axios_1 = __importDefault(require("axios"));
const USDT_TRC20_ADDR = process.env.USDT_TRC20_ADDR;
const TRON_API = 'https://api.trongrid.io';
/* 1.  Create deposit record & show static USDT-TRC20 QR */
const createCryptoDeposit = async (req, res) => {
    const { amount } = req.body;
    const tx = await transaction_1.default.create({
        user: req.user.id,
        type: 'deposit',
        method: 'usdt_trc20',
        amount,
        status: 'pending',
        walletAddress: USDT_TRC20_ADDR,
    });
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`tronlink://send?address=${USDT_TRC20_ADDR}&amount=${amount}`)}`;
    res.json({ txId: tx._id, qr, address: USDT_TRC20_ADDR });
};
exports.createCryptoDeposit = createCryptoDeposit;
/* 2.  Cron job helper */
const checkDeposits = async () => {
    const pending = await transaction_1.default.find({ method: 'usdt_trc20', status: 'pending' });
    for (const p of pending) {
        const { data } = await axios_1.default.get(`${TRON_API}/v1/accounts/${USDT_TRC20_ADDR}/transactions/trc20`, {
            params: { contract_address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
        });
        const match = data.data.find((t) => t.to === USDT_TRC20_ADDR.toLowerCase() &&
            +t.value === p.amount * 1e6 &&
            t.confirmed);
        if (match) {
            p.status = 'approved';
            await p.save();
            await User_1.default.findByIdAndUpdate(p.user, { $inc: { balance: p.amount } });
        }
    }
};
exports.checkDeposits = checkDeposits;
