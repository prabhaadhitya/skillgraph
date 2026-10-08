import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api.js', async () => {
  const actual = await vi.importActual('../services/api.js');
  return {
    ...actual,
    USE_MOCKS: true,
  };
});

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/ui/Toast.jsx';
import SkillGraph from './SkillGraph.jsx';
import * as analysisService from '../services/analysisService.js';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders graph explorer header, toolbar controls, and legend with all 5 states', async () => {
    renderSkillGraph();

    await waitFor(
      () => {
        expect(screen.getByText('GRAPH EXPLORER')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Search skills\.\.\./i)).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /Fit view/i }).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByRole('button', { name: /Zoom in/i }).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByRole('button', { name: /Zoom out/i }).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Show related links/i)).toBeInTheDocument();
      },
      { timeout: 8000 },
    );

    // Verify Legend lists all 5 states
    expect(screen.getByText('Mastered')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Missing')).toBeInTheDocument();
    expect(screen.getByText('Learn next')).toBeInTheDocument();
    expect(screen.getByText('Not in target')).toBeInTheDocument();

    // Detail panel empty/idle state
    expect(
      screen.getByText(/Click any skill node in the graph to view requirements/i),
    ).toBeInTheDocument();
  });

  it('opens panel on node click and closes on Esc key', async () => {
    renderSkillGraph();

    // Wait for nodes to render
    const statNode = await screen.findByText('Statistics', {}, { timeout: 8000 });
    expect(statNode).toBeInTheDocument();

    // Click node to open panel
    fireEvent.click(statNode);

    // Verify panel header and contents appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /STATISTICS/i })).toBeInTheDocument();
      expect(screen.getByText(/Your Proficiency/i)).toBeInTheDocument();
    });

    // Press Escape to close panel
    fireEvent.keyDown(window, { key: 'Escape' });

    // Verify panel closed and shows idle placeholder
    await waitFor(() => {
      expect(
        screen.getByText(/Click any skill node in the graph to view requirements/i),
      ).toBeInTheDocument();
    });
  });

  it('changing level in detail panel calls the right endpoint', async () => {
    const updateSkillSpy = vi.spyOn(analysisService, 'updateSkill');

    renderSkillGraph();

    // Wait for node to load and click it
    const statNode = await screen.findByText('Statistics', {}, { timeout: 8000 });
    fireEvent.click(statNode);

    // Wait for LevelPicker in detail panel
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /STATISTICS/i })).toBeInTheDocument();
    });

    // Click level 3 (Intermediate)
    const level3Radio = screen.getByRole('radio', { name: /3 Intermediate/i });
    fireEvent.click(level3Radio);

    // Check updateSkill was called with right arguments
    await waitFor(() => {
      expect(updateSkillSpy).toHaveBeenCalledWith('statistics', 3);
    });
  });
});
