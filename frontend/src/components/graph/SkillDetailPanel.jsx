import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { Tag, Badge, LevelPicker } from '../ui';
import { getNodeConnections } from './graphUtils.js';

/**
 * 360px right-hand detail panel displaying selected skill metadata,
 * interactive prerequisites, and unlocks.
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

  return (
    <aside
      className={`w-full lg:w-[360px] bg-surface border-2 border-ink shadow-md p-6 flex flex-col gap-5 overflow-y-auto ${className}`}
    >
      {/* Header with Title, Category, Status, and Close */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag tone="brand">{selectedNode.category || 'skill'}</Tag>
            <Badge status={selectedNode.state} />
          </div>
          <h2 className="font-display uppercase text-xl text-ink leading-tight">
            {selectedNode.name}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="w-8 h-8 flex items-center justify-center border-2 border-ink rounded-none bg-surface hover:bg-paper cursor-pointer font-bold transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Your Level & Target Requirement */}
      <div className="space-y-3">
        <span className="block font-mono text-xs font-bold uppercase tracking-wider text-muted">
          Your Proficiency
        </span>
        <div className="p-3 border-2 border-line bg-paper flex justify-center">
          <LevelPicker value={selectedNode.proficiency || 0} compact disabled />
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

      {/* Direct Prerequisites */}
      <div className="space-y-2 border-t-2 border-line pt-4">
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold border-2 border-ink rounded-none bg-paper hover:bg-brand hover:text-white transition-colors cursor-pointer shadow-xs"
              >
                <span>{prereq.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Unlocks */}
      <div className="space-y-2 border-t-2 border-line pt-4">
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold border-2 border-ink rounded-none bg-paper hover:bg-brand hover:text-white transition-colors cursor-pointer shadow-xs"
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
