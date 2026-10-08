import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/api.js', async () => {
  const actual = await vi.importActual('../../services/api.js');
  return {
    ...actual,
    USE_MOCKS: true,
  };
});

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Overview from './Overview.jsx';

function renderOverview() {
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
        <Overview />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Admin Overview Page (/admin/overview)', () => {
  it('renders overview header and aggregate statboxes', async () => {
    renderOverview();

    await waitFor(
      () => {
        expect(screen.getByText('PLATFORM OVERVIEW')).toBeInTheDocument();
        expect(screen.getByText('TOTAL STUDENTS')).toBeInTheDocument();
        expect(screen.getByText('ONBOARDED')).toBeInTheDocument();
        expect(screen.getByText('AVG ALIGNMENT')).toBeInTheDocument();
        expect(screen.getByText('SKILLS IN GRAPH')).toBeInTheDocument();
        expect(screen.getByText('CAREER TRACKS')).toBeInTheDocument();
      },
      { timeout: 8000 },
    );
  });

  it('renders skill gaps, career distribution, skill popularity, and semester progression tables', async () => {
    renderOverview();

    await waitFor(() => {
      expect(screen.getByText('TOP SKILL GAPS')).toBeInTheDocument();
      expect(screen.getByText('CAREER DISTRIBUTION')).toBeInTheDocument();
      expect(screen.getByText('SKILL POPULARITY')).toBeInTheDocument();
      expect(screen.getByText('SEMESTER PROGRESSION')).toBeInTheDocument();
    });

    // Skill gaps content from mocks
    expect(screen.getByText(/Docker/i)).toBeInTheDocument();
    expect(screen.getByText(/Statistics/i)).toBeInTheDocument();

    // Career distribution content
    expect(screen.getByText(/Machine Learning Engineer/i)).toBeInTheDocument();

    // Skill popularity content
    expect(screen.getByText(/Python/i)).toBeInTheDocument();

    // Semester progression content
    expect(screen.getByText(/Semester 1/i)).toBeInTheDocument();
  });

  it('renders the ML model benchmarks panel with synthetic data badge and metrics', async () => {
    renderOverview();

    await waitFor(() => {
      expect(screen.getByText('MODEL STATUS & BENCHMARKS')).toBeInTheDocument();
      expect(screen.getByText('trained on synthetic data')).toBeInTheDocument();
      expect(screen.getByText('RandomForestClassifier')).toBeInTheDocument();
      expect(screen.getByText('Precision@3')).toBeInTheDocument();
      expect(screen.getByText('Recall@3')).toBeInTheDocument();
      expect(screen.getByText('Hit Rate@3')).toBeInTheDocument();
      expect(screen.getByText('MRR (Mean Reciprocal Rank)')).toBeInTheDocument();
    });
  });
});
