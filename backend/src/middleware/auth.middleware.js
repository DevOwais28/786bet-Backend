const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    // Extract token from cookies or authorization header
    let token;
    let tokenSource = 'unknown';

    // Check for token in authorization header (priority)
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      tokenSource = 'header';
    }
    // Check for access token in cookies
    else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
      tokenSource = 'cookie';
    }
    // Check for refresh token cookie (fallback)
    else if (req.cookies?.refreshToken) {
      token = req.cookies.refreshToken;
      tokenSource = 'refresh';
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        details: 'No valid token found in request'
      });
    }

    // Verify the token with appropriate secret
    let decoded;
    try {
      const secret = tokenSource === 'refresh' ? 
        (process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET) : 
        process.env.JWT_SECRET;
      
      decoded = jwt.verify(token, secret);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      return res.status(401).json({ 
        success: false,
        message: 'Token verification failed',
        details: jwtError.message
      });
    }
    
    // Check if user still exists
    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return res.status(401).json({ 
        success: false,
        message: 'User not found',
        details: `User ${userId} not found in database`
      });
    }

    // Attach user to request
    req.user = { 
      userId: user._id, 
      email: user.email, 
      role: user.role,
      tokenSource: tokenSource
    };
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired',
        details: 'Authentication token has expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format',
        details: error.message
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: 'Authentication server error',
      details: error.message
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId || decoded.id);
      if (user) {
        req.user = { userId: user._id, email: user.email, role: user.role };
      }
    }
  } catch (error) {
    // Ignore auth errors for optional auth
    req.user = null;
  }
  
  next();
};

// Role-based authorization middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

// Check if user is admin (any admin role)
const isAdmin = (req, res, next) => {
  const adminRoles = ['super-admin', 'moderator', 'finance'];
  
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      message: 'Admin access required' 
    });
  }
  
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};