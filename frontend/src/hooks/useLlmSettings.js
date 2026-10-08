import { useState, useEffect, useCallback } from 'react';
import {
  getLlmSettings,
  updateLlmSettings,
  removeLlmKey,
  testLlmKey,
  getSuggestedModels,
} from '../services/llmSettingsService.js';
import { emitToast } from '../services/http.js';

/**
 * Custom hook to manage LLM settings state, mutations, and testing.
 *
 * Security rules:
 * - The raw key is never stored in state, query cache, localStorage, or logged to console.
 * - Key input is cleared immediately after save.
 *
 * @returns {Object} LLM settings state and helper actions
 */
export function useLlmSettings() {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [savingModel, setSavingModel] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getLlmSettings();
      setSettings(data);
      return data;
    } catch (err) {
      setError(err?.message || 'Failed to load assistant settings.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getLlmSettings()
      .then((data) => {
        if (active) {
          setSettings(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || 'Failed to load assistant settings.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const testKey = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testLlmKey();
      const successInfo = {
        ok: true,
        message: `Success! Model "${res.model || settings?.model || 'active model'}" answered correctly.`,
      };
      setTestResult(successInfo);
      return successInfo;
    } catch (err) {
      const errorInfo = {
        ok: false,
        message: err?.message || 'The key was rejected by OpenRouter.',
      };
      setTestResult(errorInfo);
      return errorInfo;
    } finally {
      setTesting(false);
    }
  }, [settings]);

  const removeKey = useCallback(async () => {
    setRemoving(true);
    try {
      const updated = await removeLlmKey();
      setSettings(updated);
      setTestResult(null);
      emitToast('info', 'API key removed.');
      return updated;
    } catch (err) {
      emitToast('error', err?.message || 'Failed to remove API key.');
      throw err;
    } finally {
      setRemoving(false);
    }
  }, []);

  const changeModel = useCallback(async (newModel) => {
    setSavingModel(true);
    try {
      const updated = await updateLlmSettings({ model: newModel });
      setSettings(updated);
      emitToast('success', `Active model updated to ${newModel}.`);
      return updated;
    } catch (err) {
      emitToast('error', err?.message || 'Failed to update model.');
      throw err;
    } finally {
      setSavingModel(false);
    }
  }, []);

  return {
    settings,
    isLoading,
    error,
    refetch: fetchSettings,
    testing,
    testResult,
    testKey,
    removing,
    removeKey,
    savingModel,
    changeModel,
    getSuggestedModels,
  };
}

export default useLlmSettings;
