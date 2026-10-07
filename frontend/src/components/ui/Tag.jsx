/**
 * @typedef {'default' | 'brand' | 'pop' | 'sky' | 'ink' | 'soft'} TagTone
 *
 * @param {Object} props
 * @param {TagTone} [props.tone='default'] - Color theme for the tag
 * @param {React.ReactNode} props.children - Tag text / content
 * @param {string} [props.className=''] - Additional classes
 */
export function Tag({ tone = 'default', children, className = '', ...props }) {
  const toneClasses = {
    default: 'bg-surface text-ink',
    brand: 'bg-brand text-white',
    pop: 'bg-pop text-ink',
    sky: 'bg-sky text-ink',
    ink: 'bg-ink text-paper',
    soft: 'bg-brand-soft text-ink',
  };

  return (
    <span
      className={`inline-flex items-center select-none font-mono text-[11px] font-bold uppercase tracking-[0.08em] border-2 border-ink shadow-sm rounded-none px-2 py-0.5 ${toneClasses[tone] || toneClasses.default} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Tag;
