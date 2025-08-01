const Round = require('../models/Round.js');
const GameResult = require('../models/GameResult.js');
const Bet = require('../models/Bet.js');
const User = require('../models/User.js');

class GameSocketHandler {
  constructor(io) {
    this.io = io;
    this.currentRound = null;
    this.gameInterval = null;
    this.activePlayers = new Map();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join game room
      socket.on('join-game', (userId) => {
        socket.join('game-room');
        this.activePlayers.set(socket.id, { userId, socket });
        this.updateActivePlayers();
      });

      // Handle bet placement
      socket.on('place-bet', async (data) => {
        try {
          const { userId, amount, roundNumber } = data;
          
          // Broadcast to all players
          this.io.to('game-room').emit('bet-placed', {
            userId,
            amount,
            roundNumber,
            timestamp: Date.now()
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to place bet' });
        }
      });

      // Handle cashout
      socket.on('cashout', async (data) => {
        try {
          const { userId, multiplier, amount } = data;
          
          this.io.to('game-room').emit('player-cashed-out', {
            userId,
            multiplier,
            amount,
            timestamp: Date.now()
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to cash out' });
        }
      });

      socket.on('join_game_room', () => {
        socket.join('game-room');
        console.log(`User ${socket.id} joined game-room`);
        // Send current game state to newly joined user
        if (this.currentRound) {
          socket.emit('game_state', {
            status: this.currentRound.status,
            roundNumber: this.currentRound.roundNumber,
            multiplier: this.currentRound.multiplier || 1.0,
            players: Array.from(this.activePlayers.values())
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        this.activePlayers.delete(socket.id);
        this.updateActivePlayers();
      });
    });

    // Start game loop
    this.startGameLoop();
  }

  async startGameLoop() {
    setInterval(async () => {
      if (!this.currentRound || this.currentRound.status === 'ended') {
        await this.startNewRound();
      }
    }, 5000); // Check every 5 seconds
  }

  async startNewRound() {
    try {
      const lastRound = await Round.findOne().sort({ roundNumber: -1 });
      const newRoundNumber = lastRound ? lastRound.roundNumber + 1 : 1;

      // Generate provable fairness fields
      const crypto = require('crypto');
      const serverSeed = crypto.randomBytes(16).toString('hex');
      const clientSeed = crypto.randomBytes(16).toString('hex');
      const nonce = newRoundNumber; // Use round number as nonce for uniqueness

      // Generate random crash point (1.01x to 100x)
      const crashPoint = Math.max(1.01, Math.random() * 100);

      this.currentRound = new Round({
        roundNumber: newRoundNumber,
        crashPoint,
        status: 'running',
        serverSeed,
        clientSeed,
        nonce
      });

      // Attach fairness fields for use in GameResult
      this.currentRound.serverSeed = serverSeed;
      this.currentRound.clientSeed = clientSeed;
      this.currentRound.nonce = nonce;

      await this.currentRound.save();

      // Broadcast new round to all players
      this.io.to('game-room').emit('new-round', {
        roundNumber: newRoundNumber,
        startTime: Date.now(),
        status: 'waiting',
        multiplier: 1.0,
        players: []
      });

      // Emit initial game state
      this.io.to('game-room').emit('game_state', {
        status: 'waiting',
        roundNumber: newRoundNumber,
        multiplier: 1.0,
        players: []
      });

      // Start multiplier updates
      this.startMultiplierUpdates();

    } catch (error) {
      console.error('Error starting new round:', error);
    }
  }

  startMultiplierUpdates() {
    if (!this.currentRound) {
      console.error('Cannot start multiplier updates: currentRound is null');
      return;
    }
    
    const startTime = Date.now();
    const crashTime = startTime + (this.currentRound.crashPoint * 1000);

    const updateInterval = setInterval(() => {
      if (!this.currentRound) {
        clearInterval(updateInterval);
        return;
      }

      const elapsed = Date.now() - startTime;
      const multiplier = Math.max(1, Math.floor(elapsed / 100) / 10);

      if (multiplier >= this.currentRound.crashPoint) {
        clearInterval(updateInterval);
        this.endRound();
      } else {
        this.io.to('game-room').emit('multiplier-update', {
          multiplier,
          roundNumber: this.currentRound.roundNumber,
          status: 'running'
        });
        this.io.to('game-room').emit('game_state', {
          status: 'running',
          roundNumber: this.currentRound.roundNumber,
          multiplier,
          players: []
        });
      }
    }, 100);
  }

  async endRound() {
    try {
      this.currentRound.status = 'ended';
      this.currentRound.endTime = new Date();
      await this.currentRound.save();

      // Save game result with fairness fields
      const gameResult = new GameResult({
        round: this.currentRound.roundNumber,
        crashPoint: this.currentRound.crashPoint,
        startTime: this.currentRound.startTime,
        endTime: this.currentRound.endTime,
        serverSeed: this.currentRound.serverSeed,
        clientSeed: this.currentRound.clientSeed,
        nonce: this.currentRound.nonce
      });
      await gameResult.save();

      // Process bets
      await this.processBets();

      // Broadcast round end
      this.io.to('game-room').emit('round-ended', {
        roundNumber: this.currentRound.roundNumber,
        crashPoint: this.currentRound.crashPoint,
        status: 'crashed'
      });
      this.io.to('game-room').emit('game_state', {
        status: 'crashed',
        roundNumber: this.currentRound.roundNumber,
        multiplier: this.currentRound.crashPoint,
        players: []
      });

      this.currentRound = null;
    } catch (error) {
      console.error('Error ending round:', error);
    }
  }

  async processBets() {
    try {
      const activeBets = await Bet.find({
        round: this.currentRound.roundNumber,
        status: 'active'
      }).populate('user');

      for (const bet of activeBets) {
        bet.status = 'lost';
        await bet.save();
      }
    } catch (error) {
      console.error('Error processing bets:', error);
    }
  }

  updateActivePlayers() {
    const count = this.activePlayers.size;
    this.io.to('game-room').emit('active-players', count);
  }
}

module.exports = { GameSocketHandler };
