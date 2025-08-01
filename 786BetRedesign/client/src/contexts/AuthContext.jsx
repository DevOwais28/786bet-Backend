import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api.service';

const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);
  const { toast } = useToast();

  // CRITICAL: Single source of truth for auth initialization
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      if (!isMounted) return;
      
      try {
        setIsLoading(true);
        
        // 1. First, check if we have any stored tokens
        const storedToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        
        // 2. Check cookie-based auth (your backend's session)
        const response = await apiService.checkAuth();
        
        if (!isMounted) return;
        
        if (response.isAuthenticated && response.user) {
          // We have valid auth via cookies
          setUser(response.user);
          setToken(storedToken || 'cookie-auth'); // Use stored token or cookie marker
          
          // Ensure API service has the token
          if (storedToken) {
            apiService.setAuthToken(storedToken);
          }
          
        } else if (storedToken) {
          // We have a stored token but cookie auth failed - try to use it
          apiService.setAuthToken(storedToken);
          try {
            const userResponse = await apiService.getUserProfile();
            setUser(userResponse);
            setToken(storedToken);
          } catch (profileError) {
            // Token is invalid, clear everything
            if (isMounted) {
              sessionStorage.removeItem('authToken');
              localStorage.removeItem('authToken');
              localStorage.removeItem('refreshToken');
              setUser(null);
              setToken(null);
              apiService.setAuthToken(null);
            }
          }
        } else {
          // No auth found
          if (isMounted) {
            setUser(null);
            setToken(null);
            apiService.setAuthToken(null);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.warn('Auth initialization error:', error);
        
        // Network error - don't clear tokens immediately
        const storedToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        if (storedToken) {
          apiService.setAuthToken(storedToken);
          // Try to load user anyway
          try {
            const userResponse = await apiService.getUserProfile();
            setUser(userResponse);
            setToken(storedToken);
          } catch {
            // Only clear on definite auth failure
            if (error.response?.status === 401) {
              sessionStorage.removeItem('authToken');
              localStorage.removeItem('authToken');
              localStorage.removeItem('refreshToken');
              setUser(null);
              setToken(null);
            }
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, []); // Only run on mount

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      const response = await apiService.login(credentials);
      
      if (response.requiresTwoFactor) {
        setRequires2FA(true);
        return { success: false, requires2FA: true };
      }
      
      if (response.success) {
        // Store token in both storages for persistence
        sessionStorage.setItem('authToken', response.token);
        localStorage.setItem('authToken', response.token);
        
        setUser(response.user);
        setToken(response.token);
        setRequires2FA(false);
        apiService.setAuthToken(response.token);
        
        // Send welcome email for first login
        if (response.user.isFirstLogin) {
          try {
            const emailJSService = (await import('@/services/emailjs.service.js')).default;
            await emailJSService.sendWelcomeEmail(response.user.email, response.user.username);
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
          }
        }
        
        toast({
          title: response.user.isFirstLogin ? 'Welcome!' : 'Welcome back!',
          description: `Logged in as ${response.user.username}`,
        });
        
        return { success: true, user: response.user };
      }
      
      throw new Error(response.message || 'Login failed');
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      toast({
        title: 'Login failed',
        description: message,
        variant: 'destructive',
      });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  // Add this method to your AuthContext
  const checkAuthStatus = async () => {
    try {
      const response = await apiService.checkAuth();
      if (response.isAuthenticated && response.user) {
        setUser(response.user);
        const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        setToken(token || 'authenticated');
        apiService.setAuthToken(token);
      } else {
        // Only clear if we get a definitive "not authenticated"
        const storedToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        if (storedToken) {
          // Try one more time with stored token
          apiService.setAuthToken(storedToken);
          const userResponse = await apiService.getUserProfile();
          setUser(userResponse);
          setToken(storedToken);
        } else {
          setUser(null);
          setToken(null);
          apiService.setAuthToken(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Don't clear tokens on network errors
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      apiService.setAuthToken(null);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
    }
  };

  // Remove aggressive token monitoring
  const value = {
    user,
    token,
    isLoading,
    requires2FA,
    login,
    verify2FA: async (token) => {
      // Your existing 2FA logic
      try {
        setIsLoading(true);
        const response = await apiService.verify2FA(token);
        if (response.verified) {
          setRequires2FA(false);
          toast({ title: 'Success!', description: 'Two-factor authentication verified.' });
          return true;
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    register: async (userData) => {
      try {
        setIsLoading(true);
        const response = await apiService.register(userData);
        if (response.redirect) {
          toast({
            title: 'Registration successful!',
            description: 'Please check your email to verify your account.',
          });
        }
        return response;
      } finally {
        setIsLoading(false);
      }
    },
    logout,
    checkAuthStatus, // Add this
    refreshUser: async () => {
      if (!token) return;
      try {
        const userResponse = await apiService.getUserProfile();
        setUser(userResponse);
      } catch (error) {
        if (error.response?.status === 401) {
          logout();
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
          }
      
