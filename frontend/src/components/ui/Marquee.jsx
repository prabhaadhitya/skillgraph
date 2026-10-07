/**
 * Marquee brand strip rotated -2 degrees with continuous scrolling.
 * Respects prefers-reduced-motion.
 *
 * @param {Object} props
 * @param {string[]} [props.items] - Strings to display
 * @param {string} [props.className=''] - Additional classes
 */
export function Marquee({
  items = [
    'SKILL GRAPH',
    'SKILL GAPS',
    'LEARNING PATH',
    'CAREER ALIGNMENT',
    'ASK THE AI',
    'BRING YOUR OWN KEY',
  ],
  className = '',
}) {
  // Duplicate items to ensure smooth continuous looping
  const content = (
    <div className="flex items-center shrink-0">
      {items.map((item, idx) => (
        <span key={idx} className="inline-flex items-center">
          <span className="font-display uppercase text-sm tracking-wider text-ink whitespace-nowrap">
            {item}
          </span>
          <span
            aria-hidden="true"
            className="text-pop font-mono text-base mx-4 select-none"
          >
            ✦
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className={`overflow-hidden py-4 -my-2 select-none ${className}`}>
      <div className="-rotate-2 bg-brand border-y-2 border-ink py-3 overflow-hidden shadow-sm">
        <div className="animate-marquee flex items-center will-change-transform">
          {content}
          {content}
          {content}
          {content}
        </div>
      </div>
    </div>
  );
}

export default Marquee;
