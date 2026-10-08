import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Settings from './Settings.jsx';
import * as llmSettingsService from '../services/llmSettingsService.js';
import * as userService from '../services/userService.js';

describe('Settings Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders key status and opens API key modal when hasKey is false', async () => {
    vi.spyOn(llmSettingsService, 'getLlmSettings').mockResolvedValue({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      hasKey: false,
      keyLast4: null,
      serverKeyAvailable: true,
      serverKeyRemainingToday: 25,
    });

    vi.spyOn(llmSettingsService, 'getSuggestedModels').mockResolvedValue({
      items: [{ id: 'meta-llama/llama-3.3-70b-instruct:free', note: 'Fast & free' }],
    });

    vi.spyOn(userService, 'getMe').mockResolvedValue({
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
      expect(screen.getByText(/Shared demo key - 25 messages left today/i)).toBeInTheDocument();
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

  it('hasKey true shows only the last 4 characters and active model', async () => {
    vi.spyOn(llmSettingsService, 'getLlmSettings').mockResolvedValue({
      provider: 'openrouter',
      model: 'google/gemini-2.0-flash-exp:free',
      hasKey: true,
      keyLast4: 'a1b2',
      serverKeyAvailable: true,
      serverKeyRemainingToday: 30,
    });

    vi.spyOn(userService, 'getMe').mockResolvedValue({
      user: {
        name: 'Prabha',
        email: 'prabha@demo.skillgraph.dev',
      },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('YOUR KEY')).toBeInTheDocument();
      const statusText = screen.getByTestId('key-status-text');
      expect(statusText).toHaveTextContent('Your key ****a1b2 - model google/gemini-2.0-flash-exp:free');
      expect(screen.getByRole('button', { name: /REMOVE KEY/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /TEST KEY/i })).toBeInTheDocument();
    });
  });

  it('remove asks for confirmation before deleting the key', async () => {
    vi.spyOn(llmSettingsService, 'getLlmSettings').mockResolvedValue({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      hasKey: true,
      keyLast4: '9988',
      serverKeyAvailable: true,
      serverKeyRemainingToday: 30,
    });

    const removeSpy = vi.spyOn(llmSettingsService, 'removeLlmKey').mockResolvedValue({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      hasKey: false,
      keyLast4: null,
      serverKeyAvailable: true,
      serverKeyRemainingToday: 30,
    });

    vi.spyOn(userService, 'getMe').mockResolvedValue({ user: { name: 'Student' } });

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /REMOVE KEY/i })).toBeInTheDocument();
    });

    // 1. User cancels confirmation dialog -> removeLlmKey must NOT be called
    confirmSpy.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: /REMOVE KEY/i }));
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to remove your API key?');
    expect(removeSpy).not.toHaveBeenCalled();

    // 2. User confirms confirmation dialog -> removeLlmKey is called
    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: /REMOVE KEY/i }));
    expect(removeSpy).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText(/Shared demo key - 30 messages left today/i)).toBeInTheDocument();
    });
  });

  it('key input is cleared after save and modal closes', async () => {
    vi.spyOn(llmSettingsService, 'getLlmSettings')
      .mockResolvedValueOnce({
        provider: 'openrouter',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        hasKey: false,
        keyLast4: null,
        serverKeyAvailable: true,
        serverKeyRemainingToday: 30,
      })
      .mockResolvedValue({
        provider: 'openrouter',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        hasKey: true,
        keyLast4: '1234',
        serverKeyAvailable: true,
        serverKeyRemainingToday: 30,
      });

    vi.spyOn(llmSettingsService, 'getSuggestedModels').mockResolvedValue({
      items: [],
    });

    const updateSpy = vi.spyOn(llmSettingsService, 'updateLlmSettings').mockResolvedValue({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      hasKey: true,
      keyLast4: '1234',
      serverKeyAvailable: true,
      serverKeyRemainingToday: 30,
    });

    vi.spyOn(userService, 'getMe').mockResolvedValue({ user: { name: 'Student' } });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ADD KEY/i })).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /ADD KEY/i }));

    const keyInput = screen.getByPlaceholderText('sk-or-v1-...');
    expect(keyInput).toBeInTheDocument();

    // Enter a key
    fireEvent.change(keyInput, { target: { value: 'sk-or-v1-testkey1234' } });
    expect(keyInput.value).toBe('sk-or-v1-testkey1234');

    // Click Save Settings
    const saveBtn = screen.getByRole('button', { name: /SAVE SETTINGS/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'sk-or-v1-testkey1234' }),
      );
    });

    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('sk-or-v1-...')).not.toBeInTheDocument();
    });

    // Reopen modal: verify key is NOT displayed in input and input is completely empty
    const manageKeyBtn = await screen.findByRole('button', { name: /MANAGE KEY/i });
    fireEvent.click(manageKeyBtn);

    await waitFor(() => {
      const reopenedInput = screen.getByPlaceholderText(/••••••••••••1234 \(Stored\)/i);
      expect(reopenedInput).toBeInTheDocument();
      expect(reopenedInput.value).toBe('');
    });
  });

  it('test key shows readable error on failure while keeping key saved and offering remove key', async () => {
    vi.spyOn(llmSettingsService, 'getLlmSettings').mockResolvedValue({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      hasKey: true,
      keyLast4: '5566',
      serverKeyAvailable: true,
      serverKeyRemainingToday: 30,
    });

    vi.spyOn(llmSettingsService, 'testLlmKey').mockRejectedValue(
      new Error('The key was rejected by OpenRouter.'),
    );

    vi.spyOn(userService, 'getMe').mockResolvedValue({ user: { name: 'Student' } });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /TEST KEY/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /TEST KEY/i }));

    await waitFor(() => {
      expect(screen.getByText(/The key was rejected by OpenRouter/i)).toBeInTheDocument();
      // Key remains saved with status
      expect(screen.getByTestId('key-status-text')).toHaveTextContent('Your key ****5566');
      // Remove key option is offered
      expect(screen.getByRole('button', { name: /REMOVE KEY/i })).toBeInTheDocument();
    });
  });

  it('renders ErrorState with RETRY when loading settings fails', async () => {
    vi.spyOn(llmSettingsService, 'getLlmSettings').mockRejectedValue(
      new Error('Failed to connect to backend'),
    );

    vi.spyOn(userService, 'getMe').mockResolvedValue({ user: { name: 'Student' } });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('FAILED TO LOAD SETTINGS')).toBeInTheDocument();
      expect(screen.getByText('Failed to connect to backend')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /RETRY/i })).toBeInTheDocument();
    });
  });
});
