import { X, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Tag, Badge, LevelPicker } from '../ui';
import { getNodeConnections } from './graphUtils.js';
import { useSkillDetail, useUpdateSkill } from '../../hooks';

/**
 * 360px right-hand live detail panel displaying skill requirements,
 * editable proficiency with mutation feedback, prerequisites, unlocks, and career targets.
 *
 * @param {object} props
 * @param {object | null} props.selectedNode - Selected node data
 * @param {Array<object>} props.nodes - All graph nodes for lookup
 * @param {Array<object>} props.edges - All graph edges
 * @param {(nodeId: string | null) => void} props.onSelectNode - Node selection callback
 * @param {() => void} [props.onClose] - Close handler
 * @param {string} [props.className=''] - Additional class names
 */
export function SkillDetailPanel({
  selectedNode,
  nodes = [],
  edges = [],
  onSelectNode,
  onClose,
  className = '',
}) {
  const slug = selectedNode?.slug || selectedNode?.id;
  const { data: detailData } = useSkillDetail(slug);
  const updateSkillMutation = useUpdateSkill();

  if (!selectedNode) {
    return (
      <aside
        className={`w-full lg:w-[360px] bg-surface border-2 border-ink shadow-md p-6 flex flex-col justify-center items-center text-center select-none ${className}`}
      >
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
          Click any skill node in the graph to view requirements, prerequisites, and unlocks.
        </p>
      </aside>
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const { prerequisiteIds, unlockIds } = getNodeConnections(edges, selectedNode.id);

  const prerequisites = prerequisiteIds.map((id) => nodeMap.get(id)).filter(Boolean);
  const unlocks = unlockIds.map((id) => nodeMap.get(id)).filter(Boolean);
  const description = detailData?.skill?.description;
  const requiredFor = detailData?.requiredFor || [];

  return (
    <aside
      className={`w-full lg:w-[360px] bg-surface border-2 border-ink shadow-md p-5 flex flex-col gap-4 overflow-y-auto ${className}`}
    >
      {/* Header with Title, Category, Status, and Close */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Tag tone="brand">{detailData?.skill?.category || selectedNode.category || 'skill'}</Tag>
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
            className="w-7 h-7 flex items-center justify-center border-2 border-ink rounded-none bg-surface hover:bg-paper cursor-pointer font-bold transition-colors"
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
            value={selectedNode.proficiency || 0}
            onChange={(newLevel) => {
              updateSkillMutation.mutate({ skillSlug: slug, proficiency: newLevel });
            }}
            compact
            disabled={updateSkillMutation.isPending}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold pt-1">
          <div className="p-2 border-2 border-line bg-surface">
            <span className="text-muted block text-[10px] uppercase">Required</span>
            <span>Level {selectedNode.requiredLevel}</span>
          </div>
          <div className="p-2 border-2 border-line bg-surface">
            <span className="text-muted block text-[10px] uppercase">Importance</span>
            <span>{Math.round((selectedNode.importance || 0) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* "Why this?" Button */}
      <div className="pt-1">
        <button
          type="button"
          disabled
          title="Assistant coming soon"
          className="w-full py-2 px-3 text-xs font-mono font-bold uppercase tracking-wider border-2 border-ink bg-paper/60 text-muted cursor-not-allowed opacity-75 shadow-xs"
        >
          Why this? (Assistant coming soon)
        </button>
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
                key={prereq.id}
                type="button"
                onClick={() => onSelectNode?.(prereq.id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold border-2 border-ink bg-paper hover:bg-brand hover:text-white transition-colors cursor-pointer shadow-xs"
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
                key={unlock.id}
                type="button"
                onClick={() => onSelectNode?.(unlock.id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold border-2 border-ink bg-paper hover:bg-brand hover:text-white transition-colors cursor-pointer shadow-xs"
              >
                <span>{unlock.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default SkillDetailPanel;
