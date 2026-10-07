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
import Analytics from './Analytics.jsx';

function renderAnalytics() {
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
        <Analytics />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Analytics Page', () => {
  it('renders the three card titles in mock mode', async () => {
    renderAnalytics();

    await waitFor(
      () => {
        expect(screen.getByText('SKILLS BY CATEGORY')).toBeInTheDocument();
        expect(screen.getByText('ALIGNMENT HISTORY')).toBeInTheDocument();
        expect(screen.getByText('TOP MISSING SKILLS')).toBeInTheDocument();
      },
      { timeout: 8000 },
    );

    // Footnote present
    expect(
      screen.getByText(/Estimated career alignment is an estimate, not a prediction/i),
    ).toBeInTheDocument();
  });
});
