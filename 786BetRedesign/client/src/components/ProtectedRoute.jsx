import React, { useEffect, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children, adminOnly = false, userOnly = false }) {
  const { user, isLoading, checkTokenValidity } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      try {
        // Skip verification if we already have a user
        if (user) {
          if (isMounted) setIsVerifying(false);
          return;
        }

        // Check if we have auth state in localStorage
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        if (!isAuthenticated) {
          if (isMounted) setIsVerifying(false);
          return;
        }

        // If we have a stored user, use it while we verify
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          // Don't update state here, just use it for the initial render
          if (isMounted) setIsVerifying(false);
        }

        // Verify token validity in the background
        const isValid = await checkTokenValidity();
        if (!isValid) {
          // Clear invalid auth state
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('user');
          sessionStorage.removeItem('authToken');
        }
      } catch (error) {
        console.error('Auth verification error:', error);
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    };

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, [location, user, checkTokenValidity]);

  // Show loading state while verifying auth
  if (isLoading || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Get stored user if available
  const storedUser = localStorage.getItem('user');
  const currentUser = user || (storedUser ? JSON.parse(storedUser) : null);

  // Handle unauthenticated access
  if (!currentUser) {
    // Store the current path to redirect back after login
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname + window.location.search;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      }
    }
    return <Redirect to="/login" />;
  }

  // Handle role-based redirection
  if (adminOnly && currentUser.role !== 'super_admin') {
    return <Redirect to="/dashboard" />;
  }

  if (userOnly && currentUser.role === 'super_admin') {
    return <Redirect to="/admin" />;
  }

  // Render protected content
  return <>{children}</>;
}
