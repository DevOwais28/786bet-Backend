import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiService, AuthResponse, LoginRequest, RegisterRequest } from '@/services/api.service';


const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
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
        
        if (response.isAuthenticated && response.user) {
          // User is authenticated via cookies, set user state
          setUser(response.user);
          setToken('authenticated'); // Dummy token since cookies handle auth
          apiService.setAuthToken('authenticated');
        } else if (response.isAuthenticated === false) {
          // Only clear state if we get a definitive "not authenticated" response
          setUser(null);
          setToken(null);
          apiService.setAuthToken(null);
        }
      } catch (error) {
        if (!isMounted) return;
        
        hasInitialized = true;
        console.warn('Auth initialization error (may be temporary):', error);
        // Only clear on actual auth failure
        if (error.response?.status === 401) {
          setUser(null);
          setToken(null);
          apiService.setAuthToken(null);
        }
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
  }, []); // Only run once on mount

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

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      const response = await apiService.login(credentials);
      
      if (response.requiresTwoFactor) {
        setRequires2FA(true);
        return { success: false, requires2FA: true };
      }
      
      if (response.success) {
        setUser(response.user);
        setToken(response.token);
        sessionStorage.setItem('authToken', response.token);
        setRequires2FA(false);
        
        // Check if this is the user's first login
        const isFirstLogin = response.user.isFirstLogin;
        
        // Send welcome email only on first login
        if (isFirstLogin) {
          try {
            const emailJSService = (await import('@/services/emailjs.service.js')).default;
            await emailJSService.sendWelcomeEmail(response.user.email, response.user.username);
            console.log('Welcome email sent for first login');
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail login if email fails
          }
        }
        
        toast({
          title: isFirstLogin ? 'Welcome!' : 'Welcome back!',
          description: isFirstLogin ? 
            `Welcome to 786Bet, ${response.user.username}!` : 
            `Logged in as ${response.user.username}`,
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
      setUser(null);
      setToken(null);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
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

  // Add proactive token monitoring with better error handling
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

    // Check token health on page focus and visibility change - but less aggressively
    const handleVisibilityChange = () => {
      if (!document.hidden && token) {
        // Skip check if we just navigated back (within last 2 seconds)
        const lastCheck = sessionStorage.getItem('lastAuthCheck');
        const now = Date.now();
        if (!lastCheck || (now - parseInt(lastCheck)) > 2000) {
          checkTokenHealth();
          sessionStorage.setItem('lastAuthCheck', now.toString());
        }
      }
    };

    const handleFocus = () => {
      if (token) {
        const lastCheck = sessionStorage.getItem('lastAuthCheck');
        const now = Date.now();
        if (!lastCheck || (now - parseInt(lastCheck)) > 2000) {
          checkTokenHealth();
          sessionStorage.setItem('lastAuthCheck', now.toString());
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token]);

  const value = {
    user,
    token,
    isLoading,
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
