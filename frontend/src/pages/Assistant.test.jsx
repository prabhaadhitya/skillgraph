import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Assistant from './Assistant.jsx';
import * as aiService from '../services/aiService.js';

describe('Assistant Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    const sendBtn = screen.getByRole('button', { name: /SEND/i });
    expect(sendBtn).toBeDisabled();
  });

  it('counter disables send over 500 characters', async () => {
    vi.spyOn(aiService, 'getChatHistory').mockResolvedValueOnce({ items: [] });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    const textarea = await screen.findByPlaceholderText(/Ask about your skills/i);
    const sendBtn = screen.getByRole('button', { name: /SEND/i });

    // Under limit: exactly 500 chars -> enabled
    const valid500 = 'a'.repeat(500);
    fireEvent.change(textarea, { target: { value: valid500 } });
    expect(screen.getByText('500/500')).toBeInTheDocument();
    expect(sendBtn).toBeEnabled();

    // Over limit: 501 chars -> disabled
    const overLimit501 = 'a'.repeat(501);
    fireEvent.change(textarea, { target: { value: overLimit501 } });
    expect(screen.getByText('501/500')).toBeInTheDocument();
    expect(sendBtn).toBeDisabled();

    // Back to normal: 10 chars -> enabled
    fireEvent.change(textarea, { target: { value: 'Valid text' } });
    expect(screen.getByText('10/500')).toBeInTheDocument();
    expect(sendBtn).toBeEnabled();
  });

  it('?q= prefill works from URL search params', async () => {
    vi.spyOn(aiService, 'getChatHistory').mockResolvedValueOnce({ items: [] });

    render(
      <MemoryRouter initialEntries={['/app/assistant?q=Why%20should%20I%20learn%20SQL%3F']}>
        <Assistant />
      </MemoryRouter>,
    );

    const textarea = await screen.findByPlaceholderText(/Ask about your skills/i);
    expect(textarea.value).toBe('Why should I learn SQL?');
    expect(screen.getByText(`${'Why should I learn SQL?'.length}/500`)).toBeInTheDocument();

    const sendBtn = screen.getByRole('button', { name: /SEND/i });
    expect(sendBtn).toBeEnabled();
  });

  it('degraded and notice render under assistant reply', async () => {
    vi.spyOn(aiService, 'getChatHistory').mockResolvedValueOnce({ items: [] });
    vi.spyOn(aiService, 'sendChatMessage').mockResolvedValueOnce({
      reply: 'Statistics is essential for ML Engineer.',
      intent: 'explain_skill',
      degraded: true,
      keySource: 'user',
      model: 'test-model',
      notice: 'Add your own OpenRouter key in Settings for unlimited chat',
      grounding: { skills: ['statistics'], careers: ['ml-engineer'] },
    });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    const textarea = await screen.findByPlaceholderText(/Ask about your skills/i);
    fireEvent.change(textarea, { target: { value: 'Why statistics?' } });

    const sendBtn = screen.getByRole('button', { name: /SEND/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Statistics is essential for ML Engineer/i)).toBeInTheDocument();
      expect(screen.getByText(/Quick answer \(AI is unavailable right now\)/i)).toBeInTheDocument();
      expect(screen.getByText(/grounded in:/i)).toBeInTheDocument();
      expect(screen.getByText(/statistics, ml-engineer/i)).toBeInTheDocument();
      expect(screen.getByText(/Add your own OpenRouter key in Settings/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Settings →/i })).toHaveAttribute('href', '/app/settings');
      expect(screen.getByText('Your key')).toBeInTheDocument();
    });
  });

  it('handles 429 and 502 gracefully without crashing', async () => {
    vi.spyOn(aiService, 'getChatHistory').mockResolvedValueOnce({ items: [] });
    vi.spyOn(aiService, 'sendChatMessage').mockRejectedValueOnce({
      status: 429,
      message: 'Too many requests.',
    });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    const textarea = await screen.findByPlaceholderText(/Ask about your skills/i);
    fireEvent.change(textarea, { target: { value: 'Hello assistant' } });

    const sendBtn = screen.getByRole('button', { name: /SEND/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Too many requests\. Slow down a little/i)).toBeInTheDocument();
    });

    // Dismiss error
    fireEvent.click(screen.getByRole('button', { name: /DISMISS/i }));
    expect(screen.queryByText(/Too many requests\. Slow down a little/i)).not.toBeInTheDocument();

    // Test 502
    vi.spyOn(aiService, 'sendChatMessage').mockRejectedValueOnce({
      status: 502,
      message: 'Upstream gateway error.',
    });
    fireEvent.change(textarea, { target: { value: 'Retry question' } });
    fireEvent.click(screen.getByRole('button', { name: /SEND/i }));

    await waitFor(() => {
      expect(screen.getByText(/Upstream AI service error \(502\)/i)).toBeInTheDocument();
    });
  });

  it('clicking suggested prompt chip triggers message send', async () => {
    vi.spyOn(aiService, 'getChatHistory').mockResolvedValueOnce({ items: [] });
    const sendSpy = vi.spyOn(aiService, 'sendChatMessage').mockResolvedValueOnce({
      reply: 'SQL is the foundation of data querying.',
      intent: 'explain_skill',
      degraded: false,
      keySource: 'server',
      model: 'test-model',
      grounding: { skills: ['sql'] },
    });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    const chip = await screen.findByRole('button', { name: /Why should I learn SQL\?/i });
    fireEvent.click(chip);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith('Why should I learn SQL?');
      expect(screen.getByText(/SQL is the foundation of data querying/i)).toBeInTheDocument();
      expect(screen.getByText('Shared key')).toBeInTheDocument();
    });
  });

  it('clear chat prompts for confirmation and calls DELETE /ai/history', async () => {
    vi.spyOn(aiService, 'getChatHistory').mockResolvedValueOnce({
      items: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi! How can I help?',
          keySource: 'server',
        },
      ],
    });

    const clearSpy = vi.spyOn(aiService, 'clearChatHistory').mockResolvedValueOnce({ cleared: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    const clearBtn = await screen.findByRole('button', { name: /CLEAR CHAT/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to clear your chat history?');
      expect(clearSpy).toHaveBeenCalled();
      expect(screen.queryByText('Hello')).not.toBeInTheDocument();
      expect(screen.queryByText('Hi! How can I help?')).not.toBeInTheDocument();
    });
  });
});
