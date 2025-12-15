import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, connectedAccounts, loadingAccounts } = useAuth();
  const location = useLocation();

  // Still loading auth state
  if (loading || loadingAccounts) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // No user session - redirect to login
  if (!user) {
    // Store the intended destination
    localStorage.setItem('auth_redirect_to', location.pathname);
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // User logged in but no connected account - redirect to /auth (will show connect step)
  if (connectedAccounts.length === 0) {
    localStorage.setItem('auth_redirect_to', location.pathname);
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
