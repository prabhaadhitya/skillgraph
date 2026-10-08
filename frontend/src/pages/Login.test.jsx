import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthContext } from '../context/AuthContext.jsx';
import Login from './Login.jsx';
import { ApiError } from '../services/api.js';

describe('Login Page', () => {
  it('renders email and password inputs and submit button', () => {
    const authValue = {
      user: null,
      isLoading: false,
      login: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /LOG IN/i })).toBeInTheDocument();
  });

  it('shows server error message when login fails with ApiError', async () => {
    const mockLogin = vi.fn().mockRejectedValue(
      new ApiError(401, 'UNAUTHENTICATED', 'Invalid email or password'),
    );

    const authValue = {
      user: null,
      isLoading: false,
      login: mockLogin,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'WrongPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it("shows the server's field error when API returns VALIDATION_ERROR with details", async () => {
    const mockLogin = vi.fn().mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', [
        { field: 'email', message: 'Email address does not exist' },
      ]),
    );

    const authValue = {
      user: null,
      isLoading: false,
      login: mockLogin,
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'nonexistent@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'ValidPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

    await waitFor(() => {
      expect(screen.getByText('Email address does not exist')).toBeInTheDocument();
    });
  });

  it('toggles password visibility when show password button is clicked', () => {
    const authValue = {
      user: null,
      isLoading: false,
      login: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const passwordInput = screen.getByLabelText(/^Password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /Show password/i });
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Hide password/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('redirects already authenticated user away from /login', () => {
    const authValue = {
      user: { id: 'u-1', email: 'test@example.com', onboardingCompleted: true },
      isLoading: false,
      login: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/app/dashboard" element={<div>Dashboard Target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText('Dashboard Target')).toBeInTheDocument();
  });
});
