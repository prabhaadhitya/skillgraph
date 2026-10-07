import { Check, CircleDot, X, Sparkles, Minus } from 'lucide-react';

const LEGEND_ITEMS = [
  {
    state: 'mastered',
    label: 'Mastered',
    bgClass: 'bg-state-mastered',
    Icon: Check,
  },
  {
    state: 'partial',
    label: 'In progress',
    bgClass: 'bg-state-partial',
    Icon: CircleDot,
  },
  {
    state: 'missing',
    label: 'Missing',
    bgClass: 'bg-state-missing',
    Icon: X,
  },
  {
    state: 'recommended',
    label: 'Learn next',
    bgClass: 'bg-state-next',
    Icon: Sparkles,
  },
  {
    state: 'not_relevant',
    label: 'Not in target',
    bgClass: 'bg-state-muted',
    Icon: Minus,
  },
];

/**
 * Legend card displaying the 5 skill-graph node states with color + icon + label.
 * Positioned in the bottom-left corner of the graph canvas.
 *
 * @param {object} props
 * @param {string} [props.className=''] - Additional class names
 */
export function Legend({ className = '' }) {
  return (
    <div
      className={`bg-surface border-2 border-ink rounded-none shadow-md p-3 select-none ${className}`}
      aria-label="Skill graph legend"
    >
      <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
        Legend
      </div>
      <div className="flex flex-col gap-1.5">
        {LEGEND_ITEMS.map(({ state, label, bgClass, Icon }) => (
          <div key={state} className="flex items-center gap-2 text-xs font-sans font-medium text-ink">
            <span
              className={`w-5 h-5 flex items-center justify-center border-2 border-ink rounded-none shrink-0 text-ink shadow-2xs ${bgClass}`}
              aria-hidden="true"
            >
              <Icon size={12} strokeWidth={2.5} />
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Legend;
