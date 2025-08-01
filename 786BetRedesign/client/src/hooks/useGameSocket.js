import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api.service';

export const useGameSocket = () => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState({
    status: 'waiting',
    roundId: 0,
    multiplier: 1.0,
    players: []
  });
  const [balance, setBalance] = useState(0);
  const [myBets, setMyBets] = useState([]);
  const [activeBets, setActiveBets] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);

  const connect = () => {
    if (!token || socketRef.current) return;

    const newSocket = io('https://786bet-backend-production.up.railway.app', {
      transports: ['websocket', 'polling'], 
      withCredentials: true,
      timeout: 10000,
      forceNew: true,
      auth: { token },
      extraHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      upgrade: true,
      rememberUpgrade: true
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('✅ Connected to game server');
      setIsConnected(true);
      setError(null);
      newSocket.emit('join_game_room'); // Ensure user joins game room
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from game server:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔴 Connection error:', error.message);
      setError(`Connection failed: ${error.message}`);
      if (error.message.includes('websocket')) {
        newSocket.io.opts.transports = ['polling'];
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('reconnect_failed', () => {
      console.log('❌ All reconnection attempts failed');
      setError('Unable to connect to game server');
    });

    newSocket.on('game_state', (state) => {
      console.log('📡 Received game state:', state);
      setGameState(state);
    });

    newSocket.on('multiplier_update', (data) => {
      console.log('📡 Received multiplier update:', data);
      setGameState(prev => ({ ...prev, multiplier: data.multiplier }));
    });

    newSocket.on('bet_placed', (data) => {
      setActiveBets(prev => [...prev, data.bet]);
      if (data.bet.user.username === user?.username) {
        setBalance(data.balance);
        setMyBets(prev => [...prev, data.bet]);
      }
    });

    newSocket.on('cash_out', (data) => {
      setActiveBets(prev => prev.filter(b => b.id !== data.bet.id));
      if (data.bet.user.username === user?.username) {
        setBalance(data.balance);
        setMyBets(prev => prev.map(b => b.id === data.bet.id ? data.bet : b));
      }
    });

    newSocket.on('game_crash', (data) => {
      setGameState(prev => ({ ...prev, status: 'crashed' }));
      setActiveBets([]);
      
      setMyBets(prev => prev.map(bet => {
        const updated = data.bets.find(b => b.id === bet.id);
        return updated || bet;
      }));
    });

    newSocket.on('error', (data) => {
      setError(data.message);
    });

    newSocket.on('auth_error', (data) => {
      setError(data.message);
    });

    setSocket(newSocket);
  };

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [token]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  const placeBet = async (amount) => {
    if (!socket || !user) return;
    
    if (balance < amount) {
      setError('Insufficient balance');
      return;
    }

    socket.emit('place_bet', { amount });
  };

  const cashOut = () => {
    if (!socket) return;
    socket.emit('cash_out');
  };

  const refreshBalance = async () => {
    try {
      const profile = await api.getUserProfile();
      setBalance(profile.balance);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  return {
    socket,
    gameState,
    balance,
    myBets,
    activeBets,
    isConnected,
    error,
    connect,
    placeBet,
    cashOut,
    refreshBalance
  };
};
