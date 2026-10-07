import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * @param {Object} props
 * @param {React.ReactNode} [props.label] - Label text displayed above input
 * @param {React.ReactNode} [props.hint] - Helper text displayed below input
 * @param {React.ReactNode} [props.error] - Error message displayed with icon
 * @param {string} [props.id] - ID for the input element
 * @param {string} [props.type='text'] - Input type
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className=''] - Additional classes for the input element
 */
export function Input({
  label,
  hint,
  error,
  id,
  type = 'text',
  disabled = false,
  className = '',
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const borderClass = error ? 'border-state-missing' : 'border-ink';

  return (
    <div className="w-full text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-1.5 font-sans text-xs font-bold uppercase tracking-[0.04em] text-ink"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        type={type}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full h-12 px-3.5 bg-surface text-ink border-2 ${borderClass} rounded-none font-sans text-base shadow-sm transition-all duration-120 ease-out placeholder:text-muted focus:outline-none focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-[3px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${className}`}
        {...props}
      />

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-state-missing"
        >
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default Input;
