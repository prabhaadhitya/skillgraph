import { createBrowserRouter, Navigate } from 'react-router';
import Landing from '../pages/Landing.jsx';
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import ComponentKit from '../pages/ComponentKit.jsx';
import SkillGraph from '../pages/SkillGraph.jsx';
import LearningPath from '../pages/LearningPath.jsx';
import Analytics from '../pages/Analytics.jsx';
import OnboardingPage from '../pages/onboarding/OnboardingPage.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import ProfilePage from '../pages/profile/ProfilePage.jsx';
import AdminLayout from '../pages/admin/AdminLayout.jsx';
import Skills from '../pages/admin/Skills.jsx';
import Relationships from '../pages/admin/Relationships.jsx';
import Careers from '../pages/admin/Careers.jsx';
import Overview from '../pages/admin/Overview.jsx';
import CareerExplorer from '../pages/careers/CareerExplorer.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminRoute from './AdminRoute.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';

function PlaceholderPage({ title }) {
  return (
    <div className="bg-paper text-ink p-8 flex items-center justify-center font-sans">
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
        <OnboardingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/overview" replace />,
      },
      {
        path: 'overview',
        element: <Overview />,
      },
      {
        path: 'skills',
        element: <Skills />,
      },
      {
        path: 'relationships',
        element: <Relationships />,
      },
      {
        path: 'careers',
        element: <Careers />,
      },
    ],
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
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
        path: 'careers',
        element: <CareerExplorer />,
      },
      {
        path: 'analytics',
        element: <Analytics />,
      },
      {
        path: 'assistant',
        element: <PlaceholderPage title="AI ASSISTANT" />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'settings',
        element: <PlaceholderPage title="SETTINGS" />,
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
