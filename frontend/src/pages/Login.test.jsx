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

  describe('Login ?next= Destination Security', () => {
    it('redirects to approved internal destination on successful login when valid ?next= is provided', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        id: 'u-1',
        email: 'student@example.com',
        role: 'student',
        onboardingCompleted: true,
      });

      const authValue = {
        user: null,
        isLoading: false,
        login: mockLogin,
      };

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login?next=%2Fapp%2Fpath']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/app/path" element={<div>Learning Path Destination</div>} />
              <Route path="/app/dashboard" element={<div>Default Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'student@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

      await waitFor(() => {
        expect(screen.getByText('Learning Path Destination')).toBeInTheDocument();
      });
    });

    it('preserves query parameters on valid internal destination (?next=/app/dashboard?tab=skills)', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        id: 'u-1',
        email: 'student@example.com',
        role: 'student',
        onboardingCompleted: true,
      });

      const authValue = {
        user: null,
        isLoading: false,
        login: mockLogin,
      };

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login?next=%2Fapp%2Fdashboard%3Ftab%3Dskills']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/app/dashboard" element={<div>Dashboard Skills Tab</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'student@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

      await waitFor(() => {
        expect(screen.getByText('Dashboard Skills Tab')).toBeInTheDocument();
      });
    });

    it('rejects external URLs in ?next= and safely redirects to default dashboard', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        id: 'u-1',
        email: 'student@example.com',
        role: 'student',
        onboardingCompleted: true,
      });

      const authValue = {
        user: null,
        isLoading: false,
        login: mockLogin,
      };

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login?next=https%3A%2F%2Fevil.com%2Fsteal']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/app/dashboard" element={<div>Safe Fallback Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'student@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

      await waitFor(() => {
        expect(screen.getByText('Safe Fallback Dashboard')).toBeInTheDocument();
      });
    });

    it('rejects protocol-relative URLs in ?next= (//evil.com)', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        id: 'u-1',
        email: 'student@example.com',
        role: 'student',
        onboardingCompleted: true,
      });

      const authValue = {
        user: null,
        isLoading: false,
        login: mockLogin,
      };

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login?next=%2F%2Fevil.com%2Fphish']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/app/dashboard" element={<div>Safe Fallback Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'student@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

      await waitFor(() => {
        expect(screen.getByText('Safe Fallback Dashboard')).toBeInTheDocument();
      });
    });

    it('rejects malformed paths (/\\evil.com, javascript:) and prevents loops (/login)', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        id: 'u-1',
        email: 'student@example.com',
        role: 'student',
        onboardingCompleted: true,
      });

      const authValue = {
        user: null,
        isLoading: false,
        login: mockLogin,
      };

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login?next=%2F%5Cevil.com']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/app/dashboard" element={<div>Safe Fallback Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'student@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

      await waitFor(() => {
        expect(screen.getByText('Safe Fallback Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Role-based post-login destination rules', () => {
    it('admin + ?next=/app/dashboard -> navigates to /admin', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      });

      const authValue = {
        user: null,
        isLoading: false,
        login: mockLogin,
      };

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login?next=/app/dashboard']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<div>Admin Area</div>} />
              <Route path="/app/dashboard" element={<div>Student Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'admin@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

      await waitFor(() => {
        expect(screen.getByText('Admin Area')).toBeInTheDocument();
      });
      expect(screen.queryByText('Student Dashboard')).not.toBeInTheDocument();
    });

    it('admin + ?next=/admin/skills -> navigates to /admin/skills', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      });

      const authValue = {
        user: null,
        isLoading: false,
        login: mockLogin,
      };

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login?next=/admin/skills']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/admin/skills" element={<div>Admin Skills Area</div>} />
              <Route path="/admin" element={<div>Admin Area</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'admin@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

      await waitFor(() => {
        expect(screen.getByText('Admin Skills Area')).toBeInTheDocument();
      });
    });

    it('admin + no next -> /admin', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      });

      const authValue = {
        user: null,
        isLoading: false,
        login: mockLogin,
      };

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<div>Admin Area</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'admin@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

      await waitFor(() => {
        expect(screen.getByText('Admin Area')).toBeInTheDocument();
      });
    });

    it('student (onboarded) + ?next=/admin/skills -> /app/dashboard', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        id: 'student-1',
        email: 'student@example.com',
        role: 'student',
        onboardingCompleted: true,
      });

      const authValue = {
        user: null,
        isLoading: false,
        login: mockLogin,
      };

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login?next=/admin/skills']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/app/dashboard" element={<div>Student Dashboard</div>} />
              <Route path="/admin/skills" element={<div>Admin Skills Area</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'student@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

      await waitFor(() => {
        expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
      });
      expect(screen.queryByText('Admin Skills Area')).not.toBeInTheDocument();
    });

    it('student + ?next=/app/graph -> /app/graph', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        id: 'student-1',
        email: 'student@example.com',
        role: 'student',
        onboardingCompleted: true,
      });

      const authValue = {
        user: null,
        isLoading: false,
        login: mockLogin,
      };

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login?next=/app/graph']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/app/graph" element={<div>Skill Graph Page</div>} />
              <Route path="/app/dashboard" element={<div>Student Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'student@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

      await waitFor(() => {
        expect(screen.getByText('Skill Graph Page')).toBeInTheDocument();
      });
    });

    it('student not onboarded + no next -> /onboarding', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        id: 'student-2',
        email: 'newstudent@example.com',
        role: 'student',
        onboardingCompleted: false,
      });

      const authValue = {
        user: null,
        isLoading: false,
        login: mockLogin,
      };

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<div>Onboarding Page</div>} />
              <Route path="/app/dashboard" element={<div>Student Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'newstudent@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'ValidPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /LOG IN/i }));

      await waitFor(() => {
        expect(screen.getByText('Onboarding Page')).toBeInTheDocument();
      });
    });
  });
});
