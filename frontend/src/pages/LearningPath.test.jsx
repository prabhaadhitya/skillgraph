import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/api.js', async () => {
  const actual = await vi.importActual('../services/api.js');
  return {
    ...actual,
    USE_MOCKS: true,
  };
});

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/ui/Toast.jsx';
import LearningPath from './LearningPath.jsx';

function renderLearningPath() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <LearningPath />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('LearningPath Page', () => {
  it('renders the step count, effort points, and READY NOW badges using mock data', async () => {
    renderLearningPath();

    // Verify header stats
    await waitFor(() => {
      expect(screen.getByText(/ORDERED LEARNING PATH/i)).toBeInTheDocument();
      expect(screen.getByText(/29 steps - 259 effort points/i)).toBeInTheDocument();
    });

    // Verify READY NOW badges for initial unblocked steps
    const readyBadges = screen.getAllByText('READY NOW');
    expect(readyBadges.length).toBeGreaterThan(0);

    // Verify first step name
    expect(screen.getByText('Statistics')).toBeInTheDocument();

    // Verify "Ask why" buttons
    const askWhyButtons = screen.getAllByRole('button', { name: /Ask why/i });
    expect(askWhyButtons.length).toBeGreaterThan(0);
  });
});
