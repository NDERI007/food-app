import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@utils/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 🔹 Simple built-in loading UI
  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center text-gray-500'>
        <div className='mr-3 h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent' />
        <span>Loading...</span>
      </div>
    );
  }

  // Not authenticated → redirect to login, preserve current path
  if (!isAuthenticated || !user) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectTo}`} replace />;
  }

  // Authenticated but not authorized
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to='/notfound' replace />;
  }

  // Authorized → render content
  return <>{children}</>;
}
