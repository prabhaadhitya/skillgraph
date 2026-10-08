import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api.js', async () => {
  const actual = await vi.importActual('../services/api.js');
  return {
    ...actual,
    USE_MOCKS: true,
  };
});

import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/ui/Toast.jsx';
import LearningPath from './LearningPath.jsx';
import * as analysisService from '../services/analysisService.js';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders READY NOW badge only when isReadyNow is true, and displays Needs for blocked steps', async () => {
    renderLearningPath();

    await waitFor(() => {
      expect(screen.getByText('ORDERED LEARNING PATH')).toBeInTheDocument();
      expect(screen.getByText('29 steps')).toBeInTheDocument();
    });

    // Step 1: Statistics (isReadyNow: true)
    const card1 = screen.getByTestId('step-card-1');
    expect(within(card1).getByText('READY NOW')).toBeInTheDocument();
    expect(within(card1).getByText('Statistics')).toBeInTheDocument();

    // Step 3: Machine Learning Fundamentals (isReadyNow: false)
    const card3 = screen.getByTestId('step-card-3');
    expect(within(card3).queryByText('READY NOW')).not.toBeInTheDocument();
    expect(within(card3).getByText(/Needs:/i)).toBeInTheDocument();
  });

  it('changing level in inline LevelPicker calls PATCH and shows Done stamp on completion', async () => {
    const updateSkillSpy = vi.spyOn(analysisService, 'updateSkill');
    renderLearningPath();

    await waitFor(() => {
      expect(screen.getByText('ORDERED LEARNING PATH')).toBeInTheDocument();
    });

    const card1 = screen.getByTestId('step-card-1');
    // Step 1 target level is 4 (Lv 1 -> Lv 4)
    // Select level 4 in the LevelPicker
    const level4Radio = within(card1).getByRole('radio', { name: /4 Advanced/i });
    fireEvent.click(level4Radio);

    // Verify PATCH was called for statistics with proficiency 4
    await waitFor(() => {
      expect(updateSkillSpy).toHaveBeenCalledWith('statistics', 4);
    });

    // Verify celebratory Done stamp appears
    expect(within(card1).getByText('✓ Done')).toBeInTheDocument();
  });

  it('weeks filter dims steps that exceed the time budget', async () => {
    renderLearningPath();

    await waitFor(() => {
      expect(screen.getByLabelText(/Time filter in weeks/i)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Time filter in weeks/i);
    const card1 = screen.getByTestId('step-card-1'); // 9 pts
    const card2 = screen.getByTestId('step-card-2'); // 9 pts (cumulative 18 pts)

    // Filter by 1 week (budget = 6 pts).
    // Card 1 has 9 pts > 6 pts, so card 1 should be dimmed.
    fireEvent.change(select, { target: { value: '1' } });
    expect(card1).toHaveAttribute('data-dimmed', 'true');
    expect(card2).toHaveAttribute('data-dimmed', 'true');

    // Filter by 2 weeks (budget = 12 pts).
    // Card 1 (9 pts <= 12 pts) is NOT dimmed; Card 2 (18 pts > 12 pts) IS dimmed.
    fireEvent.change(select, { target: { value: '2' } });
    expect(card1).toHaveAttribute('data-dimmed', 'false');
    expect(card2).toHaveAttribute('data-dimmed', 'true');

    // Clear filter (all steps within budget)
    fireEvent.change(select, { target: { value: '' } });
    expect(card1).toHaveAttribute('data-dimmed', 'false');
    expect(card2).toHaveAttribute('data-dimmed', 'false');
  });
});
