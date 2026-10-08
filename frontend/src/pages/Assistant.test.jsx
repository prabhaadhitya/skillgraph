import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Assistant from './Assistant.jsx';
import * as aiService from '../services/aiService.js';

describe('Assistant Page', () => {
  it('renders header, suggested prompts, and character counter', async () => {
    vi.spyOn(aiService, 'getChatHistory').mockResolvedValueOnce({ items: [] });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/AI ASSISTANT/i)).toBeInTheDocument();
      expect(screen.getByText('GROUNDED')).toBeInTheDocument();
      expect(screen.getByText(/Why should I learn SQL\?/i)).toBeInTheDocument();
      expect(screen.getByText('0/500')).toBeInTheDocument();
    });
  });

  it('sends message and renders grounded reply with degraded notice when degraded', async () => {
    vi.spyOn(aiService, 'getChatHistory').mockResolvedValueOnce({ items: [] });
    vi.spyOn(aiService, 'sendChatMessage').mockResolvedValueOnce({
      reply: 'Statistics is essential for ML Engineer.',
      intent: 'explain_skill',
      degraded: true,
      keySource: 'none',
      model: 'test-model',
      notice: 'Add your own OpenRouter key in Settings for unlimited chat',
      grounding: { skills: ['statistics'], careers: ['ml-engineer'] },
    });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask about your skills/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Ask about your skills/i);
    fireEvent.change(textarea, { target: { value: 'Why statistics?' } });
    expect(screen.getByText('15/500')).toBeInTheDocument();

    const sendBtn = screen.getByRole('button', { name: /SEND/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Statistics is essential for ML Engineer/i)).toBeInTheDocument();
      expect(screen.getByText(/Quick answer \(AI is unavailable right now\)/i)).toBeInTheDocument();
      expect(screen.getByText(/grounded in:/i)).toBeInTheDocument();
      expect(screen.getByText(/Add your own OpenRouter key in Settings/i)).toBeInTheDocument();
    });
  });
});
