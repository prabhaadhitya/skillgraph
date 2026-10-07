import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { SkillNode } from './SkillNode.jsx';

describe('SkillNode', () => {
  it('renders skill name, level text, and correct aria-label', () => {
    const mockData = {
      name: 'Statistics',
      state: 'missing',
      proficiency: 1,
      requiredLevel: 4,
      category: 'data-analytics',
    };

    render(
      <ReactFlowProvider>
        <SkillNode data={mockData} />
      </ReactFlowProvider>,
    );

    // Verify skill name
    expect(screen.getByText('Statistics')).toBeInTheDocument();

    // Verify Lv 1 / 4 text
    expect(screen.getByText('Lv 1 / 4')).toBeInTheDocument();

    // Verify aria-label
    const nodeElement = screen.getByRole('button');
    expect(nodeElement).toHaveAttribute(
      'aria-label',
      'Statistics, missing, level 1 of 4 required',
    );
  });

  it('renders the NEXT sticker when node is recommended', () => {
    const mockData = {
      name: 'Linear Algebra',
      state: 'recommended',
      proficiency: 0,
      requiredLevel: 3,
      category: 'machine-learning',
    };

    render(
      <ReactFlowProvider>
        <SkillNode data={mockData} />
      </ReactFlowProvider>,
    );

    expect(screen.getByText('NEXT')).toBeInTheDocument();
    expect(screen.getByText('Linear Algebra')).toBeInTheDocument();
    expect(screen.getByText('Lv 0 / 3')).toBeInTheDocument();
  });
});
