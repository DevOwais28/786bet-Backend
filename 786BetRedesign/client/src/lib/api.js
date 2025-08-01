import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Ensure the base URL doesn't end with a slash to avoid double slashes
const normalizedBaseUrl = API_BASE_URL.replace(/\/$/, '');

const api = axios.create({
  baseURL: normalizedBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for refresh tokens
});

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 specifically for refresh token issues
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        await api.post('/api/auth/refresh-token', {}, { withCredentials: true });
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('authToken');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// API service methods
export const authAPI = {
  login: (credentials) =>
    api.post('/api/auth/login', credentials),
  register: (userData) =>
    api.post('/api/auth/register', userData),
  logout: () => api.post('/api/auth/logout'),
  refreshToken: () => api.post('/api/auth/refresh-token'),
};

export const walletAPI = {
  getBalance: () => api.get('/api/wallet'),
  getPaymentDetails: () => api.get('/api/deposit/payment-details'),
  createDeposit: (data) => api.post('/api/deposit', data),
  createWithdrawal: (data) =>
    api.post('/api/withdrawal', data),
  uploadProof: (data) => api.post('/api/deposit/upload-proof', data),
};

export const userAPI = {
  getProfile: () => api.get('/api/profile/me'),
  updateProfile: (data) => api.patch('/api/profile/me', data),
  getBetsHistory: () => api.get('/api/bets/history'),
  getUserStats: () => api.get('/api/user/stats'),
};

export const gameAPI = {
  getGames: () => api.get('/api/games'),
  placeBet: (data) =>
    api.post('/api/games/bet', data),
  cashOut: (betId) => api.post(`/api/games/cash-out/${betId}`),
};

export { api };
export default api;
