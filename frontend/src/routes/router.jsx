import { createBrowserRouter } from 'react-router';
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import ComponentKit from '../pages/ComponentKit.jsx';
import SkillGraph from '../pages/SkillGraph.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminRoute from './AdminRoute.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';

function PlaceholderPage({ title }) {
  return (
    <div className="min-h-screen bg-paper text-ink p-8 flex items-center justify-center font-sans">
      <div className="max-w-md w-full">
        <EmptyState title={title} text="Coming soon" />
      </div>
    </div>
  );
}

export const routes = [
  {
    path: '/',
    element: <PlaceholderPage title="LANDING PAGE" />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute>
        <PlaceholderPage title="ONBOARDING WIZARD" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <PlaceholderPage title="ADMIN DASHBOARD" />
      </AdminRoute>
    ),
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        path: 'dashboard',
        element: <PlaceholderPage title="STUDENT DASHBOARD" />,
      },
    ],
  },
];

if (import.meta.env.DEV) {
  routes.push(
    {
      path: '/_kit',
      element: <ComponentKit />,
    },
    {
      path: '/_graph',
      element: <SkillGraph />,
    },
  );
}

export const router = createBrowserRouter(routes);
export default router;
