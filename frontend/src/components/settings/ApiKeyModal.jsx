import { useState, useEffect } from 'react';
import { Eye, EyeOff, ExternalLink, ShieldCheck, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Select } from '../ui/Select.jsx';
import {
  updateLlmSettings,
  testLlmKey,
  getSuggestedModels,
  removeLlmKey,
} from '../../services/llmSettingsService.js';

function ApiKeyForm({ onClose, currentSettings, onSuccess }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(currentSettings?.model || '');
  const [customModel, setCustomModel] = useState('');
  const [suggestedModels, setSuggestedModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    let active = true;
    getSuggestedModels()
      .then((res) => {
        if (active) {
          setSuggestedModels(res?.items || []);
          setLoadingModels(false);
        }
      })
      .catch(() => {
        if (active) {
          setSuggestedModels([]);
          setLoadingModels(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const effectiveSelectedModel = model === 'custom' ? customModel : model;

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      if (apiKey.trim() || effectiveSelectedModel.trim()) {
        const payload = {};
        if (apiKey.trim()) payload.apiKey = apiKey.trim();
        if (effectiveSelectedModel.trim()) payload.model = effectiveSelectedModel.trim();
        await updateLlmSettings(payload);
        setApiKey('');
      }

      const res = await testLlmKey();
      setTestResult({
        ok: true,
        message: `Success! Model "${res.model || effectiveSelectedModel}" answered correctly.`,
      });
      onSuccess?.();
    } catch (err) {
      setTestResult({
        ok: false,
        message: err.message || 'The key was rejected or failed upstream.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!apiKey.trim() && !effectiveSelectedModel.trim()) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {};
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      if (effectiveSelectedModel.trim()) payload.model = effectiveSelectedModel.trim();

      await updateLlmSettings(payload);
      setApiKey('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!confirm('Are you sure you want to remove your API key?')) return;
    setRemoving(true);
    setError(null);
    try {
      await removeLlmKey();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to remove key.');
    } finally {
      setRemoving(false);
    }
  };

  const modelOptions = [
    { value: '', label: 'System Default (Recommended)' },
    ...suggestedModels.map((m) => ({
      value: m.id,
      label: m.note ? `${m.id} (${m.note})` : m.id,
    })),
    { value: 'custom', label: 'Custom model ID...' },
  ];

  return (
    <div className="space-y-6 text-left">
      <p className="text-sm font-sans text-muted">
        Use your own OpenRouter key so the assistant works without limits. Your key is stored
        encrypted at rest and decrypted only during inference in memory.
      </p>

      {error && (
        <div className="p-3 bg-state-missing/20 border-2 border-state-missing flex items-center gap-2 text-sm text-ink font-bold">
          <AlertCircle className="w-5 h-5 text-state-missing flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Create a key */}
      <div className="p-4 bg-paper border-2 border-ink space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-sm tracking-wide text-ink">1. CREATE A KEY</h4>
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand hover:text-brand-dark transition-colors"
          >
            OpenRouter Keys <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-xs text-muted">
          Create an account on OpenRouter and generate a key. Free-tier models (ending in{' '}
          <code className="bg-surface px-1 py-0.5 border border-line">:free</code>) require no
          credits.
        </p>
      </div>

      {/* 2. Paste your key */}
      <div className="space-y-2">
        <label className="block text-xs font-bold font-sans uppercase tracking-[0.04em] text-ink">
          2. PASTE YOUR KEY
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              currentSettings?.hasKey
                ? `••••••••••••${currentSettings.keyLast4 || ''} (Stored)`
                : 'sk-or-v1-...'
            }
            className="w-full h-11 px-3.5 pr-10 bg-surface border-2 border-ink font-mono text-xs text-ink placeholder:text-muted focus:outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <span className="block text-[11px] text-muted">
          {currentSettings?.hasKey
            ? 'Leave blank to keep your current key, or paste a new one to replace it.'
            : 'Keys typically start with sk-or-v1-.'}
        </span>
      </div>

      {/* 3. Choose a model */}
      <div className="space-y-2">
        <label className="block text-xs font-bold font-sans uppercase tracking-[0.04em] text-ink">
          3. CHOOSE A MODEL
        </label>
        <Select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          options={modelOptions}
          disabled={loadingModels}
        />
        {model === 'custom' && (
          <div className="pt-2">
            <Input
              label="Custom Model ID"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="e.g. meta-llama/llama-3.3-70b-instruct:free"
            />
          </div>
        )}
      </div>

      {/* Test key row */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleTestKey}
          loading={testing}
          disabled={!apiKey.trim() && !currentSettings?.hasKey}
        >
          TEST KEY
        </Button>

        {currentSettings?.hasKey && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleRemoveKey}
            loading={removing}
            disabled={testing || saving}
          >
            REMOVE KEY
          </Button>
        )}
      </div>

      {/* Test Result Message */}
      {testResult && (
        <div
          className={`p-3 border-2 text-xs font-sans font-bold flex items-center gap-2 ${
            testResult.ok
              ? 'bg-state-mastered/20 border-state-mastered text-ink'
              : 'bg-state-missing/20 border-state-missing text-ink'
          }`}
        >
          {testResult.ok ? (
            <Check className="w-4 h-4 text-state-mastered flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-state-missing flex-shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Collapsible: How your key is used */}
      <div className="border-t-2 border-line pt-3">
        <button
          type="button"
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          className="w-full flex items-center justify-between text-xs font-bold text-muted hover:text-ink cursor-pointer uppercase"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand" /> How your key is protected
          </span>
          {showHowItWorks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showHowItWorks && (
          <p className="mt-2 text-xs text-muted bg-paper p-3 border border-line leading-relaxed">
            Your key is encrypted on our server using AES-256-GCM and never returned in responses or
            logs. It is decrypted in memory strictly during assistant requests. You can remove it at
            any time.
          </p>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-ink">
        <Button variant="secondary" size="md" onClick={onClose} disabled={saving || testing}>
          CANCEL
        </Button>
        <Button variant="primary" size="md" onClick={handleSave} loading={saving} disabled={testing}>
          SAVE SETTINGS
        </Button>
      </div>
    </div>
  );
}

/**
 * OpenRouter API Key & Model Configuration Modal.
 * Follows UX flow F7 & Design System §10.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Object} props.currentSettings
 * @param {() => void} props.onSuccess
 */
export function ApiKeyModal({ isOpen, onClose, currentSettings, onSuccess }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="OPENROUTER API KEY" maxWidth="max-w-xl">
      {isOpen && (
        <ApiKeyForm
          onClose={onClose}
          currentSettings={currentSettings}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
}

export default ApiKeyModal;
