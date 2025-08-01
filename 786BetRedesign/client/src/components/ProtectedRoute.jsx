import React from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children, adminOnly = false, userOnly = false }) {
  const { user, isLoading } = useAuth();
  const [hasCheckedAuth, setHasCheckedAuth] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      setHasCheckedAuth(true);
    }
  }, [isLoading]);

  if (isLoading || !hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Store the current path to redirect back after login
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    }
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== 'super_admin') {
    return <Redirect to="/dashboard" />;
  }

  if (userOnly && user.role === 'super_admin') {
    return <Redirect to="/admin" />;
  }

  return <>{children}</>;
}
