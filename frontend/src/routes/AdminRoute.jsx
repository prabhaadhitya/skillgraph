import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { ForbiddenPage } from '../components/feedback/ForbiddenPage.jsx';

/**
 * Route guard that ensures caller has role 'admin'.
 * Renders a friendly 403 page using EmptyState when accessed by a non-admin.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.children]
 */
export function AdminRoute({ children }) {
  const { user, isLoading } = useAuth();

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
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <ForbiddenPage />;
  }

  return children ? children : <Outlet />;
}

export default AdminRoute;
