/**
 * Hard-edged 24px progress bar with ink border and brand fill.
 *
 * @param {Object} props
 * @param {number} [props.value=0] - Percentage value (0-100)
 * @param {number} [props.max=100] - Maximum value
 * @param {boolean} [props.showLabel=false] - Show percentage label inside bar
 * @param {string} [props.className=''] - Additional classes
 */
export function ProgressBar({
  value = 0,
  max = 100,
  showLabel = false,
  className = '',
  ...props
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full h-6 bg-surface border-2 border-ink rounded-none relative overflow-hidden select-none ${className}`}
      {...props}
    >
      <div
        className="h-full bg-brand transition-[width] duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-ink mix-blend-difference invert select-none">
          {percentage}%
        </span>
      )}
    </div>
  );
}

export default ProgressBar;
