/**
 * Neo-brutalist loading skeleton with ink outline and pulsing paper tint.
 *
 * @param {Object} props
 * @param {'text' | 'card' | 'circle' | 'rectangular'} [props.variant='rectangular'] - Shape variant
 * @param {string|number} [props.width] - Optional width
 * @param {string|number} [props.height] - Optional height
 * @param {string} [props.className=''] - Additional classes
 */
export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className = '',
  ...props
}) {
  const variantClasses = {
    text: 'h-4 w-full',
    rectangular: 'h-12 w-full',
    card: 'h-32 w-full',
    circle: 'w-12 h-12 shrink-0',
  };

  const style = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };

  return (
    <div
      aria-hidden="true"
      style={style}
      className={`border-2 border-ink/30 bg-line/20 animate-pulse rounded-none ${variantClasses[variant] || variantClasses.rectangular} ${className}`}
      {...props}
    />
  );
}

export default Skeleton;
