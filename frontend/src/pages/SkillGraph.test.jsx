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
import SkillGraph from './SkillGraph.jsx';

function renderSkillGraph() {
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
          <SkillGraph />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('SkillGraph Page', () => {
  it('renders graph explorer header, toolbar controls, and detail panel', async () => {
    renderSkillGraph();

    await waitFor(
      () => {
        expect(screen.getByText('GRAPH EXPLORER')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Search skills\.\.\./i)).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /Fit view/i }).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Show related/i)).toBeInTheDocument();
      },
      { timeout: 8000 },
    );

    // Detail panel empty/idle state
    expect(
      screen.getByText(/Click any skill node in the graph to view requirements/i),
    ).toBeInTheDocument();
  });
});
