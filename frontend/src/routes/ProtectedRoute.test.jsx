import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthContext } from '../context/AuthContext.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';

describe('ProtectedRoute guard', () => {
  it('redirects unauthenticated user to /login?next=<path>', () => {
    const authValue = {
      user: null,
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <Routes>
            <Route
              path="/app/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secret Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page Target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.queryByText('Secret Dashboard')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page Target')).toBeInTheDocument();
  });

  it('redirects authenticated user without onboarding to /onboarding', () => {
    const authValue = {
      user: {
        id: 'u-1',
        name: 'New Student',
        role: 'student',
        onboardingCompleted: false,
      },
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <Routes>
            <Route
              path="/app/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secret Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/onboarding" element={<div>Onboarding Wizard Target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.queryByText('Secret Dashboard')).not.toBeInTheDocument();
    expect(screen.getByText('Onboarding Wizard Target')).toBeInTheDocument();
  });

  it('renders children when user is authenticated and onboarding is completed', () => {
    const authValue = {
      user: {
        id: 'u-2',
        name: 'Prabha',
        role: 'student',
        onboardingCompleted: true,
      },
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <Routes>
            <Route
              path="/app/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secret Dashboard</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText('Secret Dashboard')).toBeInTheDocument();
  });
});
