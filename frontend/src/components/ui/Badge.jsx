import {
  Check,
  CircleDot,
  X,
  Sparkles,
  AlertTriangle,
  AlertOctagon,
  Minus,
} from 'lucide-react';

/**
 * @typedef {'mastered' | 'partial' | 'missing' | 'next' | 'strong' | 'developing' | 'major' | 'critical' | 'muted'} BadgeStatus
 *
 * @param {Object} props
 * @param {BadgeStatus} [props.status='mastered'] - Status indicating semantic state
 * @param {string} [props.label] - Optional label override (defaults to status label)
 * @param {React.ReactNode} [props.icon] - Optional icon override
 * @param {React.ReactNode} [props.children] - Children to render instead of default label
 * @param {string} [props.className=''] - Additional classes
 */
export function Badge({
  status = 'mastered',
  label,
  icon,
  children,
  className = '',
  ...props
}) {
  const statusConfig = {
    mastered: {
      bgClass: 'bg-state-mastered',
      Icon: Check,
      defaultLabel: 'Mastered',
    },
    partial: {
      bgClass: 'bg-state-partial',
      Icon: CircleDot,
      defaultLabel: 'In progress',
    },
    missing: {
      bgClass: 'bg-state-missing',
      Icon: X,
      defaultLabel: 'Missing',
    },
    next: {
      bgClass: 'bg-state-next',
      Icon: Sparkles,
      defaultLabel: 'Learn next',
    },
    strong: {
      bgClass: 'bg-state-mastered',
      Icon: Check,
      defaultLabel: 'Strong',
    },
    developing: {
      bgClass: 'bg-state-partial',
      Icon: CircleDot,
      defaultLabel: 'Developing',
    },
    major: {
      bgClass: 'bg-state-major',
      Icon: AlertTriangle,
      defaultLabel: 'Major gap',
    },
    critical: {
      bgClass: 'bg-state-missing',
      Icon: AlertOctagon,
      defaultLabel: 'Critical gap',
    },
    muted: {
      bgClass: 'bg-state-muted',
      Icon: Minus,
      defaultLabel: 'Not in target',
    },
  };

  const config = statusConfig[status] || statusConfig.mastered;
  const DisplayIcon = config.Icon;
  const displayText = children || label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border-2 border-ink shadow-sm text-ink font-mono text-xs font-bold uppercase tracking-[0.04em] select-none ${config.bgClass} ${className}`}
      {...props}
    >
      {icon ? (
        <span className="inline-flex shrink-0">{icon}</span>
      ) : (
        <DisplayIcon size={13} strokeWidth={2.5} className="shrink-0" />
      )}
      <span>{displayText}</span>
    </span>
  );
}

export default Badge;
