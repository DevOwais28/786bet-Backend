import axios from 'axios';

// API Service Class
class ApiService {
  constructor() {
    // Use deployment configuration for consistent API URL
    const deploymentConfig = {
      getApiUrl: () => {
        const envUrl = import.meta.env.VITE_API_URL;
        if (envUrl) {
          return envUrl.replace(/\/$/, '');
        }
        
        const isLocal = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost');
        
        return isLocal 
          ? 'http://localhost:4000' 
          : 'https://786bet-backend-production-2302.up.railway.app';
      }
    };
    
    this.baseURL = deploymentConfig.getApiUrl();
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true // Enable cookie sending for cross-origin requests
    });

    // Add deployment-specific configuration
    this.isProduction = window.location.hostname !== 'localhost' && 
                       !window.location.hostname.includes('127.0.0.1') &&
                       !window.location.hostname.includes('localhost');
    
    console.log('[API] Environment:', this.isProduction ? 'Production' : 'Development');
    console.log('[API] Base URL:', this.baseURL);
    console.log('[API] Current hostname:', window.location.hostname);

    // Add setAuthToken method - no longer needed for cookie-based auth
    this.setAuthToken = (token) => {
      // Cookies handle authentication, no manual token needed
    };

    // Add handleAuthFailure method for auth failure handling
    this.handleAuthFailure = () => {
      // Clear local storage and redirect to login
      sessionStorage.clear();
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    };

    // Add response interceptor to handle token refresh and errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Skip refresh-token dance on login/register endpoints
        const skipRefresh = originalRequest.url.includes('/api/auth/login') ||
                         originalRequest.url.includes('/api/auth/register') ||
                         originalRequest.url.includes('/api/auth/refresh-token');
        
        // If error is not 401 or we should skip refresh, reject immediately
        if (error.response?.status !== 401 || skipRefresh) {
          return Promise.reject(error);
        }
        
        // Mark the request as a retry to prevent infinite loops
        if (originalRequest._retry) {
          return Promise.reject(error);
        }
        
        originalRequest._retry = true;
        
        try {
          // Try to refresh the token with deployment-specific handling
          const refreshUrl = `${this.baseURL}/api/auth/refresh-token`;
          console.log('[API] Refreshing token at:', refreshUrl);
          console.log('[API] Current baseURL:', this.baseURL);
          console.log('[API] Current hostname:', window.location.hostname);
          
          const response = await axios.post(refreshUrl, {}, {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          console.log('[API] Token refresh response:', response.data);
          
          // If refresh was successful, retry the original request
          if (response.data.success) {
            return this.api(originalRequest);
          }
        } catch (refreshError) {
          console.error('[API] Failed to refresh token:', refreshError);
          console.error('[API] Refresh error details:', {
            status: refreshError.response?.status,
            message: refreshError.response?.data?.message,
            url: refreshError.config?.url
          });
          
          // If refresh fails, clear auth state and redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('user');
            sessionStorage.clear();
            
            // Force full page reload to clear any cached state
            window.location.replace('/login');
          }
        }
        
        return Promise.reject(error);
      }
    );

    // Add request interceptor to ensure cookies are sent
    this.api.interceptors.request.use(
      (config) => {
        // Ensure credentials are sent with every request
        config.withCredentials = true;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add method to check token health proactively
    this.checkTokenHealth = async () => {
      try {
        const response = await this.api.get('/api/auth/check-auth');
        return response.data?.success === true;
      } catch (error) {
        return false;
      }
    };

    // Add checkAuth method for persistent authentication
    this.checkAuth = async () => {
      try {
        const response = await this.api.get('/api/auth/check-auth');
        return response.data;
      } catch (error) {
        console.error('Auth check failed:', error);
        return { success: false, isAuthenticated: false };
      }
    };
  }

  // Authentication
  async login(credentials) {
    try {
      // Ensure proper JSON formatting by validating and cleaning data
      const cleanCredentials = {
        email: credentials.email?.toString().trim() || '',
        password: credentials.password?.toString() || ''
      };
      
      const loginUrl = `${this.baseURL}/api/auth/login`;
      console.log('[API] Login URL:', loginUrl);
      const response = await axios.post(loginUrl, cleanCredentials, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('[API] Login response:', response);
      return response.data;
    } catch (error) {
      console.error('[API] Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      console.log('[API] Registering user with data:', userData);
      const registerUrl = `${this.baseURL}/api/auth/register`;
      
      const response = await axios.post(registerUrl, userData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('[API] Registration response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Registration error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      // Ensure we call logout with proper credentials to invalidate backend session
      const response = await axios.post(`${this.baseURL}/api/auth/logout`, {}, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Clear all local storage
      sessionStorage.clear();
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage even if backend call fails
      sessionStorage.clear();
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      throw error;
    }
  }

  async verify2FA(code) {
    const response = await this.api.post('/api/auth/2fa', { code });
    return response.data;
  }

  // User Profile
  async getUserProfile() {
    try {
      const response = await this.api.get('/api/users/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(data) {
    const response = await this.api.put('/api/users/profile', data);
    return response.data;
  }

  async uploadAvatar(formData) {
    const response = await this.api.post('/api/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  }

  // 2FA Management
  async setup2FA() {
    const response = await this.api.get('/api/auth/2fa/setup');
    return response.data;
  }

  async verify2FASetup(token) {
    const response = await this.api.post('/api/auth/2fa', { token });
    return response.data;
  }

  async updateProfile(data) {
    const response = await this.api.put('/api/profile/me', data);
    return response.data;
  }

  // Payment Methods
  async getPaymentMethods() {
    try {
      const response = await this.api.get('/api/payments/methods');
      return response.data;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  // Deposits
  async createDeposit(depositData) {
    try {
      const response = await this.api.post('/api/payments/deposit', depositData);
      return response.data;
    } catch (error) {
      console.error('Error creating deposit:', error);
      throw error;
    }
  }

  async uploadPaymentProof(depositId, file) {
    const formData = new FormData();
    formData.append('proof', file);
    const response = await this.api.post(`/api/deposits/${depositId}/proof`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  }

  // Game Endpoints
  async getGameHistory() {
    const response = await this.api.get('/api/bets/history');
    return response.data;
  }

  async placeBet(betData) {
    const response = await this.api.post('/api/games/bet', betData);
    return response.data;
  }

  async cashOut(gameId) {
    const response = await this.api.post(`/api/games/${gameId}/cashout`);
    return response.data;
  }

  // Admin Endpoints
  async getAllDeposits() {
    const response = await this.api.get('/api/admin/deposits');
    return response.data;
  }

  async approveDeposit(depositId) {
    const response = await this.api.post(`/api/admin/deposits/${depositId}/approve`);
    return response.data;
  }

  async rejectDeposit(depositId, reason) {
    const response = await this.api.post(`/api/admin/deposits/${depositId}/reject`, { reason });
    return response.data;
  }

  // Transactions
  async getDepositProofs(status) {
    const params = status ? `?status=${status}` : '';
    const response = await this.api.get(`/api/deposit/deposit-proofs${params}`);
    return response.data;
  }

  async updateDepositStatus(proofId, status, reason) {
    const response = await this.api.put(`/api/deposit/deposit-proofs/${proofId}`, { status, reason });
    return response.data;
  }

  // Withdrawals
  async createWithdrawal(data) {
    const response = await this.api.post('/api/payments/withdraw', data);
    return response.data;
  }

  async uploadWithdrawalProof(withdrawalId, file) {
    const formData = new FormData();
    formData.append('screenshot', file);

    const response = await this.api.post('/api/withdrawal/upload-withdrawal-screenshot', formData);
    return response.data;
  }

  async getWithdrawalHistory() {
    const response = await this.api.get('/api/payments/transactions?type=withdrawal');
    return response.data;
  }

  // Game Logic (Aviator)
  async getCurrentGame() {
    const response = await this.api.get('/api/games/current');
    return response.data;
  }

  async getGameSettings() {
    const response = await this.api.get('/api/games/settings');
    return response.data;
  }

  async getGameHistory(limit = 10) {
    const response = await this.api.get(`/api/games/history?limit=${limit}`);
    return response.data;
  }

  // Aviator Game Endpoints
  async placeBet(amount) {
    const response = await this.api.post('/api/bets/place', { amount });
    return response.data;
  }

  async cashOut(betId, multiplier) {
    const response = await this.api.post('/api/bets/cashout', { betId, multiplier });
    return response.data;
  }

  async getBetHistory(limit = 10) {
    const response = await this.api.get(`/api/bets/history?limit=${limit}`);
    
    const formatTimeAgo = (timestamp) => {
      const now = new Date();
      const past = new Date(timestamp);
      const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
      
      if (seconds < 60) return `${seconds} seconds ago`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
      return `${Math.floor(seconds / 86400)} days ago`;
    };
    
    return response.data.map(bet => ({
      ...bet,
      betAmount: bet.amount,
      payout: bet.profit || 0,
      multiplier: bet.multiplier || 0,
      timeAgo: formatTimeAgo(bet.createdAt || bet.timestamp)
    }));
  }

  async getActiveBets(roundNumber) {
    const response = await this.api.get(`/api/bets/active/${roundNumber}`);
    return response.data;
  }

  // Wallet
  async getWalletBalance() {
    const response = await this.api.get('/api/users/dashboard');
    return response.data;
  }

  async getTransactionHistory(limit = 20) {
    const response = await this.api.get(`/api/payments/transactions?limit=${limit}`);
    return response.data;
  }

  // Password Reset
  async forgotPassword(email) {
    const response = await this.api.post('/api/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token, newPassword) {
    const response = await this.api.post('/api/auth/reset-password', { 
      token, 
      newPassword 
    });
    return response.data;
  }
}

// Export empty objects for compatibility with AuthContext imports
export const AuthResponse = {};
export const LoginRequest = {};
export const RegisterRequest = {};

// Create singleton instance
export const apiService = new ApiService();

// Export api for compatibility with useGameSocket.js
export const api = apiService;
