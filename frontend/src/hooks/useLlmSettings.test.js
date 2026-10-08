import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLlmSettings } from './useLlmSettings.js';
import * as llmSettingsService from '../services/llmSettingsService.js';

describe('useLlmSettings hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads initial settings successfully', async () => {
    vi.spyOn(llmSettingsService, 'getLlmSettings').mockResolvedValue({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      hasKey: false,
      keyLast4: null,
      serverKeyAvailable: true,
      serverKeyRemainingToday: 20,
    });

    const { result } = renderHook(() => useLlmSettings());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.settings).toEqual({
        provider: 'openrouter',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        hasKey: false,
        keyLast4: null,
        serverKeyAvailable: true,
        serverKeyRemainingToday: 20,
      });
      expect(result.current.error).toBeNull();
    });
  });

  it('handles test key failure cleanly', async () => {
    vi.spyOn(llmSettingsService, 'getLlmSettings').mockResolvedValue({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      hasKey: true,
      keyLast4: '1122',
    });

    vi.spyOn(llmSettingsService, 'testLlmKey').mockRejectedValue(
      new Error('The key was rejected by OpenRouter.'),
    );

    const { result } = renderHook(() => useLlmSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let res;
    await act(async () => {
      res = await result.current.testKey();
    });

    expect(res).toEqual({
      ok: false,
      message: 'The key was rejected by OpenRouter.',
    });
    expect(result.current.testResult).toEqual({
      ok: false,
      message: 'The key was rejected by OpenRouter.',
    });
  });

  it('removes key and updates state', async () => {
    vi.spyOn(llmSettingsService, 'getLlmSettings').mockResolvedValue({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      hasKey: true,
      keyLast4: '9988',
    });

    vi.spyOn(llmSettingsService, 'removeLlmKey').mockResolvedValue({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      hasKey: false,
      keyLast4: null,
    });

    const { result } = renderHook(() => useLlmSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.removeKey();
    });

    expect(result.current.settings.hasKey).toBe(false);
    expect(result.current.settings.keyLast4).toBeNull();
  });
});
