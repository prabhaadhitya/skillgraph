import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { getCareers } from '../../../services/catalogService.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';

/**
 * Step 2: Choose target career path.
 * Exactly one career card must be selected to proceed.
 */
export function CareerStep({ state, dispatch, headingRef }) {
  const [careers, setCareers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    getCareers()
      .then((data) => {
        setCareers(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load career tracks');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let ignore = false;
    getCareers()
      .then((data) => {
        if (!ignore) {
          setCareers(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Failed to load career tracks');
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <Card className="p-6 sm:p-8 space-y-6">
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-brand font-bold">
          Step 2 of 5
        </span>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl sm:text-3xl text-ink uppercase tracking-tight outline-none"
        >
          Choose Your Target Career
        </h2>
        <p className="text-sm text-muted">
          Your skill graph and learning roadmap will be tailored directly to this goal.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="card" height={130} />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <ErrorState
          title="Couldn't Load Careers"
          message={error}
          onRetry={handleRetry}
        />
      )}

      {!isLoading && !error && careers.length === 0 && (
        <EmptyState
          title="No Careers Found"
          text="No active career options available at this time."
        />
      )}

      {!isLoading && !error && careers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2" role="radiogroup" aria-label="Target Careers">
          {careers.map((career) => {
            const isSelected = state.targetCareerSlug === career.slug;
            return (
              <div
                key={career.slug}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => dispatch({ type: 'SET_CAREER', slug: career.slug })}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    dispatch({ type: 'SET_CAREER', slug: career.slug });
                  }
                }}
                className={`p-5 text-left border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isSelected
                    ? 'border-ink bg-brand-soft shadow-md translate-x-[-2px] translate-y-[-2px]'
                    : 'border-ink bg-surface shadow-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-md'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base uppercase text-ink">
                      {career.name}
                    </h3>
                    <div
                      className={`w-6 h-6 rounded-full border-2 border-ink flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-brand text-white' : 'bg-surface'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted line-clamp-2">
                    {career.description}
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between text-xs font-mono">
                  <span className="uppercase text-muted px-2 py-0.5 bg-paper border border-ink">
                    {career.category || 'software'}
                  </span>
                  <span className="font-bold text-ink">
                    {career.skillCount ? `${career.skillCount} skills required` : 'Core requirements'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default CareerStep;
