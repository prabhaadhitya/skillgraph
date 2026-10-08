import { useState } from 'react';
import {
  Key,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Trash2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';

/**
 * KeyStatusCard displays the current LLM key status and model configuration,
 * providing actions for ADD KEY, CHANGE MODEL, REMOVE KEY, and TEST KEY.
 *
 * @param {Object} props
 * @param {Object} props.settings - LLM settings from GET /settings/llm
 * @param {() => void} props.onOpenKeyModal - Opens M5's ApiKeyModal
 * @param {() => Promise<any>} props.onTestKey - Runs POST /settings/llm/test
 * @param {boolean} props.testing - Testing loading state
 * @param {Object|null} props.testResult - { ok: boolean, message: string }
 * @param {() => Promise<any>} props.onRemoveKey - Runs DELETE /settings/llm/key
 * @param {boolean} props.removing - Removing loading state
 * @param {(model: string) => Promise<any>} props.onChangeModel - Updates active model
 * @param {boolean} props.savingModel - Model update loading state
 * @param {() => Promise<{ items: Array<{ id: string, note: string }> }>} props.getSuggestedModels
 */
export function KeyStatusCard({
  settings,
  onOpenKeyModal,
  onTestKey,
  testing = false,
  testResult = null,
  onRemoveKey,
  removing = false,
  onChangeModel,
  savingModel = false,
  getSuggestedModels,
}) {
  const [isChangeModelOpen, setIsChangeModelOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(settings?.model || '');
  const [customModelId, setCustomModelId] = useState('');
  const [suggestedModels, setSuggestedModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const handleOpenChangeModel = () => {
    setSelectedModel(settings?.model || '');
    setIsChangeModelOpen(true);
    if (getSuggestedModels) {
      setLoadingModels(true);
      getSuggestedModels()
        .then((res) => {
          setSuggestedModels(res?.items || []);
        })
        .catch(() => {
          setSuggestedModels([]);
        })
        .finally(() => {
          setLoadingModels(false);
        });
    }
  };

  const hasKey = Boolean(settings?.hasKey);
  const keyLast4 = settings?.keyLast4 || '';
  const modelId = settings?.model || 'meta-llama/llama-3.3-70b-instruct:free';
  const remainingToday = settings?.serverKeyRemainingToday ?? 30;

  // Status text matching specification:
  // "Shared demo key - N messages left today" when hasKey is false;
  // "Your key ****<last4> - model <id>" when hasKey is true.
  const statusText = hasKey
    ? `Your key ****${keyLast4} - model ${modelId}`
    : `Shared demo key - ${remainingToday} messages left today`;

  const handleRemoveConfirm = () => {
    if (window.confirm('Are you sure you want to remove your API key?')) {
      onRemoveKey();
    }
  };

  const handleSaveModel = async (e) => {
    e?.preventDefault();
    const effectiveModel = selectedModel === 'custom' ? customModelId.trim() : selectedModel.trim();
    if (effectiveModel) {
      await onChangeModel(effectiveModel);
      setIsChangeModelOpen(false);
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
    <Card className="p-6 border-2 border-ink shadow-md bg-surface text-left">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-line pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-soft border-2 border-ink text-brand">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-base text-ink uppercase tracking-wide">
              ASSISTANT KEY & MODEL
            </h2>
            <p className="text-xs text-muted">
              Configure your OpenRouter API key for private, unlimited AI guidance.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={onOpenKeyModal}
            icon={<Sparkles className="w-4 h-4" />}
          >
            {hasKey ? 'MANAGE KEY' : 'ADD KEY'}
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={handleOpenChangeModel}
            icon={<Cpu className="w-4 h-4" />}
          >
            CHANGE MODEL
          </Button>
        </div>
      </div>

      <div className="pt-5 space-y-4">
        {/* Status Line */}
        <div className="p-4 bg-paper border-2 border-ink space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-muted">
              CURRENT STATUS
            </span>
            {hasKey ? (
              <Badge variant="mastered">YOUR KEY</Badge>
            ) : (
              <Badge variant="developing">SHARED DEMO KEY</Badge>
            )}
          </div>

          <p className="font-mono text-sm font-bold text-ink" data-testid="key-status-text">
            {statusText}
          </p>
        </div>

        {/* Action Controls: TEST KEY & REMOVE KEY */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={onTestKey}
            loading={testing}
            disabled={testing || removing}
          >
            TEST KEY
          </Button>

          {hasKey && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleRemoveConfirm}
              loading={removing}
              disabled={testing || removing}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              REMOVE KEY
            </Button>
          )}
        </div>

        {/* Test Result Banner */}
        {testResult && (
          <div
            role="status"
            className={`p-3 border-2 text-xs font-sans font-bold flex items-center gap-2 ${
              testResult.ok
                ? 'bg-state-mastered/20 border-state-mastered text-ink'
                : 'bg-state-missing/20 border-state-missing text-ink'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-state-mastered flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-state-missing flex-shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Small Help Text with Link */}
        <div className="border-t-2 border-line pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand flex-shrink-0" />
            <span>Keys are encrypted with AES-256-GCM at rest and never shared or logged.</span>
          </div>

          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-brand hover:text-brand-dark transition-colors"
          >
            Get an OpenRouter key <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Change Model Modal */}
      <Modal
        isOpen={isChangeModelOpen}
        onClose={() => setIsChangeModelOpen(false)}
        title="CHANGE ACTIVE MODEL"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveModel} className="space-y-4 text-left">
          <p className="text-xs text-muted font-sans">
            Choose a suggested model or type any model ID supported by OpenRouter.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.04em] text-ink mb-1.5">
              Select Suggested Model
            </label>
            <Select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              options={modelOptions}
              disabled={loadingModels || savingModel}
            />
          </div>

          {selectedModel === 'custom' && (
            <div>
              <Input
                label="Custom Model ID"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder="e.g. deepseek/deepseek-r1:free"
                disabled={savingModel}
                hint="Specify any valid model identifier available on OpenRouter."
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-ink">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsChangeModelOpen(false)}
              disabled={savingModel}
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={savingModel}
            >
              SAVE MODEL
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

export default KeyStatusCard;
