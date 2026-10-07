import { Navigate, Outlet, useNavigate } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

/**
 * Route guard that ensures caller has role 'admin'.
 * Renders a friendly 403 page using EmptyState when accessed by a non-admin.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.children]
 */
export function AdminRoute({ children }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

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
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <EmptyState
            icon={<ShieldAlert size={28} className="text-state-missing" />}
            title="THIS AREA IS FOR ADMINS"
            text="You do not have administrative privileges to view this section. Please return to your student dashboard."
            actionLabel="BACK TO DASHBOARD"
            onAction={() => navigate('/app/dashboard')}
          />
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}

export default AdminRoute;
