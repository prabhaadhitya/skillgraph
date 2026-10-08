import { ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { LEVEL_NAMES } from '../../../components/ui/LevelPicker.jsx';

/**
 * Step 5: Review summary before submitting profile and generating graph.
 *
 * @param {Object} props
 * @param {Object} props.state - Onboarding state
 * @param {Function} props.onSubmit - Trigger submission
 * @param {React.RefObject} props.headingRef
 */
export function ReviewStep({ state, onSubmit, headingRef }) {
  const selectedSkillsList = Object.values(state.selectedSkills || {}).filter(
    (s) => s.level > 0,
  );

  const careerName = state.targetCareerSlug
    ? state.targetCareerSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Not Selected';

  return (
    <Card className="p-6 sm:p-8 space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-brand font-bold">
          Step 5 of 5
        </span>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl sm:text-3xl text-ink uppercase tracking-tight outline-none"
        >
          Review Your Setup
        </h2>
        <p className="text-sm text-muted">
          Double-check your choices. Once confirmed, we will compute your initial career alignment and generate your prerequisite graph.
        </p>
      </div>

      {state.submitError && (
        <ErrorState
          title="Could Not Build Your Graph"
          message={state.submitError}
          onRetry={onSubmit}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="p-5 border-2 border-ink bg-surface shadow-sm space-y-3">
          <span className="text-xs font-mono uppercase tracking-wider text-muted font-bold border-b border-line pb-1 block">
            Student Profile
          </span>
          <div className="space-y-1.5 text-sm">
            <p className="flex justify-between">
              <span className="text-muted">Name:</span>
              <strong className="text-ink">{state.name || 'Not provided'}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-muted">College:</span>
              <strong className="text-ink">{state.college || '—'}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-muted">Degree / Branch:</span>
              <strong className="text-ink">
                {state.degree || state.branch
                  ? `${state.degree || ''} ${state.branch ? `(${state.branch})` : ''}`.trim()
                  : '—'}
              </strong>
            </p>
            <p className="flex justify-between">
              <span className="text-muted">Current Semester:</span>
              <strong className="text-ink font-mono">Semester {state.semester}</strong>
            </p>
          </div>
        </div>

        {/* Career Goal Card */}
        <div className="p-5 border-2 border-ink bg-brand-soft shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted font-bold border-b border-line pb-1 block">
              Target Career Track
            </span>
            <div className="pt-2">
              <h3 className="font-display text-xl uppercase text-ink">
                {careerName}
              </h3>
              <p className="text-xs font-mono text-muted pt-1">
                Slug: {state.targetCareerSlug}
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-ink font-bold pt-4">
            {selectedSkillsList.length} skills rated for baseline alignment
          </div>
        </div>
      </div>

      {/* Rated Skills Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h3 className="font-display text-sm uppercase text-ink tracking-tight">
            Rated Skills ({selectedSkillsList.length})
          </h3>
          {selectedSkillsList.length === 0 && (
            <span className="text-xs text-muted font-mono flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Starting with 0 skills
            </span>
          )}
        </div>

        {selectedSkillsList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {selectedSkillsList.map((skill) => (
              <div
                key={skill.slug}
                className="p-3 bg-surface border-2 border-ink shadow-sm flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-ink truncate">
                    {skill.name}
                  </p>
                  <p className="text-[10px] text-muted font-mono">
                    {LEVEL_NAMES[skill.level] || `Level ${skill.level}`}
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-brand text-white border border-ink text-xs font-mono font-bold shrink-0">
                  Lv {skill.level}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted font-mono italic p-4 bg-paper border-2 border-ink">
            No baseline skills recorded. All graph requirements will appear as missing and ordered from scratch.
          </p>
        )}
      </div>

      {/* Action Band */}
      <div className="pt-4 border-t-2 border-ink flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Sparkles className="w-4 h-4 text-brand shrink-0" />
          <span>Ready to compute prerequisites, gaps, and personalized path.</span>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={onSubmit}
          loading={state.isSubmitting}
          icon={ArrowRight}
          className="w-full sm:w-auto font-display text-sm px-8 py-3.5"
        >
          BUILD MY GRAPH
        </Button>
      </div>
    </Card>
  );
}

export default ReviewStep;
