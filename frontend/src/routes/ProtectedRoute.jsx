import { Navigate, useLocation, Outlet } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';

/**
 * Route guard that ensures the caller is authenticated.
 * Redirects unauthenticated users to /login?next=<path>.
 * Redirects users who haven't completed onboarding to /onboarding.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.children]
 */
export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton variant="rectangular" height={48} />
          <Skeleton variant="card" height={160} />
        </div>
      </div>
    );
  }

  if (!user) {
    const nextPath = location.pathname + location.search;
    const loginUrl = nextPath && nextPath !== '/' ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';
    return <Navigate to={loginUrl} replace />;
  }

  if (!user.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
