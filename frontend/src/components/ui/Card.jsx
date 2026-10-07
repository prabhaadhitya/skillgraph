/**
 * @typedef {'default' | 'brand' | 'pop' | 'sky' | 'ink'} CardTone
 *
 * @param {Object} props
 * @param {CardTone} [props.tone='default'] - Card color tone
 * @param {boolean} [props.hoverable=false] - Whether card lifts on hover
 * @param {keyof JSX.IntrinsicElements} [props.as='div'] - Element type to render
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className=''] - Additional class names
 */
export function Card({
  tone = 'default',
  hoverable = false,
  as: Component = 'div',
  children,
  className = '',
  ...props
}) {
  const baseClasses = 'border-2 border-ink rounded-none p-5';

  const toneClasses = {
    default: 'bg-surface text-ink shadow-md',
    brand: 'bg-brand text-white shadow-md',
    pop: 'bg-pop text-ink shadow-md',
    sky: 'bg-sky text-ink shadow-md',
    ink: 'bg-ink text-paper shadow-brand',
  };

  const hoverClasses = hoverable
    ? tone === 'ink'
      ? 'transition-all duration-120 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer'
      : 'transition-all duration-120 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer'
    : '';

  return (
    <Component
      className={`${baseClasses} ${toneClasses[tone] || toneClasses.default} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Card;
