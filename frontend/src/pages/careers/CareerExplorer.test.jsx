import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/api.js', async () => {
  const actual = await vi.importActual('../../services/api.js');
  return {
    ...actual,
    USE_MOCKS: true,
  };
});

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../context/AuthContext.jsx';
import { ToastProvider } from '../../components/ui/Toast.jsx';
import CareerExplorer from './CareerExplorer.jsx';

function renderCareerExplorer() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <CareerExplorer />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CareerExplorer Page (/app/careers)', () => {
  it('renders all career cards with alignment percentages and action buttons', async () => {
    renderCareerExplorer();

    await waitFor(
      () => {
        expect(screen.getByText('CAREER EXPLORER')).toBeInTheDocument();
        expect(screen.getByText(/Machine Learning Engineer/i)).toBeInTheDocument();
        expect(screen.getByText(/Data Scientist/i)).toBeInTheDocument();
        expect(screen.getByText(/Software Developer/i)).toBeInTheDocument();
      },
      { timeout: 8000 },
    );

    // Verify alignment percentage is displayed
    expect(screen.getAllByText(/ALIGNMENT/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('WHAT IF I SWITCH?').length).toBeGreaterThanOrEqual(4);
  });

  it('selecting two careers displays the 3-column side-by-side comparison', async () => {
    renderCareerExplorer();

    await waitFor(() => {
      expect(screen.getByText(/Machine Learning Engineer/i)).toBeInTheDocument();
    });

    const compareButtons = screen.getAllByRole('button', { name: /compare/i });
    expect(compareButtons.length).toBeGreaterThanOrEqual(2);

    // Click compare on first and second career
    fireEvent.click(compareButtons[0]);
    fireEvent.click(compareButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('CAREER COMPARISON')).toBeInTheDocument();
      expect(screen.getByText(/IN BOTH TRACKS/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear comparison/i })).toBeInTheDocument();
    });

    // Clear comparison
    fireEvent.click(screen.getByRole('button', { name: /clear comparison/i }));
    await waitFor(() => {
      expect(screen.queryByText('CAREER COMPARISON')).not.toBeInTheDocument();
    });
  });

  it('clicking WHAT IF I SWITCH? opens the what-if simulation modal', async () => {
    renderCareerExplorer();

    await waitFor(() => {
      expect(screen.getByText(/Data Scientist/i)).toBeInTheDocument();
    });

    const whatIfButtons = screen.getAllByRole('button', { name: /what if i switch\?/i });
    fireEvent.click(whatIfButtons[0]);

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /what if i switch\?/i })).toBeInTheDocument();
        expect(screen.getByText(/CURRENT GOAL/i)).toBeInTheDocument();
        expect(screen.getByText(/ALTERNATIVE TRACK/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument();
      },
      { timeout: 8000 },
    );

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    await waitFor(() => {
      expect(screen.queryByText(/CURRENT GOAL/i)).not.toBeInTheDocument();
    });
  });

  it('clicking SET AS TARGET opens the confirmation dialog', async () => {
    renderCareerExplorer();

    await waitFor(() => {
      expect(screen.getByText(/Software Developer/i)).toBeInTheDocument();
    });

    const setTargetButtons = screen.getAllByRole('button', { name: /set as target/i });
    if (setTargetButtons.length > 0) {
      fireEvent.click(setTargetButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('SET TARGET CAREER')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /confirm & set target/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      // Cancel dialog
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByText('SET TARGET CAREER')).not.toBeInTheDocument();
      });
    }
  });
});
