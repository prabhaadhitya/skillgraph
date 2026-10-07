import { AlertTriangle } from 'lucide-react';
import { Button } from './Button.jsx';

/**
 * ErrorState display with error icon, message, and RETRY button.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.title='SOMETHING WENT WRONG'] - Error title
 * @param {React.ReactNode} props.message - Error message description
 * @param {() => void} [props.onRetry] - Retry callback
 * @param {string} [props.retryLabel='RETRY'] - Retry button text
 * @param {string} [props.className=''] - Additional classes
 */
export function ErrorState({
  title = 'SOMETHING WENT WRONG',
  message,
  onRetry,
  retryLabel = 'RETRY',
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`border-2 border-state-missing bg-surface p-6 md:p-8 text-center flex flex-col items-center justify-center rounded-none shadow-sm ${className}`}
    >
      <div className="w-12 h-12 border-2 border-ink bg-state-missing text-ink flex items-center justify-center mb-3 shadow-sm">
        <AlertTriangle size={24} />
      </div>

      <h3 className="font-display uppercase text-lg text-ink tracking-tight mb-1">
        {title}
      </h3>

      {message && (
        <p className="font-sans text-sm text-ink/80 max-w-md mx-auto mb-4">
          {message}
        </p>
      )}

      {onRetry && (
        <Button variant="danger" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
