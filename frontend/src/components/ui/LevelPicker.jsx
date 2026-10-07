export const LEVEL_NAMES = {
  0: 'Not Started',
  1: 'Beginner',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

const LEVELS = [0, 1, 2, 3, 4, 5];

/**
 * LevelPicker is the signature skill-level control in SkillGraph.
 * Renders six square segments (0-5) with arrow-key keyboard navigation
 * and displays the active level's descriptive name.
 *
 * @param {Object} props
 * @param {number} [props.value=0] - Current level from 0 to 5
 * @param {(level: number) => void} [props.onChange] - Callback when level changes
 * @param {boolean} [props.compact=false] - Compact rendering mode
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className=''] - Additional classes
 */
export function LevelPicker({
  value = 0,
  onChange,
  compact = false,
  disabled = false,
  className = '',
  ...props
}) {
  const currentLevel = Math.max(0, Math.min(5, Number(value) || 0));

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(5, currentLevel + 1);
      onChange?.(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = Math.max(0, currentLevel - 1);
      onChange?.(prev);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange?.(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange?.(5);
    }
  };

  const segmentSize = compact ? 'w-8 h-8 text-xs' : 'w-11 h-11 text-sm';

  return (
    <div
      role="radiogroup"
      aria-label="Skill proficiency level"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={`inline-flex flex-col items-center gap-1.5 focus:outline-none focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-[3px] select-none ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
      {...props}
    >
      <div className="flex items-center gap-1">
        {LEVELS.map((level) => {
          const isSelected = level === currentLevel;
          const isFilled = currentLevel > 0 && level > 0 && level < currentLevel;

          let colorClasses = 'bg-surface text-ink hover:bg-paper';
          if (isSelected) {
            colorClasses = 'bg-brand text-white shadow-sm -translate-y-0.5';
          } else if (isFilled) {
            colorClasses = 'bg-brand-soft text-ink';
          }

          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${level} ${LEVEL_NAMES[level]}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange?.(level)}
              className={`relative flex items-center justify-center font-mono font-bold border-2 border-ink rounded-none cursor-pointer transition-all duration-120 ease-out focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-2 ${segmentSize} ${colorClasses}`}
            >
              {level}
            </button>
          );
        })}
      </div>

      <div
        className={`font-mono font-bold uppercase tracking-[0.04em] text-ink text-center ${compact ? 'text-[11px]' : 'text-xs'}`}
        aria-live="polite"
      >
        Lv {currentLevel} · {LEVEL_NAMES[currentLevel]}
      </div>
    </div>
  );
}

export default LevelPicker;
