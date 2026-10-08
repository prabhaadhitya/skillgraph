import { isValidElement } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * @typedef {'primary' | 'secondary' | 'danger' | 'ghost'} ButtonVariant
 * @typedef {'sm' | 'md' | 'lg'} ButtonSize
 *
 * @param {Object} props
 * @param {ButtonVariant} [props.variant='primary'] - Button visual style
 * @param {ButtonSize} [props.size='md'] - Button size
 * @param {boolean} [props.loading=false] - Whether button is in loading state
 * @param {React.ReactNode} [props.icon] - Optional leading icon
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {'button' | 'submit' | 'reset'} [props.type='button'] - HTML button type
 * @param {React.ReactNode} props.children - Button label / content
 * @param {string} [props.className=''] - Additional class names
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled = false,
  type = 'button',
  children,
  className = '',
  ...props
}) {
  const baseClasses =
    'relative inline-flex items-center justify-center select-none font-sans font-bold uppercase tracking-[0.04em] rounded-none cursor-pointer transition-all duration-120 ease-out focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-[3px] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0';

  const sizeClasses = {
    sm: 'h-9 px-3 text-xs gap-1.5',
    md: 'h-11 px-4 text-[13px] gap-2',
    lg: 'h-[52px] px-6 text-sm gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-brand text-white border-2 border-ink shadow-sm hover:bg-brand-dark hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
    secondary:
      'bg-surface text-ink border-2 border-ink shadow-sm hover:bg-paper hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
    danger:
      'bg-state-missing text-ink border-2 border-ink shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
    ghost:
      'bg-transparent text-ink border-2 border-transparent hover:bg-brand-soft/40 active:bg-brand-soft/70',
  };

  const spinnerSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  const isDisabled = disabled || loading;

  const renderIcon = () => {
    if (!icon) return null;
    if (isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComponent = icon;
      return <IconComponent size={spinnerSizes[size] || 18} />;
    }
    return icon;
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${className}`}
      {...props}
    >
      {loading && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
          data-testid="button-spinner"
        >
          <Loader2 className="animate-spin" size={spinnerSizes[size] || 18} />
        </span>
      )}
      <span
        className={`inline-flex items-center justify-center gap-2 ${loading ? 'invisible' : ''}`}
      >
        {icon && <span className="inline-flex shrink-0">{renderIcon()}</span>}
        {children}
      </span>
    </button>
  );
}

export default Button;
