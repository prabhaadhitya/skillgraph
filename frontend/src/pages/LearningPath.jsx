import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, HelpCircle, Clock } from 'lucide-react';
import { useLearningPath } from '../hooks/useLearningPath.js';
import { useUpdateSkill } from '../hooks/useUpdateSkill.js';
import { LEVEL_NAMES } from '../components/ui/LevelPicker.jsx';
import { getReasonLabel } from '../utils/reasonLabels.js';
import { Card, Tag, Button, LevelPicker, Skeleton, ErrorState, EmptyState } from '../components/ui';

/**
 * Learning Path page (/app/path).
 * Vertical timeline of prerequisite-ordered curriculum steps with
 * inline proficiency updates, time budgeting filter, and AI explanations.
 */
export default function LearningPath({ career }) {
  useEffect(() => {
    document.title = 'SkillGraph — Learning Path';
  }, []);

  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [weeksFilter, setWeeksFilter] = useState(null);
  const [optimisticLevels, setOptimisticLevels] = useState({});
  const [completedSlugs, setCompletedSlugs] = useState(() => new Set());
  const [mutatingSlugs, setMutatingSlugs] = useState(() => new Set());

  const { data, isLoading, isError, error, refetch } = useLearningPath(career);
  const updateSkillMutation = useUpdateSkill();

  const totalSteps = data?.totalSteps ?? data?.steps?.length ?? 0;
  const totalEffortPoints = data?.totalEffortPoints ?? 0;
  const estimatedWeeks = Math.ceil(totalEffortPoints / 6);
  const steps = data?.steps || [];
  const visibleSteps = showAll ? steps : steps.slice(0, 8);

  const handleLevelChange = (step, newLevel) => {
    const slug = step.skill?.slug;
    if (!slug) return;

    const prevLevel = optimisticLevels[slug] ?? step.fromLevel;
    if (newLevel === prevLevel) return;

    // Optimistically update level
    setOptimisticLevels((prev) => ({ ...prev, [slug]: newLevel }));
    setMutatingSlugs((prev) => new Set([...prev, slug]));

    // If step target level reached, mark completed
    const willComplete = newLevel >= step.toLevel;
    if (willComplete) {
      setCompletedSlugs((prev) => new Set([...prev, slug]));
    }

    updateSkillMutation.mutate(
      {
        skillSlug: slug,
        proficiency: newLevel,
      },
      {
        onSuccess: () => {
          setMutatingSlugs((prev) => {
            const next = new Set(prev);
            next.delete(slug);
            return next;
          });
        },
        onError: () => {
          // Revert optimistic changes on failure
          setOptimisticLevels((prev) => {
            const next = { ...prev };
            delete next[slug];
            return next;
          });
          setCompletedSlugs((prev) => {
            const next = new Set(prev);
            next.delete(slug);
            return next;
          });
          setMutatingSlugs((prev) => {
            const next = new Set(prev);
            next.delete(slug);
            return next;
          });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div data-testid="path-skeleton" className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 font-sans">
        <Skeleton variant="card" height={100} />
        <div className="space-y-4">
          <Skeleton variant="card" height={130} />
          <Skeleton variant="card" height={130} />
          <Skeleton variant="card" height={130} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 md:p-12 font-sans flex items-center justify-center min-h-[500px]">
        <ErrorState
          title="FAILED TO LOAD LEARNING PATH"
          message={error?.message || 'Could not fetch your personalized curriculum.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="p-6 md:p-12 font-sans flex items-center justify-center min-h-[500px]">
        <EmptyState
          title="ALL GAPS CLOSED"
          text="You have closed every gap for this career."
          actionLabel="Explore Careers"
          onAction={() => navigate('/app/careers')}
        />
      </div>
    );
  }

  // Calculate cumulative effort for week budgeting purely without variable reassignments
  const stepsWithBudget = visibleSteps.map((step, idx) => {
    const cumulative = visibleSteps
      .slice(0, idx + 1)
      .reduce((sum, s) => sum + (s.effortPoints || 0), 0);
    return {
      ...step,
      isBeyondBudget: weeksFilter !== null && cumulative > weeksFilter * 6,
    };
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto font-sans flex flex-col gap-6">
      {/* Header Card */}
      <header className="bg-surface border-2 border-ink shadow-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <Tag tone="brand">{data?.career?.name || 'Target Career'}</Tag>
          <div className="font-mono text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <span>{`${totalSteps} steps`}</span>
            <span>·</span>
            <span>{`${totalEffortPoints} effort points`}</span>
            <span>·</span>
            <span>{`~${estimatedWeeks} weeks`}</span>
          </div>
        </div>

        <h1 className="font-display uppercase text-2xl md:text-3xl tracking-tight text-ink">
          ORDERED LEARNING PATH
        </h1>
        <p className="text-sm text-muted font-sans mt-1">
          Topologically ordered prerequisite sequence generated by our deterministic rule engine.
        </p>

        {/* Time Budget Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t-2 border-line">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-brand shrink-0" />
            <label
              htmlFor="weeks-filter"
              className="font-mono text-xs font-bold uppercase tracking-wider text-ink"
            >
              Show what fits in:
            </label>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              id="weeks-filter"
              aria-label="Time filter in weeks"
              value={weeksFilter ?? ''}
              onChange={(e) => setWeeksFilter(e.target.value ? Number(e.target.value) : null)}
              className="bg-paper border-2 border-ink px-2.5 py-1 text-xs font-mono font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand shadow-2xs cursor-pointer"
            >
              <option value="">All steps ({estimatedWeeks} wks)</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  {w} {w === 1 ? 'week' : 'weeks'} ({w * 6} pts)
                </option>
              ))}
            </select>

            {weeksFilter !== null && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeeksFilter(null)}
                className="text-[11px] h-7 px-2 font-mono uppercase"
              >
                Clear filter
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Vertical Timeline of Step Cards */}
      <div className="space-y-4" role="list" aria-label="Learning path steps">
        {stepsWithBudget.map((step) => {
          const isBeyondBudget = step.isBeyondBudget;
          const slug = step.skill?.slug;
          const isCompleted = completedSlugs.has(slug);
          const currentProficiency = optimisticLevels[slug] ?? step.fromLevel;

          const neededPrereqs = (step.prerequisites || [])
            .map((p) => p.name || p.slug)
            .join(', ');

          return (
            <Card
              key={step.order}
              tone="default"
              data-testid={`step-card-${step.order}`}
              data-dimmed={isBeyondBudget ? 'true' : 'false'}
              className={`relative p-5 transition-all duration-120 ${
                isBeyondBudget
                  ? 'opacity-40 grayscale-[30%] bg-paper/60 border-dashed'
                  : 'hover:shadow-md'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Left: Step Order & Skill Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-display text-2xl text-brand leading-none">
                      {String(step.order).padStart(2, '0')}
                    </span>
                    <h2 className="font-display uppercase text-lg text-ink">
                      {step.skill?.name}
                    </h2>
                    <Tag tone="default">{step.skill?.category}</Tag>

                    {step.isReadyNow ? (
                      <Tag tone="pop">READY NOW</Tag>
                    ) : (
                      <span className="text-xs font-mono text-muted">
                        Needs: {neededPrereqs || 'Prerequisites'}
                      </span>
                    )}

                    {isBeyondBudget && (
                      <Tag tone="muted" className="text-[10px]">
                        Beyond {weeksFilter} wks
                      </Tag>
                    )}
                  </div>

                  {/* Level Transitions & Effort */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 border border-ink bg-paper font-mono text-xs font-bold">
                      Lv {currentProficiency} ({LEVEL_NAMES[currentProficiency]})
                    </span>
                    <ArrowRight size={14} className="text-muted" />
                    <span className="px-2 py-0.5 border border-ink bg-surface font-mono text-xs font-bold text-brand">
                      Lv {step.toLevel} ({LEVEL_NAMES[step.toLevel]})
                    </span>
                    <span className="px-2 py-0.5 border border-line bg-paper font-mono text-xs text-muted font-bold">
                      {step.effortPoints} pts
                    </span>
                  </div>

                  {/* Reason Tags */}
                  {step.reasons?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {step.reasons.map((code) => (
                        <Tag key={code} tone="soft" className="text-[10px]">
                          {getReasonLabel(code)}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col sm:items-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted font-bold">I&apos;m now at:</span>
                    {isCompleted ? (
                      <div className="inline-flex items-center gap-1 font-display font-black text-xs uppercase px-2 py-1 bg-state-mastered text-ink border-2 border-ink shadow-2xs rotate-[-2deg]">
                        ✓ Done
                      </div>
                    ) : (
                      <LevelPicker
                        value={currentProficiency}
                        onChange={(newLevel) => handleLevelChange(step, newLevel)}
                        compact
                        disabled={mutatingSlugs.has(slug)}
                      />
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<HelpCircle size={14} />}
                    onClick={() => {
                      const query = encodeURIComponent(`Why should I learn ${step.skill?.name}?`);
                      navigate(`/app/assistant?q=${query}`);
                    }}
                    className="text-xs h-7 px-2.5"
                  >
                    Ask why
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Show All Steps Toggle */}
      {steps.length > 8 && (
        <div className="text-center pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowAll(!showAll)}
            className="font-mono text-xs uppercase"
          >
            {showAll ? 'Show fewer steps' : `Show all ${steps.length} steps`}
          </Button>
        </div>
      )}
    </div>
  );
}
