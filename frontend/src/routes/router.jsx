import { createBrowserRouter } from 'react-router';
import Landing from '../pages/Landing.jsx';
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import ComponentKit from '../pages/ComponentKit.jsx';
import SkillGraph from '../pages/SkillGraph.jsx';
import LearningPath from '../pages/LearningPath.jsx';
import Analytics from '../pages/Analytics.jsx';
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
    element: <Landing />,
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
      {
        path: 'graph',
        element: <SkillGraph />,
      },
      {
        path: 'path',
        element: <LearningPath />,
      },
      {
        path: 'analytics',
        element: <Analytics />,
      },
    ],
  },
];

if (import.meta.env.DEV) {
  routes.push({
    path: '/_kit',
    element: <ComponentKit />,
  });
}

export const router = createBrowserRouter(routes);
export default router;
