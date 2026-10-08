import { useReducer, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { patchMe, putSkills } from '../../services/userService.js';

import { AboutStep } from './steps/AboutStep.jsx';
import { CareerStep } from './steps/CareerStep.jsx';
import { SkillsStep } from './steps/SkillsStep.jsx';
import { RatingStep } from './steps/RatingStep.jsx';
import { ReviewStep } from './steps/ReviewStep.jsx';

const STEPS = [
  { step: 1, label: 'About' },
  { step: 2, label: 'Career' },
  { step: 3, label: 'Skills' },
  { step: 4, label: 'Rating' },
  { step: 5, label: 'Review' },
];

function onboardingReducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        step: Math.max(1, Math.min(5, action.step)),
        submitError: null,
      };

    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.field]: action.value,
      };

    case 'SET_CAREER':
      return {
        ...state,
        targetCareerSlug: action.slug,
      };

    case 'TOGGLE_SKILL': {
      const { skill } = action;
      const current = { ...(state.selectedSkills || {}) };
      if (current[skill.slug]) {
        delete current[skill.slug];
      } else {
        current[skill.slug] = {
          slug: skill.slug,
          name: skill.name,
          category: skill.category,
          difficulty: skill.difficulty,
          level: 2, // Default level 2 per UX_FLOWS.md F1
        };
      }
      return {
        ...state,
        selectedSkills: current,
      };
    }

    case 'SET_SKILL_LEVEL': {
      const { slug, level } = action;
      const current = { ...(state.selectedSkills || {}) };
      if (level === 0) {
        delete current[slug];
      } else if (current[slug]) {
        current[slug] = {
          ...current[slug],
          level,
        };
      }
      return {
        ...state,
        selectedSkills: current,
      };
    }

    case 'REMOVE_SKILL': {
      const current = { ...(state.selectedSkills || {}) };
      delete current[action.slug];
      return {
        ...state,
        selectedSkills: current,
      };
    }

    case 'SET_BULK_LEVELS': {
      const { level } = action;
      const current = { ...(state.selectedSkills || {}) };
      for (const slug of Object.keys(current)) {
        current[slug] = {
          ...current[slug],
          level,
        };
      }
      return {
        ...state,
        selectedSkills: current,
      };
    }

    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.isSubmitting,
      };

    case 'SET_SUBMIT_ERROR':
      return {
        ...state,
        submitError: action.error,
        isSubmitting: false,
      };

    default:
      return state;
  }
}

/**
 * 5-Step Onboarding Wizard for new students.
 * Manages full wizard state via single useReducer.
 */
export function OnboardingPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const queryCareer = searchParams.get('career') || '';

  const [state, dispatch] = useReducer(onboardingReducer, {
    step: 1,
    name: user?.name || '',
    college: user?.college || '',
    degree: user?.degree || '',
    branch: user?.branch || '',
    semester: user?.semester || '',
    targetCareerSlug: queryCareer || user?.targetCareer?.slug || '',
    selectedSkills: {},
    isSubmitting: false,
    submitError: null,
  });

  const headingRef = useRef(null);

  // Focus step heading on every step transition for accessibility
  useEffect(() => {
    headingRef.current?.focus();
  }, [state.step]);

  // Validation rules for Next button
  const isNextDisabled = () => {
    if (state.step === 1) {
      return !state.semester || String(state.semester).trim() === '';
    }
    if (state.step === 2) {
      return !state.targetCareerSlug;
    }
    return false;
  };

  const handleNext = () => {
    if (state.step < 5 && !isNextDisabled()) {
      dispatch({ type: 'SET_STEP', step: state.step + 1 });
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      dispatch({ type: 'SET_STEP', step: state.step - 1 });
    }
  };

  const handleSubmit = async () => {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });

    try {
      // 1. PATCH /users/me
      const profilePayload = {
        name: state.name || undefined,
        college: state.college || undefined,
        degree: state.degree || undefined,
        branch: state.branch || undefined,
        semester: Number(state.semester),
        targetCareerSlug: state.targetCareerSlug,
        onboardingCompleted: true,
      };

      await patchMe(profilePayload);

      // 2. PUT /users/me/skills
      const skillsPayload = Object.values(state.selectedSkills || {})
        .filter((s) => s.level > 0)
        .map((s) => ({
          skillSlug: s.slug,
          proficiency: s.level,
        }));

      await putSkills(skillsPayload);

      // Update in-memory auth state
      if (setUser) {
        setUser((prev) => ({
          ...prev,
          name: state.name || prev?.name,
          college: state.college,
          degree: state.degree,
          branch: state.branch,
          semester: Number(state.semester),
          targetCareer: {
            slug: state.targetCareerSlug,
            name: state.targetCareerSlug.replace(/-/g, ' '),
          },
          onboardingCompleted: true,
        }));
      }

      // Show success toast and navigate to dashboard
      toast.success('Your graph is ready');
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      dispatch({
        type: 'SET_SUBMIT_ERROR',
        error: err.message || 'Failed to complete onboarding. Please try again.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink p-4 sm:p-6 lg:p-10 flex flex-col justify-between font-sans">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Brand header */}
        <div className="flex items-center justify-between border-b-2 border-ink pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-display font-bold text-xs border-2 border-ink shadow-sm">
              SG
            </div>
            <span className="font-display text-base tracking-tight text-ink font-bold">
              SKILLGRAPH ONBOARDING
            </span>
          </div>

          <span className="font-mono text-xs uppercase px-2.5 py-1 bg-surface border-2 border-ink shadow-sm font-bold">
            STEP {state.step} OF 5
          </span>
        </div>

        {/* Stepper Progress Bar */}
        <nav aria-label="Wizard Steps" className="grid grid-cols-5 gap-1.5 sm:gap-3">
          {STEPS.map((s) => {
            const isCompleted = state.step > s.step;
            const isCurrent = state.step === s.step;
            return (
              <div
                key={s.step}
                className={`p-2 border-2 text-center transition-all ${
                  isCurrent
                    ? 'border-ink bg-brand text-white shadow-sm font-bold'
                    : isCompleted
                      ? 'border-ink bg-brand-soft text-ink font-semibold'
                      : 'border-line bg-surface text-muted opacity-70'
                }`}
              >
                <div className="text-[10px] sm:text-xs font-mono uppercase truncate">
                  {s.step}. {s.label}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Step Content */}
        <div className="pt-2">
          {state.step === 1 && (
            <AboutStep state={state} dispatch={dispatch} headingRef={headingRef} />
          )}
          {state.step === 2 && (
            <CareerStep state={state} dispatch={dispatch} headingRef={headingRef} />
          )}
          {state.step === 3 && (
            <SkillsStep state={state} dispatch={dispatch} headingRef={headingRef} />
          )}
          {state.step === 4 && (
            <RatingStep state={state} dispatch={dispatch} headingRef={headingRef} />
          )}
          {state.step === 5 && (
            <ReviewStep
              state={state}
              onSubmit={handleSubmit}
              headingRef={headingRef}
            />
          )}
        </div>

        {/* Navigation Controls (Steps 1 to 4) */}
        {state.step < 5 && (
          <div className="flex items-center justify-between pt-4 border-t-2 border-ink">
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={state.step === 1}
              icon={ArrowLeft}
            >
              BACK
            </Button>

            <Button
              variant="primary"
              onClick={handleNext}
              disabled={isNextDisabled()}
              icon={ArrowRight}
            >
              NEXT
            </Button>
          </div>
        )}

        {/* Back button on Step 5 (if needed) */}
        {state.step === 5 && (
          <div className="flex items-center justify-start pt-2">
            <Button
              variant="secondary"
              onClick={handleBack}
              icon={ArrowLeft}
              disabled={state.isSubmitting}
            >
              BACK TO RATINGS
            </Button>
          </div>
        )}
      </div>

      <div className="text-center pt-8 text-xs font-mono text-muted">
        SkillGraph Career Alignment Engine · Step {state.step} of 5
      </div>
    </div>
  );
}

export default OnboardingPage;
