import { useState } from 'react';
import { Link } from 'react-router';
import { X, ArrowRight, ArrowLeft, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { Tag, Badge, LevelPicker, Button } from '../ui';
import { getNodeConnections } from './graphUtils.js';
import { useSkillDetail, useUpdateSkill } from '../../hooks';
import { explainSkill } from '../../services/aiService.js';

/**
 * 360px right-hand live detail panel (bottom sheet on tablet/mobile)
 * displaying skill requirements, editable proficiency with optimistic updates,
 * prerequisites, unlocks, and career targets.
 *
 * @param {object} props
 * @param {object | null} props.selectedNode - Selected node data
 * @param {Array<object>} props.nodes - All graph nodes for lookup
 * @param {Array<object>} props.edges - All graph edges
 * @param {(nodeId: string | null) => void} props.onSelectNode - Node selection callback
 * @param {() => void} [props.onClose] - Close handler
 * @param {(fitData: object) => void} [props.onSkillUpdated] - Callback with new fit info
 * @param {() => void} [props.onExplain] - Optional hook handler for "Why this?"
 * @param {string} [props.className=''] - Additional class names
 */
export function SkillDetailPanel({
  selectedNode,
  nodes = [],
  edges = [],
  onSelectNode,
  onClose,
  onSkillUpdated,
  onExplain,
  className = '',
}) {
  const slug = selectedNode?.slug || selectedNode?.id;
  const { data: detailData } = useSkillDetail(slug);
  const updateSkillMutation = useUpdateSkill();

  const [optimisticState, setOptimisticState] = useState(null);
  const [explainState, setExplainState] = useState({ slug: null, loading: false, result: null, error: null });

  const explainLoading = explainState.slug === slug && explainState.loading;
  const explainResult = explainState.slug === slug ? explainState.result : null;
  const explainError = explainState.slug === slug ? explainState.error : null;

  const handleExplain = async () => {
    if (onExplain) {
      onExplain(slug);
      return;
    }
    if (!slug || explainLoading) return;
    setExplainState({ slug, loading: true, result: null, error: null });
    try {
      const res = await explainSkill(slug);
      setExplainState({ slug, loading: false, result: res, error: null });
    } catch (err) {
      const errMsg =
        err?.status === 429
          ? 'Too many requests. Slow down a little and try again in a minute.'
          : err?.status === 502
            ? 'Upstream AI service error (502).'
            : err?.message || 'Failed to explain skill.';
      setExplainState({ slug, loading: false, result: null, error: errMsg });
    }
  };

  const localLevel =
    (optimisticState && optimisticState.id === selectedNode?.id
      ? optimisticState.level
      : null) ?? (selectedNode?.proficiency ?? 0);

  if (!selectedNode) {
    return (
      <aside
        className={`hidden lg:flex w-full lg:w-[360px] bg-surface border-2 border-ink shadow-md p-6 flex-col justify-center items-center text-center select-none ${className}`}
      >
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
          Click any skill node in the graph to view requirements, prerequisites, and unlocks.
        </p>
      </aside>
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const { prerequisiteIds, unlockIds } = getNodeConnections(edges, selectedNode.id);

  // Combine graph edges with API detail for rich info
  const graphPrereqs = prerequisiteIds.map((id) => nodeMap.get(id)).filter(Boolean);
  const graphUnlocks = unlockIds.map((id) => nodeMap.get(id)).filter(Boolean);

  const prerequisites =
    graphPrereqs.length > 0
      ? graphPrereqs
      : (detailData?.prerequisites || []).map((p) => ({
          id: p.slug,
          slug: p.slug,
          name: p.name,
          category: p.category,
        }));

  const unlocks =
    graphUnlocks.length > 0
      ? graphUnlocks
      : (detailData?.unlocks || []).map((u) => ({
          id: u.slug,
          slug: u.slug,
          name: u.name,
          category: u.category,
        }));

  const description = detailData?.skill?.description;
  const requiredFor = detailData?.requiredFor || [];

  // Determine importance label
  const rawImportance =
    selectedNode.importance ??
    (detailData?.requiredFor?.[0]?.importance ?? 0.8);
  const importanceLabel =
    selectedNode.importanceLabel ||
    (detailData?.requiredFor?.[0]?.importanceLabel) ||
    (rawImportance >= 0.85
      ? 'Essential'
      : rawImportance >= 0.7
        ? 'High'
        : rawImportance >= 0.4
          ? 'Medium'
          : 'Low');

  const requiredLevel =
    selectedNode.requiredLevel ??
    detailData?.you?.targetRequiredLevel ??
    (detailData?.requiredFor?.[0]?.requiredLevel ?? 1);

  const handleLevelChange = (newLevel) => {
    if (newLevel === localLevel) return;
    setOptimisticState({ id: selectedNode?.id, level: newLevel });

    updateSkillMutation.mutate(
      { skillSlug: slug, proficiency: newLevel },
      {
        onSuccess: (res) => {
          setOptimisticState(null);
          if (res?.fit) {
            onSkillUpdated?.(res.fit);
          }
        },
        onError: () => {
          // Revert to original proficiency on error
          setOptimisticState(null);
        },
      },
    );
  };

  return (
    <>
      {/* Tablet / Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-ink/40 z-30 lg:hidden backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[85vh] w-full rounded-t-2xl border-t-2 border-x-2 border-ink shadow-lg lg:static lg:w-[360px] lg:h-full lg:max-h-none lg:rounded-none lg:border-2 lg:shadow-md bg-surface p-5 flex flex-col gap-4 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 lg:animate-none ${className}`}
        aria-label="Skill details"
      >
        {/* Tablet / Mobile Drag Bar */}
        <div className="w-12 h-1.5 bg-ink/20 rounded-full mx-auto -mt-1 mb-1 lg:hidden shrink-0" />

        {/* Header with Title, Category, Status, and Close */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Tag tone="brand">
                {detailData?.skill?.category || selectedNode.category || 'skill'}
              </Tag>
              <Badge status={selectedNode.state} />
            </div>
            <h2 className="font-display uppercase text-lg text-ink leading-tight">
              {selectedNode.name}
            </h2>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="w-7 h-7 flex items-center justify-center border-2 border-ink rounded-none bg-surface hover:bg-paper cursor-pointer font-bold transition-colors shrink-0"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted font-sans leading-relaxed border-b-2 border-line pb-3">
            {description}
          </p>
        )}

        {/* Editable Proficiency & Requirements */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
              Your Proficiency
            </span>
            {updateSkillMutation.isPending && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-brand font-bold animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                Saving...
              </span>
            )}
          </div>
          <div className="p-2.5 border-2 border-line bg-paper flex justify-center">
            <LevelPicker
              value={localLevel}
              onChange={handleLevelChange}
              compact
              disabled={updateSkillMutation.isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold pt-1">
            <div className="p-2 border-2 border-line bg-surface">
              <span className="text-muted block text-[10px] uppercase">Required</span>
              <span>Level {requiredLevel}</span>
            </div>
            <div className="p-2 border-2 border-line bg-surface">
              <span className="text-muted block text-[10px] uppercase">Importance</span>
              <span title={`${Math.round(rawImportance * 100)}%`}>
                {importanceLabel}
              </span>
            </div>
          </div>
        </div>

        {/* "Why this?" Section */}
        <div className="pt-1 space-y-2">
          <Button
            variant="secondary"
            onClick={handleExplain}
            disabled={explainLoading}
            className="w-full text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            {explainLoading ? (
              <Loader2 size={14} className="animate-spin text-brand" />
            ) : (
              <Sparkles size={14} className="text-brand" />
            )}
            <span>{explainLoading ? 'Explaining...' : 'Why this?'}</span>
          </Button>

          {explainError && (
            <div className="p-2.5 bg-state-missing/20 border-2 border-state-missing text-xs font-mono text-ink flex items-center justify-between">
              <span>{explainError}</span>
              <button
                type="button"
                onClick={handleExplain}
                className="font-bold underline text-ink ml-2 cursor-pointer"
              >
                RETRY
              </button>
            </div>
          )}

          {explainResult && (
            <div className="p-3 bg-paper border-2 border-ink shadow-xs text-xs space-y-2 text-left">
              <p className="leading-relaxed text-ink whitespace-pre-wrap">{explainResult.reply}</p>

              {/* Degraded Notice */}
              {explainResult.degraded && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-state-major">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Quick answer (AI is unavailable right now)</span>
                </div>
              )}

              {/* Quota Notice with Link to Settings */}
              {explainResult.notice && (
                <div className="p-2 bg-surface border border-ink text-[11px] text-ink flex items-center justify-between gap-2">
                  <span>{explainResult.notice}</span>
                  <Link
                    to="/app/settings"
                    className="font-bold text-brand hover:underline shrink-0"
                  >
                    Settings →
                  </Link>
                </div>
              )}

              {/* Grounding & Key tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line text-[10px] text-muted font-mono">
                {((explainResult.grounding?.skills && explainResult.grounding.skills.length > 0) ||
                  (explainResult.grounding?.careers && explainResult.grounding.careers.length > 0)) && (
                  <span>
                    grounded in:{' '}
                    <strong className="text-ink">
                      {[...(explainResult.grounding.skills || []), ...(explainResult.grounding.careers || [])].join(', ')}
                    </strong>
                  </span>
                )}

                <Badge variant={explainResult.keySource === 'user' ? 'mastered' : 'neutral'}>
                  {explainResult.keySource === 'user' ? 'Your key' : 'Shared key'}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Required For Careers */}
        {requiredFor.length > 0 && (
          <div className="space-y-1.5 border-t-2 border-line pt-3">
            <span className="block font-mono text-xs font-bold uppercase tracking-wider text-muted">
              Required For
            </span>
            <div className="space-y-1">
              {requiredFor.map((req, idx) => (
                <div
                  key={idx}
                  className="text-xs font-mono p-1.5 bg-paper border border-line flex justify-between items-center"
                >
                  <span className="font-bold truncate">{req.career?.name}</span>
                  <span className="text-muted shrink-0 text-[10px]">
                    Lv {req.requiredLevel} · {req.importanceLabel || `${Math.round(req.importance * 100)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prerequisites */}
        <div className="space-y-2 border-t-2 border-line pt-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-muted">
            <ArrowLeft size={13} strokeWidth={2.5} />
            <span>Prerequisites ({prerequisites.length})</span>
          </div>
          {prerequisites.length === 0 ? (
            <p className="text-xs text-muted font-sans italic">None (entry-level skill)</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {prerequisites.map((prereq) => (
                <button
                  key={prereq.id || prereq.slug}
                  type="button"
                  onClick={() => onSelectNode?.(prereq.id || prereq.slug)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold border-2 border-ink bg-paper hover:bg-brand hover:text-white transition-colors cursor-pointer shadow-xs rounded-xs"
                >
                  <span>{prereq.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Unlocks */}
        <div className="space-y-2 border-t-2 border-line pt-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-muted">
            <ArrowRight size={13} strokeWidth={2.5} />
            <span>Unlocks ({unlocks.length})</span>
          </div>
          {unlocks.length === 0 ? (
            <p className="text-xs text-muted font-sans italic">None (terminal skill)</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {unlocks.map((unlock) => (
                <button
                  key={unlock.id || unlock.slug}
                  type="button"
                  onClick={() => onSelectNode?.(unlock.id || unlock.slug)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold border-2 border-ink bg-paper hover:bg-brand hover:text-white transition-colors cursor-pointer shadow-xs rounded-xs"
                >
                  <span>{unlock.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default SkillDetailPanel;
