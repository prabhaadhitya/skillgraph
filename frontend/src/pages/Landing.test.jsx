import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext.jsx';
import Landing from './Landing.jsx';
import { api } from '../services/api.js';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLanding() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const authValue = {
    user: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all section headings', () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      counts: { skills: 71, careers: 5 },
    });

    renderLanding();

    // 1. Hero
    expect(screen.getByRole('heading', { level: 1, name: /YOUR SKILLS/i })).toBeInTheDocument();

    // 2. How it works
    expect(screen.getByRole('heading', { level: 2, name: /FROM SKILLS TO/i })).toBeInTheDocument();

    // 3. Features
    expect(screen.getByRole('heading', { level: 2, name: /EVERYTHING YOU NEED TO/i })).toBeInTheDocument();

    // 4. Careers
    expect(screen.getByRole('heading', { level: 2, name: /FIVE CAREERS TO START/i })).toBeInTheDocument();

    // 5. FAQ
    expect(screen.getByRole('heading', { level: 2, name: /QUESTIONS/i })).toBeInTheDocument();

    // 6. CTA
    expect(screen.getByRole('heading', { level: 2, name: /MAP YOUR NEXT/i })).toBeInTheDocument();
  });

  it('clicking a career chip navigates to /register?career=<slug>', () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      counts: { skills: 71, careers: 5 },
    });

    renderLanding();

    const swChip = screen.getByRole('button', { name: /^Software Developer$/i });
    expect(swChip).toBeInTheDocument();

    fireEvent.click(swChip);
    expect(mockNavigate).toHaveBeenCalledWith('/register?career=software-developer');

    const mlChip = screen.getByRole('button', { name: /^Machine Learning Engineer$/i });
    fireEvent.click(mlChip);
    expect(mockNavigate).toHaveBeenCalledWith('/register?career=machine-learning-engineer');
  });

  it('the stats fall back to 71 and 5 when the request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('Network error loading meta'));

    renderLanding();

    await waitFor(() => {
      const statsSection = screen.getByLabelText(/SkillGraph Statistics/i);
      expect(statsSection).toBeInTheDocument();
      expect(screen.getByText('71')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(within(statsSection).getByText('SKILLS')).toBeInTheDocument();
      expect(within(statsSection).getByText('CAREERS')).toBeInTheDocument();
      expect(within(statsSection).getByText('GRAPH')).toBeInTheDocument();
      expect(within(statsSection).getByText('GUESSWORK')).toBeInTheDocument();
    });
  });
});
