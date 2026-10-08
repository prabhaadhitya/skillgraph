import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SummaryStats } from './SummaryStats.jsx';
import { AlignmentCard } from './AlignmentCard.jsx';
import { NextSkillsList } from './NextSkillsList.jsx';
import { DashboardPage } from './DashboardPage.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import * as dashboardService from '../../services/dashboardService.js';
import mockDashboardData from '../../mocks/dashboard.mock.json';

vi.mock('../../services/dashboardService.js', () => ({
  useDashboard: vi.fn(),
  getDashboard: vi.fn(),
}));

describe('Dashboard Components', () => {
  it('SummaryStats renders counts correctly', () => {
    const summary = {
      strong: 6,
      developing: 5,
      missing: 24,
      total: 35,
    };

    render(<SummaryStats summary={summary} />);

    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('STRONG')).toBeInTheDocument();
    expect(screen.getByText('DEVELOPING')).toBeInTheDocument();
    expect(screen.getByText('MISSING')).toBeInTheDocument();
    expect(screen.getByText(/35 TOTAL SKILLS/i)).toBeInTheDocument();
  });

  it('AlignmentCard renders percentage, label, and previous vs current comparison', () => {
    const fit = {
      score: 26,
      previousScore: 19,
      delta: 7,
      band: 'early',
    };

    render(<AlignmentCard fit={fit} />);

    expect(screen.getByText(/ESTIMATED CAREER ALIGNMENT/i)).toBeInTheDocument();
    expect(screen.getByText('26%')).toBeInTheDocument();
    expect(screen.getByText(/Previous 19% → Current 26%/i)).toBeInTheDocument();
    expect(screen.getByText(/▲7/i)).toBeInTheDocument();
    expect(screen.getByText('early')).toBeInTheDocument();
  });

  it('NextSkillsList renders items 1-3 with reasons and strategy badge', () => {
    render(
      <MemoryRouter>
        <NextSkillsList
          nextSkills={mockDashboardData.nextSkills}
          strategy="rule"
          fallbackReason="ML_UNAVAILABLE"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('Linear Algebra')).toBeInTheDocument();
    expect(screen.getByText('Pandas')).toBeInTheDocument();
    expect(screen.getByText('RULES')).toBeInTheDocument();
    expect(screen.getByText(/Using rule engine fallback/i)).toBeInTheDocument();
  });

  it('DashboardPage renders full dashboard matching prabha mock data (fit 26, summary 6/5/24/35)', () => {
    dashboardService.useDashboard.mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const mockAuth = {
      user: { name: 'Prabha', targetCareer: { name: 'Machine Learning Engineer' } },
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={mockAuth}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText(/Welcome Back, Prabha/i)).toBeInTheDocument();
    expect(screen.getByText('26%')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText(/35 TOTAL SKILLS/i)).toBeInTheDocument();
    expect(screen.getByText('Skill Graph Topology')).toBeInTheDocument();
  });

  it('DashboardPage displays empty profile banner when student has no rated skills', () => {
    dashboardService.useDashboard.mockReturnValue({
      data: {
        ...mockDashboardData,
        summary: { strong: 0, developing: 0, missing: 20, total: 20 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const mockAuth = {
      user: { name: 'Newbie', targetCareer: { name: 'Data Analyst' } },
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={mockAuth}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText(/Add your skills to see your progress/i)).toBeInTheDocument();
  });
});
