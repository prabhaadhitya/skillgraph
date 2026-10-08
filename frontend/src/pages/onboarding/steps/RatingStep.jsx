import { LevelPicker } from '../../../components/ui/LevelPicker.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Trash2 } from 'lucide-react';

/**
 * Step 4: Rate proficiency for each selected skill.
 * Features:
 * - One row per chosen skill using LevelPicker (default level 2)
 * - Presets: Beginner (1) / Intermediate (3) / Advanced (4)
 * - Setting level to 0 removes the skill
 */
export function RatingStep({ state, dispatch, headingRef }) {
  const selectedSkillsList = Object.values(state.selectedSkills || {});

  const handleLevelChange = (slug, level) => {
    if (level === 0) {
      dispatch({ type: 'REMOVE_SKILL', slug });
    } else {
      dispatch({ type: 'SET_SKILL_LEVEL', slug, level });
    }
  };

  return (
    <Card className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-wider text-brand font-bold">
            Step 4 of 5
          </span>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-2xl sm:text-3xl text-ink uppercase tracking-tight outline-none"
          >
            Rate Your Current Proficiency
          </h2>
          <p className="text-sm text-muted">
            Be honest — this calibrates your skill gap analysis. Setting a skill to 0 removes it.
          </p>
        </div>

        {selectedSkillsList.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-muted uppercase mr-1">
              Presets:
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dispatch({ type: 'SET_BULK_LEVELS', level: 1 })}
              className="text-xs"
            >
              Beginner (1)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dispatch({ type: 'SET_BULK_LEVELS', level: 3 })}
              className="text-xs"
            >
              Intermediate (3)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dispatch({ type: 'SET_BULK_LEVELS', level: 4 })}
              className="text-xs"
            >
              Advanced (4)
            </Button>
          </div>
        )}
      </div>

      {selectedSkillsList.length === 0 ? (
        <EmptyState
          title="No Skills Selected"
          text="You have not selected any skills yet. You can continue with an empty profile or go back to select skills."
        />
      ) : (
        <div className="divide-y divide-line border-2 border-ink bg-surface shadow-sm pt-1">
          {selectedSkillsList.map((skill) => (
            <div
              key={skill.slug}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-paper/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base text-ink uppercase">
                    {skill.name}
                  </h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-paper border border-ink text-muted">
                    {skill.category || 'skill'}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Current Level: <strong className="text-ink font-mono">{skill.level ?? 2} / 5</strong>
                </p>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <LevelPicker
                  value={skill.level ?? 2}
                  onChange={(newLevel) => handleLevelChange(skill.slug, newLevel)}
                  compact
                />
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'REMOVE_SKILL', slug: skill.slug })}
                  className="p-2 text-muted hover:text-state-missing transition-colors cursor-pointer"
                  title="Remove skill"
                  aria-label={`Remove ${skill.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default RatingStep;
