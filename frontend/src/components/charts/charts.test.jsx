import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryBarChart } from './CategoryBarChart.jsx';
import { AlignmentLineChart } from './AlignmentLineChart.jsx';
import { TopMissingBarChart } from './TopMissingBarChart.jsx';
import mockInsights from '../../mocks/insights.mock.json';

describe('Chart Components', () => {
  describe('CategoryBarChart', () => {
    it('renders with mock data and provides accessible aria-label', () => {
      render(<CategoryBarChart data={mockInsights.categoryDistribution} />);

      const region = screen.getByRole('region', {
        name: /Category distribution showing skill counts across 6 categories/i,
      });
      expect(region).toBeInTheDocument();

      // Check accessible table content
      expect(screen.getByText('Programming')).toBeInTheDocument();
      expect(screen.getByText('Data Analytics')).toBeInTheDocument();
    });

    it('toggles metric to average level', () => {
      render(<CategoryBarChart data={mockInsights.categoryDistribution} />);

      const avgLevelBtn = screen.getByRole('button', { name: /Avg Level/i });
      fireEvent.click(avgLevelBtn);

      const region = screen.getByRole('region', {
        name: /Category distribution showing average proficiency levels across 6 categories/i,
      });
      expect(region).toBeInTheDocument();
    });
  });

  describe('AlignmentLineChart', () => {
    it('renders with mock data and provides accessible aria-label', () => {
      render(<AlignmentLineChart data={mockInsights.alignmentHistory} />);

      const region = screen.getByRole('region', {
        name: /Alignment history showing estimated career alignment progress across 4 recorded snapshots/i,
      });
      expect(region).toBeInTheDocument();
      expect(screen.getByText('26%')).toBeInTheDocument();
    });

    it('shows empty state when data has fewer than 2 points', () => {
      render(
        <AlignmentLineChart
          data={[{ at: '2026-10-07T10:00:00.000Z', fitScore: 26 }]}
        />,
      );

      expect(screen.getByText(/Not enough history/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Update your skills a few times to see your progress/i),
      ).toBeInTheDocument();
    });
  });

  describe('TopMissingBarChart', () => {
    it('renders with mock data and provides accessible aria-label', () => {
      render(<TopMissingBarChart data={mockInsights.topMissing} />);

      const region = screen.getByRole('region', {
        name: /Top missing skills showing gap severity for 5 critical skills/i,
      });
      expect(region).toBeInTheDocument();

      // Accessible table renders skill names and gaps
      expect(screen.getByText('Deep Learning Fundamentals')).toBeInTheDocument();
      expect(screen.getByText('PyTorch')).toBeInTheDocument();
      expect(screen.getByText('Docker')).toBeInTheDocument();
    });
  });
});
