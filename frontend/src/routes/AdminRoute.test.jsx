import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthContext } from '../context/AuthContext.jsx';
import { AdminRoute } from './AdminRoute.jsx';

describe('AdminRoute guard', () => {
  it('redirects unauthenticated user to /login', () => {
    const authValue = {
      user: null,
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <div>Secret Admin Panel</div>
                </AdminRoute>
              }
            />
            <Route path="/login" element={<div>Login Page Target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.queryByText('Secret Admin Panel')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page Target')).toBeInTheDocument();
  });

  it('renders friendly 403 page when accessed by a student', () => {
    const authValue = {
      user: {
        id: 'u-student',
        name: 'Regular Student',
        role: 'student',
        onboardingCompleted: true,
      },
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <div>Secret Admin Panel</div>
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.queryByText('Secret Admin Panel')).not.toBeInTheDocument();
    expect(screen.getByText('THIS AREA IS FOR ADMINS')).toBeInTheDocument();
    expect(
      screen.getByText(/You do not have administrative privileges/i),
    ).toBeInTheDocument();
  });

  it('renders admin content when caller has role admin', () => {
    const authValue = {
      user: {
        id: 'u-admin',
        name: 'System Admin',
        role: 'admin',
        onboardingCompleted: true,
      },
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <div>Secret Admin Panel</div>
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText('Secret Admin Panel')).toBeInTheDocument();
  });
});
