// src/utils/formatTime.js
export function formatTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

import axios from 'axios';

// API Service Class
class ApiService {
  constructor() {
    // Use absolute URL in development to ensure proper proxy handling
    this.baseURL = '786bet-backend-production-4988.up.railway.app/api';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true // Enable cookie sending
    });

    // Add setAuthToken method - no longer needed for cookie-based auth
    this.setAuthToken = (token) => {
      // Cookies handle authentication, no manual token needed
    };

    // Add handleAuthFailure method for auth failure handling
    this.handleAuthFailure = () => {
      // Redirect to login page - cookies will be cleared by backend
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    };

    // For cookie-based authentication, we don't need to manually set headers
    // The browser will automatically send cookies with withCredentials: true

    // Add response interceptor to handle token refresh and errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Skip refresh-token dance on login/register endpoints
        const skipRefresh = originalRequest.url.includes('/auth/login') ||
                           originalRequest.url.includes('/auth/register');
        const authErrors = [401, 403, 498];
        if (authErrors.includes(error.response?.status)) {
          // Force logout on any auth failure (no refresh token available)
          sessionStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          this.setAuthToken(null);
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        return Promise.reject(error);
      }
    );

    // Add auth token to requests - cookies handle authentication automatically
    this.api.interceptors.request.use((config) => {
      // Cookies handle authentication via withCredentials: true
      // No need to manually set Authorization header
      return config;
    });

    // Add response interceptor to handle token expiration with retry logic
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401) {
          
          // Don't retry if already retrying
          if (originalRequest._retry) {
            return Promise.reject(error);
          }
          
          originalRequest._retry = true;
          
          // Check if this is a refresh token failure
          if (originalRequest.url?.includes('/auth/refresh-token')) {
            console.error('Refresh token expired, forcing re-authentication');
            // Let auth context handle the failure gracefully
            return Promise.reject(error);
          }
          
          try {
            // Try to refresh token using cookies (no explicit token needed)
            const refreshResponse = await axios.post(`${this.baseURL}/auth/refresh-token`, {}, {
              withCredentials: true
            });
            
            if (refreshResponse.data?.success) {
              console.log('Token refreshed successfully');
              // Cookies handle the token automatically, retry original request
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Don't force logout, let the error propagate for proper handling
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    // Add method to handle authentication failure gracefully
    this.handleAuthFailure = () => {
      const currentToken = sessionStorage.getItem('authToken');
      if (!currentToken) return; // Already logged out
      
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('authUser');
      sessionStorage.setItem('authFailureTime', Date.now().toString());
      
      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname;
      if (!['/login', '/register', '/auth'].some(path => currentPath.includes(path))) {
        // Store current path for redirect after login
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        
        // Use toast notification instead of silent redirect
        if (window.showAuthToast) {
          window.showAuthToast('Session expired. Please log in again.');
        }
        
        // Delay redirect to allow user to see notification
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    };
    
    // Add method to check token health proactively
    this.checkTokenHealth = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        if (!token) return false;
        
        const response = await this.api.get('/auth/check-auth');
        return response.data?.success === true;
      } catch (error) {
        return false;
      }
    };

    // Add checkAuth method for persistent authentication
    this.checkAuth = async () => {
      try {
        const response = await this.api.get('/auth/check-auth');
        return response.data;
      } catch (error) {
        console.error('Auth check failed:', error);
        return { success: false, isAuthenticated: false };
      }
    };
  }

  // Authentication
  async logout() {
    try {
      const response = await this.api.post('/auth/logout');
      // Clear local storage
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage even if backend call fails
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      return { success: true };
    }
  }

  async login(credentials) {
    // Ensure proper JSON formatting by validating and cleaning data
    const cleanCredentials = {
      email: credentials.email?.toString().trim() || '',
      password: credentials.password?.toString().trim() || ''
    };
    
    console.log('[API] Login attempt with clean data:', cleanCredentials);
    const response = await axios.post(`${this.baseURL}/auth/login`, cleanCredentials, {
      withCredentials: true,
    });
    // Force token storage regardless of response structure
    const token = response.data?.token || response.data?.accessToken || response.data?.data?.token;
    if (token) {
      sessionStorage.setItem('authToken', token);
      this.setAuthToken(token);
      console.log('[API] Token stored:', token);
    }
    
    // Store refresh token if provided
    const refreshToken = response.data?.refreshToken || response.data?.data?.refreshToken;
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    return response.data;
  }

  async register(userData) {
    try {
      console.log('[API] Registering user with data:', userData);
      const response = await axios.post(`${this.baseURL}/auth/register`, userData, {
        validateStatus: (status) => status < 500,
        withCredentials: true,
      });
      
      console.log('[API] Registration response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Registration error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      // Format error message from response if available
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Registration failed. Please try again.';
      
      throw new Error(errorMessage);
    }
  }

  async verify2FA(code) {
    const response = await this.api.post('/auth/2fa', { code });
    return response.data;
  }

  // User Profile
  async getUserProfile() {
    try {
      const response = await this.api.get('/users/me');
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        console.error('Authentication failed for getUserProfile:', error.response.data);
        throw new Error('Authentication required');
      }
      throw error;
    }
  }

  async updateUserProfile(data) {
    const response = await this.api.put('/users/profile', data);
    return response.data;
  }

  async uploadAvatar(formData) {
    const response = await this.api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // 2FA Management
  async setup2FA() {
    const response = await this.api.get('/auth/2fa/setup');
    return response.data;
  }

  async verify2FASetup(token) {
    const response = await this.api.post('/auth/2fa', { token });
    return response.data;
  }

  async updateProfile(data) {
    const response = await this.api.put('/profile/me', data);
    return response.data;
  }

  // Payment Methods
  async getPaymentMethods() {
    try {
      const response = await this.api.get('/payments/methods');
      return response.data;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      // Return default USDT method if API fails
      return [{
        id: 'usdt',
        name: 'USDT (TRX)',
        type: 'crypto',
        network: 'TRX',
        status: 'active'
      }];
    }
  }

  // Deposits
  async createDeposit(depositData) {
    try {
      const response = await this.api.post('/payments/deposit', depositData);
      return response.data;
    } catch (error) {
      console.error('Deposit error:', error);
      throw new Error(error.response?.data?.error || 'Failed to create deposit');
    }
  }
  
  // Withdrawals
  async createWithdrawal(withdrawalData) {
    try {
      const response = await this.api.post('/payments/withdraw', withdrawalData);
      return response.data;
    } catch (error) {
      console.error('Withdrawal error:', error);
      throw new Error(error.response?.data?.error || 'Failed to create withdrawal');
    }
  }
  
  // Transactions
  async getTransactions(params = {}) {
    try {
      const response = await this.api.get('/payments/transactions', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  async uploadDepositProof(txId, file, referenceNumber) {
    const formData = new FormData();
    formData.append('proof', file);
    if (referenceNumber) {
      formData.append('referenceNumber', referenceNumber);
    }

    const response = await api.post(`/deposit/deposit/upload-proof`, formData);
    return response.data;
  }

  // Password Reset
  async forgotPassword(email) {
    const response = await this.api.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token, newPassword) {
    const response = await this.api.post('/auth/reset-password', { 
      token, 
      newPassword 
    });
    return response.data;
  }

  async getDepositProofs(status) {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/deposit/deposit-proofs${params}`);
    return response.data;
  }

  async updateDepositStatus(proofId, status, reason) {
    const response = await this.api.put(`/deposit/deposit-proofs/${proofId}`, { status, reason });
    return response.data;
  }

  // Payment Methods
  async createDeposit(depositData) {
    const response = await this.api.post('/payments/deposit', depositData);
    return response.data;
  }



  async uploadPaymentProof(depositId, file) {
    const formData = new FormData();
    formData.append('proof', file);
    const response = await this.api.post(`/deposits/${depositId}/proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  // Game Endpoints
  async getGameHistory() {
    const response = await this.api.get('/bets/history');
    return response.data;
  }

  async placeBet(betData) {
    const response = await this.api.post('/games/bet', betData);
    return response.data;
  }

  async cashOut(gameId) {
    const response = await this.api.post(`/games/${gameId}/cashout`);
    return response.data;
  }

  // Admin Endpoints
  async getAllDeposits() {
    const response = await this.api.get('/admin/deposits');
    return response.data;
  }

  async approveDeposit(depositId) {
    const response = await this.api.post(`/admin/deposits/${depositId}/approve`);
    return response.data;
  }

  async rejectDeposit(depositId, reason) {
    const response = await this.api.post(`/admin/deposits/${depositId}/reject`, { reason });
    return response.data;
  }

  // Transactions


  // Referrals
  async getReferrals() {
    const response = await this.api.get('/referrals');
    return response.data;
  }

  // Withdrawals
  async createWithdrawal(data) {
    const response = await this.api.post('/payments/withdraw', data);
    return response.data;
  }

  async uploadWithdrawalProof(withdrawalId, file) {
    const formData = new FormData();
    formData.append('screenshot', file);

    const response = await this.api.post('/withdrawal/upload-withdrawal-screenshot', formData);
    return response.data;
  }

  async getWithdrawalHistory() {
    const response = await this.api.get('/payments/transactions?type=withdrawal');
    return response.data;
  }

  // Game Logic (Aviator)
  async getCurrentGame() {
    const response = await this.api.get('/games/current');
    return response.data;
  }

  async getGameSettings() {
    const response = await this.api.get('/games/settings');
    return response.data;
  }

  async getGameHistory(limit = 10) {
    const response = await this.api.get(`/games/history?limit=${limit}`);
    return response.data;
  }

  // Aviator Game Endpoints
  async placeBet(amount) {
    const response = await this.api.post('/bets/place', { amount });
    return response.data;
  }

  async cashOut(betId, multiplier) {
    const response = await this.api.post('/bets/cashout', { betId, multiplier });
    return response.data;
  }

  async getBetHistory(limit = 10) {
    const response = await this.api.get(`/bets/history?limit=${limit}`);
    return response.data.map(bet => ({
      ...bet,
      betAmount: bet.amount,
      payout: bet.profit || 0,
      multiplier: bet.multiplier || 0,
      timeAgo: formatTimeAgo(bet.createdAt || bet.timestamp)
    }));
  }

  async getActiveBets(roundNumber) {
    const response = await this.api.get(`/bets/active/${roundNumber}`);
    return response.data;
  }

  // Wallet
  async getWalletBalance() {
    const response = await this.api.get('/users/dashboard');
    return response.data;
  }

  async getTransactionHistory(limit = 20) {
    const response = await this.api.get(`/payments/transactions?limit=${limit}`);
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
