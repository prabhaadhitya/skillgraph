import { useState, useEffect, useRef } from 'react';
import { Info, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';

/**
 * AlignmentCard displays the student's estimated career alignment percentage,
 * previous vs current delta, animated counter, and explanatory info tooltip.
 *
 * @param {Object} props
 * @param {Object} [props.fit={}]
 * @param {number} [props.fit.score=0] - Current alignment score
 * @param {number} [props.fit.previousScore] - Prior alignment score
 * @param {number} [props.fit.delta=0] - Alignment score change
 * @param {string} [props.fit.band] - Alignment band ('early' | 'developing' | 'ready')
 */
export function AlignmentCard({ fit = {} }) {
  const targetScore = Math.max(0, Math.min(100, fit.score ?? 0));
  const [displayScore, setDisplayScore] = useState(targetScore);
  const [showTooltip, setShowTooltip] = useState(false);
  const prevScoreRef = useRef(targetScore);

  // Smooth counter animation on score transition
  useEffect(() => {
    const start = prevScoreRef.current;
    prevScoreRef.current = targetScore;
    if (start === targetScore) {
      setDisplayScore(targetScore);
      return;
    }

    const duration = 600;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (targetScore - start) * eased);
      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animHandle = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animHandle);
  }, [targetScore]);

  const hasDelta = fit.previousScore !== undefined && fit.previousScore !== null;
  const delta = fit.delta ?? (hasDelta ? targetScore - fit.previousScore : 0);
  const isPositive = delta >= 0;

  const tooltipText =
    'A weighted score of how well your skill levels match what this career needs. It is an estimate, not a prediction of success.';

  return (
    <Card className="p-6 md:p-8 flex flex-col justify-between space-y-6 bg-surface border-2 border-ink shadow-md">
      {/* Header with Label and Info Tooltip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted font-bold">
            ESTIMATED CAREER ALIGNMENT
          </span>

          <div
            className="relative inline-flex items-center"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
          >
            <button
              type="button"
              className="p-1 text-muted hover:text-ink cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-none"
              aria-label="Info about estimated career alignment"
              title={tooltipText}
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Accessible Neo-Brutalist Tooltip Popover */}
            {showTooltip && (
              <div
                role="tooltip"
                className="absolute left-6 top-0 z-30 w-64 sm:w-72 p-3 bg-paper border-2 border-ink shadow-md text-xs font-sans text-ink leading-relaxed"
              >
                {tooltipText}
              </div>
            )}
          </div>
        </div>

        {fit.band && (
          <span className="px-2.5 py-0.5 bg-brand-soft border-2 border-ink text-xs font-mono font-bold uppercase tracking-wider text-ink shadow-sm">
            {fit.band}
          </span>
        )}
      </div>

      {/* Hero Display Percentage */}
      <div className="flex items-baseline gap-3">
        <span
          className="font-display text-5xl sm:text-6xl text-ink tracking-tight font-black"
          aria-live="polite"
        >
          {displayScore}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <ProgressBar value={displayScore} max={100} />

        {/* Delta Comparison Line */}
        <div className="flex items-center justify-between text-xs font-mono">
          {hasDelta ? (
            <div className="flex items-center gap-1.5 text-muted">
              <span>
                Previous {fit.previousScore}% → Current {targetScore}%
              </span>
              <span
                className={`inline-flex items-center font-bold px-1.5 py-0.2 border border-ink shadow-sm ${
                  isPositive ? 'bg-state-mastered text-ink' : 'bg-state-missing text-ink'
                }`}
              >
                {isPositive ? (
                  <>
                    <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                    <span>▲{delta}</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                    <span>▼{Math.abs(delta)}</span>
                  </>
                )}
              </span>
            </div>
          ) : (
            <span className="text-muted">Initial career baseline snapshot</span>
          )}

          <span className="text-muted font-bold">100% TARGET</span>
        </div>
      </div>
    </Card>
  );
}

export default AlignmentCard;
