import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  requiresConnection?: boolean;
}

export function ProtectedRoute({ requiresConnection = false }: ProtectedRouteProps) {
  const { user, isLoading, connectedAccount, isLoadingAccount } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If route requires connection, check for connected account
  if (requiresConnection) {
    // Still loading account info
    if (isLoadingAccount) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Verificando conta conectada...</p>
          </div>
        </div>
      );
    }

    // No connected account - redirect to connect page
    if (!connectedAccount) {
      return <Navigate to="/connect" state={{ from: location }} replace />;
    }
  }

  return <Outlet />;
}
