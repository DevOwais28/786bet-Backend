const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth.routes.js');
const userRoutes = require('./routes/user.routes.js');
const paymentsRoutes = require('./routes/payments.routes.js');
const adminRoutes = require('./routes/admin.routes.js');
const gameRoutes = require('./routes/game.routes.js');
const betsRoutes = require('./routes/bets.routes.js');
const ipTrackingRoutes = require('./routes/ipTracking.routes.js');
const newUserRoutes = require('./routes/user.routes.js');
const newGameRoutes = require('./routes/game.routes.js');

// Load environment variables from the correct path
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

// Validate MongoDB URI
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in .env file');
  console.error('Please check your .env file contains: MONGO_URI=mongodb+srv://...');
  process.exit(1);
}

const app = express();

// Security middleware
app.use(helmet());
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://786bet-redesign.netlify.app',
    'https://786bet-frontend.netlify.app',
    'https://*.netlify.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
}));

// IP Tracking middleware
const { ipTracker } = require('./middleware/ipTracker.middleware');

// IP tracking middleware - enhanced logging
app.use((req, res, next) => {
  const start = Date.now();
  
  // Skip logging for health checks and static files
  if (req.url === '/health' || req.url.startsWith('/uploads/')) {
    return next();
  }

  // Use IP tracker for detailed logging
  const ipMiddleware = ipTracker.createMiddleware({
    logRequests: true,
    rateLimit: true,
    includeUserId: true
  });
  
  ipMiddleware(req, res, (err) => {
    if (err) {
      return next(err);
    }
    
    // Enhanced logging with IP info
    const { method, url, clientIP } = req;
    console.log(`${new Date().toISOString()} - ${method} ${url} - IP: ${clientIP}`);
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${method} ${url} - ${res.statusCode} (${duration}ms) - IP: ${clientIP}`);
    });
    
    next();
  });
});

// Comprehensive server logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  console.log(`🟢 ${new Date().toISOString()} - ${req.method} ${req.originalUrl} - IP: ${clientIP}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
    console.log(`${statusColor} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms) - IP: ${clientIP}`);
  });
  
  next();
});
// Mount routes under `/api
// Server health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: process.env.PORT || 4000
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'API healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth/*',
      wallet: '/api/wallet/*',
      games: '/api/games/*',
      ipTracking: '/api/ip-tracking/*'
    }
  });
});

app.get('/api/auth/test', (req, res) => {
  res.send('API is working!');
});


// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const { method, url, headers, body } = req;
  
  // Skip logging for health checks and static files
  if (url === '/health' || url.startsWith('/uploads/')) {
    return next();
  }
  
  console.log('\n=== Incoming Request ===');
  console.log(`[${new Date().toISOString()}] ${method} ${url}`);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  
  // Log request body (but skip file uploads)
  if (body && Object.keys(body).length > 0 && !req.is('multipart/form-data')) {
    console.log('Body:', JSON.stringify(body, null, 2));
  }
  
  // Log response
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;
    console.log(`\n=== Response (${duration}ms) ===`);
    console.log(`Status: ${res.statusCode}`);
    if (body && typeof body === 'object') {
      console.log('Response Body:', JSON.stringify(body, null, 2));
    } else {
      console.log('Response Body:', body);
    }
    console.log('========================\n');
    return originalSend.call(this, body);
  };
  
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/bets', betsRoutes);
app.use('/api/ip-tracking', ipTrackingRoutes);
app.use('/api/user', newUserRoutes);
app.use('/api/games', newGameRoutes);
app.use('/api/wallet', require('./routes/wallet.routes'));

// MongoDB connection with better error handling
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB Connected:', conn.connection.host);
    console.log('Database:', conn.connection.name);
    
    // Connection events for better debugging
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to DB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Connection string:', process.env.MONGO_URI ? 
      process.env.MONGO_URI.replace(/:[^:]*@/, ':***@') : 'Not found');
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

const port = process.env.PORT || 4000;

// Create HTTP server and Socket.IO
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});
app.get('/', (req, res) => {
  res.send('🎉 Backend is working!');
});
// Import and initialize GameSocketHandler
const { GameSocketHandler } = require('./socket/game.socket.js');
const gameSocketHandler = new GameSocketHandler(io);
gameSocketHandler.initialize();

// Basic connection logging
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Socket.IO server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});
