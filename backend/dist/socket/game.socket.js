"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGame = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Round_1 = __importDefault(require("../models/Round"));
const Bet_1 = __importDefault(require("../models/Bet"));
const User_1 = __importDefault(require("../models/User"));
const crashLogic_1 = require("../utils/crashLogic");
const initGame = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true
        }
    });
    let currentRound = 1;
    let gameState = 'waiting';
    let crashPoint;
    let currentMultiplier = 1.0;
    let roundStartTime = 0;
    const authenticateSocket = async (socket) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token)
                return null;
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = await User_1.default.findById(decoded.userId).select('-password');
            return user;
        }
        catch (error) {
            return null;
        }
    };
    const startRound = async () => {
        crashPoint = (0, crashLogic_1.randomCrash)();
        const round = await Round_1.default.create({
            roundId: currentRound,
            crashPoint,
            startTime: new Date(),
            status: 'waiting'
        });
        gameState = 'waiting';
        currentMultiplier = 1.0;
        roundStartTime = Date.now() + 5000; // 5 second waiting period
        io.emit('game_state', {
            status: 'waiting',
            roundId: currentRound,
            countdown: 5,
            players: []
        });
        setTimeout(async () => {
            gameState = 'running';
            roundStartTime = Date.now();
            await Round_1.default.updateOne({ _id: round._id }, { status: 'running' });
            io.emit('game_state', {
                status: 'running',
                roundId: currentRound,
                multiplier: 1.0,
                crashPoint
            });
            startMultiplierUpdate();
        }, 5000);
    };
    const startMultiplierUpdate = () => {
        const updateInterval = setInterval(() => {
            if (gameState !== 'running') {
                clearInterval(updateInterval);
                return;
            }
            const elapsed = (Date.now() - roundStartTime) / 1000;
            currentMultiplier = Math.floor((Math.pow(1.02, elapsed) * 100)) / 100;
            if (currentMultiplier >= crashPoint) {
                clearInterval(updateInterval);
                crashGame();
            }
            else {
                io.emit('multiplier_update', { multiplier: currentMultiplier });
            }
        }, 100);
    };
    const crashGame = async () => {
        gameState = 'crashed';
        const round = await Round_1.default.findOne({ roundId: currentRound });
        if (round) {
            await Round_1.default.updateOne({ _id: round._id }, {
                status: 'crashed',
                endTime: new Date(),
                finalMultiplier: crashPoint
            });
        }
        // Process all active bets
        const activeBets = await Bet_1.default.find({
            round: currentRound,
            status: 'active'
        }).populate('user');
        for (const bet of activeBets) {
            bet.status = 'lost';
            bet.finalMultiplier = crashPoint;
            await bet.save();
        }
        io.emit('game_crash', {
            roundId: currentRound,
            crashPoint,
            bets: activeBets
        });
        // Start new round after 5 seconds
        setTimeout(() => {
            currentRound++;
            startRound();
        }, 5000);
    };
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        socket.on('authenticate', async (token) => {
            const user = await authenticateSocket(socket);
            if (user) {
                socket.data.user = user;
                socket.join('game-room');
                socket.emit('authenticated', { user });
                // Send current game state
                socket.emit('game_state', {
                    status: gameState,
                    roundId: currentRound,
                    multiplier: currentMultiplier,
                    crashPoint: gameState === 'running' ? crashPoint : null,
                    countdown: gameState === 'waiting' ? Math.max(0, Math.ceil((roundStartTime - Date.now()) / 1000)) : null
                });
            }
            else {
                socket.emit('auth_error', { message: 'Authentication failed' });
            }
        });
        socket.on('place_bet', async (data) => {
            try {
                const user = socket.data.user;
                if (!user) {
                    return socket.emit('error', { message: 'Not authenticated' });
                }
                if (gameState !== 'waiting') {
                    return socket.emit('error', { message: 'Cannot place bet now' });
                }
                const dbUser = await User_1.default.findById(user._id);
                if (!dbUser || dbUser.balance < data.amount) {
                    return socket.emit('error', { message: 'Insufficient balance' });
                }
                // Check for existing bet
                const existingBet = await Bet_1.default.findOne({
                    user: user._id,
                    round: currentRound,
                    status: 'active'
                });
                if (existingBet) {
                    return socket.emit('error', { message: 'Bet already placed for this round' });
                }
                // Create bet
                const bet = await Bet_1.default.create({
                    user: user._id,
                    round: currentRound,
                    amount: data.amount,
                    multiplier: 1.0,
                    status: 'active',
                    placedAt: new Date()
                });
                // Update user balance
                dbUser.balance -= data.amount;
                await dbUser.save();
                const populatedBet = await bet.populate('user', 'username avatar');
                io.to('game-room').emit('bet_placed', {
                    bet: populatedBet,
                    balance: dbUser.balance
                });
            }
            catch (error) {
                console.error('Place bet error:', error);
                socket.emit('error', { message: 'Error placing bet' });
            }
        });
        socket.on('cash_out', async () => {
            try {
                const user = socket.data.user;
                if (!user || gameState !== 'running')
                    return;
                const bet = await Bet_1.default.findOne({
                    user: user._id,
                    round: currentRound,
                    status: 'active'
                });
                if (!bet)
                    return;
                const winnings = Math.floor(bet.amount * currentMultiplier);
                // Update bet
                bet.status = 'won';
                bet.multiplier = currentMultiplier;
                bet.winnings = winnings;
                bet.cashedOutAt = new Date();
                await bet.save();
                // Update user balance
                const dbUser = await User_1.default.findById(user._id);
                if (dbUser) {
                    dbUser.balance += winnings;
                    await dbUser.save();
                    const populatedBet = await bet.populate('user', 'username avatar');
                    io.to('game-room').emit('cash_out', {
                        bet: populatedBet,
                        balance: dbUser.balance,
                        multiplier: currentMultiplier
                    });
                }
            }
            catch (error) {
                console.error('Cash out error:', error);
                socket.emit('error', { message: 'Error cashing out' });
            }
        });
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
    // Start first round
    startRound();
};
exports.initGame = initGame;
