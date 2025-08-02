import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiService, AuthResponse, LoginRequest, RegisterRequest } from '@/services/api.service';


const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let hasInitialized = false;
    
    const initializeAuth = async () => {
      if (!isMounted || hasInitialized) return;
      
      try {
        setIsLoading(true);
        
        // Check if user is already authenticated via cookies
        const response = await apiService.checkAuth();
        
        if (!isMounted) return;
        
        hasInitialized = true;
        
        // Backend response structure: { success: true, isAuthenticated: true, user: {...} }
        if (response?.success && response?.isAuthenticated && response?.user) {
          // User is authenticated via cookies, set user state
          setUser(response.user);
          localStorage.setItem('isAuthenticated', 'true');
        } else {
          console.log('[Auth] User not authenticated, redirecting to login');
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('isAuthenticated');
        }
      } catch (error) {
        console.error('[Auth] Auth initialization error:', error);
        console.error('[Auth] Error details:', {
          status: error.response?.status,
          message: error.response?.data?.message,
          url: error.config?.url
        });
        
        setUser(null);
        setToken(null);
        apiService.setAuthToken(null);
        localStorage.removeItem('isAuthenticated');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    initializeAuth();
    
    // Check auth on page visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && !hasInitialized) {
        initializeAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);  // Add checkAuth method for persistent authentication
  const checkAuth = async () => {
    try {
      // First check if we have a token in sessionStorage
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        return { success: false, isAuthenticated: false };
      }
      
      // Try to validate the token with the server
      const response = await apiService.get('/api/auth/check-auth');
      
      // If we get a valid response, update the auth state
      if (response.data?.isAuthenticated) {
        // Store the updated token if provided
        if (response.data.token) {
          sessionStorage.setItem('authToken', response.data.token);
        }
        return {
          success: true,
          isAuthenticated: true,
          user: response.data.user
        };
      }
      
      return { success: false, isAuthenticated: false };
    } catch (error) {
      console.error('Auth check failed:', error);
      // Don't clear the token on network errors
      if (error.code === 'ERR_NETWORK') {
        // If we have a token but got a network error, assume we're still authenticated
        const token = sessionStorage.getItem('authToken');
        if (token) {
          return { 
            success: true, 
            isAuthenticated: true,
            // Try to get user from localStorage as fallback
            user: JSON.parse(localStorage.getItem('user') || 'null')
          };
        }
      }
      return { success: false, isAuthenticated: false };
    }
  };

  const loadUser = async () => {
    try {
      const response = await apiService.getUserProfile();
      setUser(response);
    } catch (error) {
      console.error('Failed to load user:', error);
      // Handle specific error cases
      if (error.response?.status === 404 && error.response?.data?.message === 'User not found') {
        console.warn('User referenced in token does not exist - clearing invalid token');
        toast({
          title: 'Session Expired',
          description: 'Your session is invalid. Please log in again.',
          variant: 'destructive',
        });
      }
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await apiService.login({ email, password });
      
      // Backend response structure: { success: true, message: "Login successful", user: {...} }
      if (response?.success && response?.user) {
        // Store user data in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Update state
        setUser(response.user);
        setToken('authenticated'); // Use consistent token for cookie-based auth
        apiService.setAuthToken('authenticated');
        
        return { success: true, user: response.user };
      } else {
        return { 
          success: false, 
          error: response?.message || 'Login failed',
          requiresVerification: response?.requiresVerification,
          userId: response?.userId,
          email: response?.email
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      // Clear any partial auth state on error
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      return { success: false, error: error.response?.data?.message || error.message || 'Login failed' };
    }
  };

  const verify2FA = async (token) => {
    try {
      setIsLoading(true);
      const response = await apiService.verify2FA(token);
      
      if (response.verified) {
        // The actual user/token should be returned from the 2FA verification
        // For now, we'll assume the login was successful
        setRequires2FA(false);
        toast({
          title: 'Success!',
          description: 'Two-factor authentication verified.',
        });
        return true;
      } else {
        toast({
          title: 'Invalid Code',
          description: 'The verification code is incorrect.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      const message = error.message;
      toast({
        title: 'Verification failed',
        description: message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await apiService.register(userData);
      
      // Handle redirect for email verification
      if (response.redirect) {
        toast({
          title: 'Registration successful!',
          description: 'Please check your email to verify your account.',
        });
        return response; // Return full response with redirect
      }
      
      // For immediate login (if configured)
      if (response.user && response.token) {
        setUser(response.user);
        setToken(response.token);
        sessionStorage.setItem('authToken', response.token);
        
        toast({
          title: 'Registration successful!',
          description: `Welcome, ${response.user.username}!`,
        });
      }
      
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast({
        title: 'Registration failed',
        description: message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all auth state immediately
      setUser(null);
      setToken(null);
      
      // Clear all storage including any cached auth data
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      localStorage.removeItem('pendingVerification');
      sessionStorage.clear();
      
      // Clear any cached API responses
      if (typeof caches !== 'undefined') {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Force complete page reload to clear any cached state
      window.location.replace('/login');
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    
    try {
      const response = await apiService.getUserProfile();
      setUser(response);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // Don't immediately logout on refresh failure - check if it's a 401
      if (error.response?.status === 401) {
        // Let the axios interceptor handle the token refresh
        console.log('Token refresh will be handled by interceptor');
      } else {
        // Other errors - network issues, etc.
        logout();
      }
    }
  };

  // Add method to check if token is still valid
  const checkTokenValidity = async () => {
    try {
      await apiService.getUserProfile();
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        return false;
      }
      // Network or other errors - assume token might still be valid
      return true;
    }
  };

  // Add method to handle silent re-authentication
  const handleSilentAuthFailure = () => {
    // Instead of immediate logout, provide user feedback
    toast({
      title: 'Session Expired',
      description: 'Your session has expired. Please log in again.',
      variant: 'destructive',
      duration: 5000,
    });
    
    // Small delay before logout to allow user to see the message
    setTimeout(() => {
      logout();
    }, 2000);
  };

  // Register auth failure callback for API service
  useEffect(() => {
    window.authFailureCallback = handleSilentAuthFailure;
    window.showAuthToast = (message) => {
      toast({
        title: 'Authentication Required',
        description: message,
        variant: 'destructive',
        duration: 5000,
      });
    };
    
    return () => {
      delete window.authFailureCallback;
      delete window.showAuthToast;
    };
  }, []);

  // Add proactive token monitoring with better error handling - only check on explicit actions
  useEffect(() => {
    if (!token) return;

    const checkTokenHealth = async () => {
      try {
        // Use a lightweight endpoint to check auth status
        await apiService.checkAuth();
        console.log('Token health check passed');
      } catch (error) {
        console.warn('Token health check failed:', error);
        // Only force logout if we get a 401 and the user is actually logged out
        if (error.response?.status === 401) {
          // Check if we can still access the check-auth endpoint
          try {
            const authCheck = await apiService.checkAuth();
            if (!authCheck.isAuthenticated) {
              handleSilentAuthFailure();
            }
          } catch (secondError) {
            console.error('Confirmed token invalid, forcing logout');
            handleSilentAuthFailure();
          }
        }
      }
    };

    // Check token health only on explicit page focus (not on every visibility change)
    const handleFocus = () => {
      if (token) {
        const lastCheck = sessionStorage.getItem('lastAuthCheck');
        const now = Date.now();
        // Only check every 30 seconds to prevent race conditions
        if (!lastCheck || (now - parseInt(lastCheck)) > 30000) {
          checkTokenHealth();
          sessionStorage.setItem('lastAuthCheck', now.toString());
        }
      }
    };

    // Add a small delay before checking auth to prevent race conditions
    const handleVisibilityChange = () => {
      if (!document.hidden && token) {
        setTimeout(() => {
          const lastCheck = sessionStorage.getItem('lastAuthCheck');
          const now = Date.now();
          if (!lastCheck || (now - parseInt(lastCheck)) > 30000) {
            checkTokenHealth();
            sessionStorage.setItem('lastAuthCheck', now.toString());
          }
        }, 1000);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    requires2FA,
    login,
    verify2FA,
    register,
    logout,
    refreshUser,
    loadUser,
    checkTokenValidity
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
  
  // More defensive approach for development/debugging
  if (!context) {
    console.warn('useAuth called outside AuthProvider - this might be a mounting issue');
    
    // Return safe defaults in development to prevent crashes
    if (process.env.NODE_ENV === 'development') {
      return {
        user: null,
        isLoading: false,
        isAuthenticated: false,
        login: () => Promise.reject(new Error('AuthProvider not available')),
        register: () => Promise.reject(new Error('AuthProvider not available')),
        logout: () => Promise.resolve(),
        checkTokenValidity: () => Promise.resolve(false),
        verify2FA: () => Promise.reject(new Error('AuthProvider not available')),
        setup2FA: () => Promise.reject(new Error('AuthProvider not available')),
        verify2FASetup: () => Promise.reject(new Error('AuthProvider not available')),
        updateProfile: () => Promise.reject(new Error('AuthProvider not available'))
      };
    }
    
    // In production, throw the error
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
