import { FolderOpen } from 'lucide-react';
import { Button } from './Button.jsx';

/**
 * EmptyState display with icon, display title, description, and one action button.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.icon] - Icon component or node
 * @param {React.ReactNode} props.title - Heading text
 * @param {React.ReactNode} props.text - Body description
 * @param {string} [props.actionLabel] - Label for action button
 * @param {() => void} [props.onAction] - Handler for action button
 * @param {React.ReactNode} [props.action] - Custom action component / node
 * @param {string} [props.className=''] - Additional classes
 */
export function EmptyState({
  icon,
  title,
  text,
  actionLabel,
  onAction,
  action,
  className = '',
}) {
  return (
    <div
      role="status"
      className={`border-2 border-dashed border-ink bg-surface/80 p-8 md:p-12 text-center flex flex-col items-center justify-center rounded-none shadow-sm ${className}`}
    >
      <div className="w-14 h-14 border-2 border-ink bg-paper flex items-center justify-center text-ink mb-4 shadow-sm">
        {icon || <FolderOpen size={28} className="text-ink" />}
      </div>

      <h3 className="font-display uppercase text-xl text-ink tracking-tight mb-2">
        {title}
      </h3>

      {text && (
        <p className="font-sans text-sm text-muted max-w-md mx-auto mb-5">
          {text}
        </p>
      )}

      {action ? (
        action
      ) : actionLabel && onAction ? (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
