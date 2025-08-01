const crypto = require('crypto');

class CrashLogic {
  constructor() {
    this.houseEdge = 0.03; // 3% house edge
  }

  generateCrashPoint() {
    // Generate a provably fair crash point
    const seed = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    
    // Convert hash to a number between 0 and 1
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const hashDecimal = hashInt / 0xffffffff;
    
    // Apply house edge and calculate crash point
    let crashPoint = Math.floor(100 / (1 - this.houseEdge - hashDecimal)) / 100;
    
    // Ensure minimum crash point of 1.01x
    crashPoint = Math.max(1.01, crashPoint);
    
    return {
      crashPoint: parseFloat(crashPoint.toFixed(2)),
      seed,
      hash
    };
  }

  verifyCrashPoint(seed, expectedHash) {
    const actualHash = crypto.createHash('sha256').update(seed).digest('hex');
    return actualHash === expectedHash;
  }

  calculateMultiplier(elapsedTime) {
    // Calculate current multiplier based on elapsed time
    const multiplier = Math.floor(elapsedTime / 100) / 10;
    return Math.max(1.0, multiplier);
  }

  isCrashed(elapsedTime, crashPoint) {
    const currentMultiplier = this.calculateMultiplier(elapsedTime);
    return currentMultiplier >= crashPoint;
  }

  generateRandomDelay() {
    // Random delay between 5-15 seconds before next round
    return Math.floor(Math.random() * 10000) + 5000;
  }
}

module.exports = { CrashLogic };
