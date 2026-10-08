import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Settings from './Settings.jsx';
import * as llmSettingsService from '../services/llmSettingsService.js';
import * as userService from '../services/userService.js';

describe('Settings Page', () => {
  it('renders key status and opens API key modal', async () => {
    vi.spyOn(llmSettingsService, 'getLlmSettings').mockResolvedValueOnce({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      hasKey: false,
      keyLast4: null,
      serverKeyAvailable: true,
      serverKeyRemainingToday: 25,
    });

    vi.spyOn(llmSettingsService, 'getSuggestedModels').mockResolvedValue({
      items: [],
    });

    vi.spyOn(userService, 'getMe').mockResolvedValueOnce({
      user: {
        name: 'Prabha',
        email: 'prabha@demo.skillgraph.dev',
        targetCareer: { name: 'Machine Learning Engineer' },
      },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/^SETTINGS$/i)).toBeInTheDocument();
      expect(screen.getByText(/ASSISTANT KEY & MODEL/i)).toBeInTheDocument();
      expect(screen.getByText('SHARED DEMO KEY')).toBeInTheDocument();
      expect(screen.getByText(/25 messages left today/i)).toBeInTheDocument();
      expect(screen.getByText('Prabha')).toBeInTheDocument();
    });

    // Click ADD KEY to open modal
    const addKeyBtn = screen.getByRole('button', { name: /ADD KEY/i });
    fireEvent.click(addKeyBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /OPENROUTER API KEY/i })).toBeInTheDocument();
      expect(screen.getByText(/1\. CREATE A KEY/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. PASTE YOUR KEY/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. CHOOSE A MODEL/i)).toBeInTheDocument();
    });
  });
});
