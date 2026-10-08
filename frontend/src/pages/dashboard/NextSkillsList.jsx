import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, AlertTriangle, Sparkles, Sliders } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { getReasonLabel } from '../../utils/reasonLabels.js';

/**
 * NextSkillsList displays top 3 prioritized skills to learn next,
 * reason tags, and the ML/RULES strategy attribution badge.
 *
 * @param {Object} props
 * @param {Array<Object>} [props.nextSkills=[]]
 * @param {string} [props.strategy='ml'] - 'ml' | 'rule'
 * @param {string} [props.fallbackReason] - e.g. 'ML_UNAVAILABLE'
 */
export function NextSkillsList({ nextSkills = [], strategy = 'ml', fallbackReason }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  const top3 = (nextSkills || []).slice(0, 3);
  const isRuleStrategy = strategy === 'rule' || strategy === 'rules';
  const isDegraded = isRuleStrategy && Boolean(fallbackReason || strategy === 'rule');

  const strategyTooltips = {
    ml: 'Ranked by a model trained on synthetic student data.',
    rule: 'Ranked by importance, gap and prerequisites.',
    rules: 'Ranked by importance, gap and prerequisites.',
  };

  const currentStrategyKey = isRuleStrategy ? 'rule' : 'ml';
  const badgeTooltipText = strategyTooltips[currentStrategyKey];

  return (
    <Card className="p-6 md:p-8 space-y-6 bg-surface border-2 border-ink shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-line pb-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-muted font-bold block">
            RECOMMENDED LEARNING SEQUENCE
          </span>
          <h2 className="font-display text-xl text-ink uppercase tracking-tight font-bold">
            Next Skills To Learn
          </h2>
        </div>

        {/* Strategy Attribution Badge */}
        <div
          className="relative inline-flex items-center self-start sm:self-auto"
          onMouseEnter={() => setActiveTooltip('strategy')}
          onMouseLeave={() => setActiveTooltip(null)}
          onFocus={() => setActiveTooltip('strategy')}
          onBlur={() => setActiveTooltip(null)}
        >
          <div
            tabIndex={0}
            role="status"
            aria-label={`Attribution: ${isRuleStrategy ? 'RULES' : 'ML'} engine`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold uppercase border-2 border-ink shadow-sm cursor-help select-none ${
              isRuleStrategy ? 'bg-amber-100 text-ink' : 'bg-brand-soft text-ink'
            }`}
          >
            {isRuleStrategy ? (
              <Sliders className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-brand" />
            )}
            <span>{isRuleStrategy ? 'RULES' : 'ML'}</span>
          </div>

          {activeTooltip === 'strategy' && (
            <div
              role="tooltip"
              className="absolute right-0 top-8 z-30 w-64 p-2.5 bg-paper border-2 border-ink shadow-md text-xs font-sans text-ink leading-snug"
            >
              {badgeTooltipText}
            </div>
          )}
        </div>
      </div>

      {/* Fallback / Degraded Notice */}
      {isDegraded && (
        <div className="p-3 bg-amber-50 border-2 border-amber-300 flex items-start gap-2.5 text-xs text-ink font-sans">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Using rule engine fallback:</span> Ranked by
            curriculum prerequisites and importance because the ML recommendation service is
            currently offline.
          </div>
        </div>
      )}

      {/* Top 3 List */}
      {top3.length === 0 ? (
        <div className="p-6 text-center text-sm font-mono text-muted bg-paper border border-ink">
          No skills currently recommended. Update your profile to recalculate.
        </div>
      ) : (
        <div className="divide-y-2 divide-line">
          {top3.map((item, index) => {
            const skillName = item.skill?.name || item.skill?.slug || 'Unknown Skill';
            const reasonsText = (item.reasons || [])
              .map(getReasonLabel)
              .filter(Boolean)
              .join(' · ');

            return (
              <div
                key={item.skill?.slug || index}
                className="py-4 first:pt-0 last:pb-0 flex items-start gap-4"
              >
                {/* Number Badge 1-3 */}
                <div className="w-8 h-8 rounded-none bg-paper border-2 border-ink shadow-sm flex items-center justify-center font-display font-black text-sm text-ink shrink-0">
                  {index + 1}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-base text-ink font-bold truncate">
                      {skillName}
                    </span>
                    {item.skill?.category && (
                      <span className="font-mono text-[11px] uppercase tracking-wider text-muted px-2 py-0.5 bg-paper border border-line shrink-0">
                        {item.skill.category.replace(/-/g, ' ')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted font-sans leading-relaxed">
                    {reasonsText || 'Direct curriculum prerequisite for your target career'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link to Full Learning Path */}
      <div className="pt-2 text-right">
        <Link
          to="/app/path"
          className="inline-flex items-center gap-1.5 text-xs font-bold font-mono uppercase text-ink underline hover:text-brand transition-colors"
        >
          <span>View Complete Learning Path</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </Card>
  );
}

export default NextSkillsList;
