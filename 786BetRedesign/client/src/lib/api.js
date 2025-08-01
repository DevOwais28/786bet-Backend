import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '786bet-backend-production-2302.up.railway.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
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
  (error) => {
    const authErrors = [401, 403, 498];
    if (authErrors.includes(error.response?.status)) {
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('authToken');
      // Clear cookies by forcing logout
      axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true }).catch(() => {});
      window.location.href = '/login';
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
  refreshToken: () => api.post('/api/auth/refresh'),
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
