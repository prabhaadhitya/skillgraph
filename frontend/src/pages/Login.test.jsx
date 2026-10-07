import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'WrongPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });
});
