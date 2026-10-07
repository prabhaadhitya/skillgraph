/**
 * Single StatBox displaying a large number and caption.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.value - Display number or stat
 * @param {React.ReactNode} props.label - Descriptive label / caption
 * @param {string} [props.className=''] - Additional classes
 */
export function StatBox({ value, label, className = '' }) {
  return (
    <div
      className={`p-5 text-center bg-surface border-2 border-ink shadow-sm ${className}`}
    >
      <div className="font-display text-3xl md:text-4xl text-ink tracking-tight">
        {value}
      </div>
      <div className="font-mono text-xs uppercase tracking-wider text-muted mt-1.5">
        {label}
      </div>
    </div>
  );
}

/**
 * Group of StatBoxes that share borders in a row.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - StatBox components
 * @param {string} [props.className=''] - Additional classes
 */
export function StatBoxGroup({ children, className = '' }) {
  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-4 border-2 border-ink divide-y-2 md:divide-y-0 md:divide-x-2 divide-ink bg-surface shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

export default StatBox;
