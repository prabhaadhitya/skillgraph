import { useId } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

/**
 * @typedef {{ value: string | number, label: string }} SelectOption
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.label] - Label text displayed above select
 * @param {React.ReactNode} [props.hint] - Helper text displayed below select
 * @param {React.ReactNode} [props.error] - Error message displayed with icon
 * @param {SelectOption[]} [props.options] - List of selectable options
 * @param {string} [props.id] - ID for the select element
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {React.ReactNode} [props.children] - Native option elements
 * @param {string} [props.className=''] - Additional classes for the select element
 */
export function Select({
  label,
  hint,
  error,
  options,
  id,
  disabled = false,
  children,
  className = '',
  ...props
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  const borderClass = error ? 'border-state-missing' : 'border-ink';

  return (
    <div className="w-full text-left">
      {label && (
        <label
          htmlFor={selectId}
          className="block mb-1.5 font-sans text-xs font-bold uppercase tracking-[0.04em] text-ink"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full h-12 pl-3.5 pr-10 bg-surface text-ink border-2 ${borderClass} rounded-none font-sans text-base shadow-sm appearance-none transition-all duration-120 ease-out cursor-pointer focus:outline-none focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-[3px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <span
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink"
          aria-hidden="true"
        >
          <ChevronDown size={18} strokeWidth={2.5} />
        </span>
      </div>

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

export default Select;
