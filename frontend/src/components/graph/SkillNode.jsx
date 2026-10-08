import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Check, CircleDot, X, Sparkles, Minus } from 'lucide-react';

const STATE_CONFIG = {
  mastered: {
    bgClass: 'bg-state-mastered',
    colorHex: '#3DDC97',
    label: 'Mastered',
    Icon: Check,
  },
  partial: {
    bgClass: 'bg-state-partial',
    colorHex: '#FFC93C',
    label: 'In progress',
    Icon: CircleDot,
  },
  missing: {
    bgClass: 'bg-state-missing',
    colorHex: '#FF5A5F',
    label: 'Missing',
    Icon: X,
  },
  recommended: {
    bgClass: 'bg-state-next',
    colorHex: '#4CC9F0',
    label: 'Learn next',
    Icon: Sparkles,
  },
  not_relevant: {
    bgClass: 'bg-state-muted',
    colorHex: '#D7D7DC',
    label: 'Not in target',
    Icon: Minus,
  },
};

/**
 * Custom React Flow node rendering a skill in the graph.
 * Rounded box (168 x 64 px), 2px ink border, fill from node state token,
 * state icon + skill name + level info + category dot.
 * Focusable via keyboard, Enter/Space opens the skill detail panel.
 */
export const SkillNode = memo(function SkillNode({ id, data = {}, selected = false }) {
  const {
    name = 'Skill',
    state = 'missing',
    proficiency = 0,
    requiredLevel = 1,
    onSelect,
  } = data;

  const config = STATE_CONFIG[state] || STATE_CONFIG.missing;
  const StateIcon = config.Icon;
  const isRecommended = state === 'recommended';

  const ariaLabel = `${name}, ${state}, level ${proficiency} of ${requiredLevel} required`;

  const handleTrigger = () => {
    onSelect?.(data.id || id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTrigger();
    }
  };

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      onClick={handleTrigger}
      style={{ width: '168px', height: '64px' }}
      className={`relative w-[168px] h-[64px] p-2 border-2 border-ink rounded-lg text-ink select-none flex flex-col justify-between transition-all duration-120 ease-out cursor-pointer focus:outline-none focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-2 ${config.bgClass} ${
        selected
          ? 'shadow-lg outline-3 outline-brand outline-offset-[2px]'
          : 'shadow-sm hover:shadow-md'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-1.5 !h-1.5 !bg-ink !border-0 !rounded-none"
      />

      {/* Row 1: State Icon + Skill Name */}
      <div className="flex items-start gap-1.5 overflow-hidden">
        <span className="shrink-0 mt-0.5" aria-hidden="true" title={config.label}>
          <StateIcon size={14} strokeWidth={2.5} />
        </span>
        <span
          className="font-sans font-bold text-[12px] leading-tight line-clamp-2 break-words"
          title={name}
        >
          {name}
        </span>
      </div>

      {/* Row 2: Level info + category dot */}
      <div className="flex items-center justify-between font-mono text-[11px] font-bold text-ink/90">
        <span>
          Lv {proficiency} / {requiredLevel}
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full bg-ink/70"
          title={data.category || 'category'}
          aria-hidden="true"
        />
      </div>

      {/* NEXT sticker for recommended nodes */}
      {isRecommended && (
        <span className="absolute -top-2.5 -right-2 bg-pop text-ink border-2 border-ink font-mono text-[9px] font-black px-1.5 py-0.5 leading-none uppercase tracking-wider shadow-sm rounded-xs">
          NEXT
        </span>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-1.5 !h-1.5 !bg-ink !border-0 !rounded-none"
      />
    </div>
  );
});

export default SkillNode;
