import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { useGameSocket } from '@/hooks/useGameSocket';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function GameRoom() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [theme, setTheme] = useState('dark');
  const {
    socket,
    gameState,
    balance,
    placeBet,
    cashOut,
    isConnected,
    myBets,
    connect,
    error
  } = useGameSocket();

  const [betAmount, setBetAmount] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const MAX_VISIBLE_MULTIPLIER = 10;
  const MIN_BET = 1;
  const MAX_BET = 10000;

  /* ---------- helpers ---------- */
  const toPoint = (m) => {
    const norm = Math.min(m, MAX_VISIBLE_MULTIPLIER);
    const x = (Math.log(Math.max(1, norm)) / Math.log(MAX_VISIBLE_MULTIPLIER)) * 90;
    const y = 100 - Math.pow(norm / MAX_VISIBLE_MULTIPLIER, 2.5) * 90;
    return { x, y };
  };

  const getFlightPath = () => {
    const h = gameState?.history || [];
    if (h.length < 2) return 'M0,100 L0,100';
    const pts = h.map(toPoint).map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`);
    return `M0,100 ${pts.map((p) => `L${p}`).join(' ')}`;
  };

  const planePosition = toPoint(gameState?.multiplier || 1);

  const handleBetAmount = (e) => {
    const v = parseFloat(e.target.value) || 0;
    setBetAmount(Math.max(MIN_BET, Math.min(v, Math.min(balance, MAX_BET))));
  };

  const hasPlacedBet = myBets?.some(b => b.roundNumber === gameState?.roundNumber);
  const canPlaceBet =
    isConnected &&
    gameState?.status === 'waiting' &&
    balance >= betAmount &&
    betAmount >= MIN_BET &&
    betAmount <= MAX_BET &&
    !hasPlacedBet;

  const canCashOut =
    isConnected &&
    gameState?.status === 'running' && hasPlacedBet;

  /* ---------- render ---------- */
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              className="hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Aviator Game</h1>
            <p className="text-gray-400">Welcome, {user?.username || 'Player'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled((b) => !b)}
              className="p-2 rounded-full hover:bg-gray-700/50"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <div className="px-3 py-1 rounded-md bg-gray-700">${balance.toFixed(2)}</div>
          </div>
        </div>

        <main className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            {/* game board */}
            <div className="relative h-96 rounded-xl overflow-hidden border border-gray-700 bg-gray-800/50">
              {/* grid */}
              <div className="absolute inset-0">
                {Array.from({ length: MAX_VISIBLE_MULTIPLIER }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-full h-px bg-gray-700"
                    style={{ bottom: `${(i * 100) / MAX_VISIBLE_MULTIPLIER}%` }}
                  />
                ))}
              </div>

              {/* flight path */}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <path
                  d={getFlightPath()}
                  stroke="url(#flightGradient)"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="flightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>

              {/* plane */}
              {gameState?.status === 'running' && (
                <div
                  className="absolute z-10"
                  style={{
                    left: `${planePosition.x}%`,
                    top: `${planePosition.y}%`,
                    transform: 'translate(-50%,-50%) rotate(75deg)',
                  }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" className="text-amber-400">
                    <path
                      fill="currentColor"
                      d="M22 16.21v-1.895L14 8V4a2 2 0 0 0-4 0v4l-8 6.315v1.895l8-2.857V18l-2 2v1h6v-1l-2-2v-4.667l8 2.857z"
                    />
                  </svg>
                </div>
              )}

              {/* connection status and start button */}
              {!isConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-20">
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-4">Connect to Game</h3>
                    <Button 
                      onClick={connect} 
                      className="bg-amber-600 hover:bg-amber-700 px-8 py-3 text-lg"
                    >
                      Start Game
                    </Button>
                    {error && (
                      <p className="text-red-400 text-sm mt-2">{error}</p>
                    )}
                  </div>
                </div>
              )}

              {/* multiplier label */}
              <div className="absolute top-4 left-4 p-2 bg-black/30 rounded">
                <span className="text-sm opacity-80">Multiplier</span>
                <div className="text-2xl font-bold text-amber-400">
                  {gameState?.multiplier?.toFixed(2)}x
                </div>
              </div>

              {/* connection status indicator */}
              {isConnected && (
                <div className="absolute top-4 right-4 p-2 bg-green-600/20 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Connected</span>
                  </div>
                </div>
              )}

              {/* controls */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                <Input
                  type="number"
                  value={betAmount}
                  onChange={handleBetAmount}
                  min={MIN_BET}
                  max={Math.min(balance, MAX_BET)}
                  className="bg-gray-700 border-gray-600"
                  disabled={!isConnected}
                />
                {gameState?.status === 'running' ? (
                  <Button onClick={cashOut} disabled={!canCashOut} className="bg-green-600">
                    Cash Out
                  </Button>
                ) : (
                  <Button onClick={() => placeBet(betAmount)} disabled={!canPlaceBet} className="bg-amber-600">
                    {canPlaceBet ? 'Place Bet' : 'Insufficient Funds'}
                  </Button>
                )}
              </div>
            </div>

            {/* quick buttons */}
            <div className="grid grid-cols-5 gap-2 mt-4">
              {[1, 5, 10, 50, 100].map((v) => (
                <Button
                  key={v}
                  variant="outline"
                  onClick={() => setBetAmount(Math.min(v, balance))}
                >
                  ${v}
                </Button>
              ))}
            </div>

            {/* recent games */}
            <div className="mt-6 border border-gray-700 rounded-xl">
              <div className="p-3 border-b border-gray-700 font-bold text-amber-500">RECENT GAMES</div>
              <div className="divide-y divide-gray-700">
                {myBets?.length ? (
                  myBets.slice(0, 9).map((b, i) => (
                    <div key={i} className="p-2 flex justify-between text-sm">
                      <span>{user?.username}</span>
                      <span className={b.status === 'cashed_out' ? 'text-green-400' : 'text-red-400'}>
                        {b.multiplier?.toFixed(2)}x
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center opacity-60">No games yet</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}