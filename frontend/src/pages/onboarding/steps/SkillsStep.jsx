import { useEffect, useState, useMemo } from 'react';
import { Check, Plus, Sparkles } from 'lucide-react';
import { getCareerDetail, getSkills } from '../../../services/catalogService.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { Input } from '../../../components/ui/Input.jsx';

/**
 * Step 3: Select initial skills.
 * Features:
 * - Search filter
 * - "Recommended for <career>" section first
 * - Other skills grouped by category
 * - Click chip to toggle selection
 * - 0 skills selected is allowed
 */
export function SkillsStep({ state, dispatch, headingRef }) {
  const [recommendedSkills, setRecommendedSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      getSkills(),
      state.targetCareerSlug ? getCareerDetail(state.targetCareerSlug) : Promise.resolve(null),
    ])
      .then(([skillsList, careerDetail]) => {
        setAllSkills(skillsList);
        if (careerDetail?.skills) {
          setRecommendedSkills(careerDetail.skills.map((cs) => cs.skill || cs));
        } else {
          setRecommendedSkills([]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load skills catalog');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      getSkills(),
      state.targetCareerSlug ? getCareerDetail(state.targetCareerSlug) : Promise.resolve(null),
    ])
      .then(([skillsList, careerDetail]) => {
        if (!ignore) {
          setAllSkills(skillsList);
          if (careerDetail?.skills) {
            setRecommendedSkills(careerDetail.skills.map((cs) => cs.skill || cs));
          } else {
            setRecommendedSkills([]);
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Failed to load skills catalog');
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [state.targetCareerSlug]);

  const recommendedSlugs = useMemo(
    () => new Set(recommendedSkills.map((s) => s.slug)),
    [recommendedSkills],
  );

  // Filter skills by search query
  const filteredAllSkills = useMemo(() => {
    if (!searchQuery.trim()) return allSkills;
    const q = searchQuery.toLowerCase().trim();
    return allSkills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q)),
    );
  }, [allSkills, searchQuery]);

  const filteredRecommended = useMemo(() => {
    if (!searchQuery.trim()) return recommendedSkills;
    const q = searchQuery.toLowerCase().trim();
    return recommendedSkills.filter((s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q));
  }, [recommendedSkills, searchQuery]);

  // Group non-recommended skills by category
  const skillsByCategory = useMemo(() => {
    const groups = {};
    for (const skill of filteredAllSkills) {
      if (recommendedSlugs.has(skill.slug)) continue;
      const cat = skill.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(skill);
    }
    return groups;
  }, [filteredAllSkills, recommendedSlugs]);

  const selectedCount = Object.keys(state.selectedSkills || {}).length;

  const renderChip = (skill) => {
    const isSelected = Boolean(state.selectedSkills?.[skill.slug]);
    return (
      <button
        key={skill.slug}
        type="button"
        onClick={() => dispatch({ type: 'TOGGLE_SKILL', skill })}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-2 transition-all cursor-pointer ${
          isSelected
            ? 'bg-brand text-white border-ink shadow-sm'
            : 'bg-surface text-ink border-ink hover:bg-brand-soft hover:shadow-sm'
        }`}
      >
        {isSelected ? (
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        ) : (
          <Plus className="w-3.5 h-3.5" />
        )}
        <span>{skill.name}</span>
      </button>
    );
  };

  return (
    <Card className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-wider text-brand font-bold">
            Step 3 of 5
          </span>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-2xl sm:text-3xl text-ink uppercase tracking-tight outline-none"
          >
            Select Any Skills You Already Know
          </h2>
          <p className="text-sm text-muted">
            Click to add technologies you&apos;ve worked with. You can select zero if you are starting fresh.
          </p>
        </div>

        <div className="shrink-0 px-3 py-1.5 bg-paper border-2 border-ink shadow-sm font-mono text-xs font-bold text-ink self-start sm:self-auto">
          {selectedCount} {selectedCount === 1 ? 'SKILL' : 'SKILLS'} SELECTED
        </div>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <Input
          id="skill-search"
          placeholder="Filter skills (e.g. Python, SQL, React)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="space-y-6 pt-2">
          <Skeleton variant="card" height={100} />
          <Skeleton variant="card" height={160} />
        </div>
      )}

      {!isLoading && error && (
        <ErrorState
          title="Could Not Load Skills"
          message={error}
          onRetry={handleRetry}
        />
      )}

      {!isLoading && !error && (
        <div className="space-y-8 pt-2">
          {/* 1. Recommended Skills Section */}
          {filteredRecommended.length > 0 && (
            <div className="space-y-3 p-4 bg-paper border-2 border-ink shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand" />
                <h3 className="font-display text-sm uppercase text-ink tracking-tight">
                  Recommended for your career track
                </h3>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {filteredRecommended.map(renderChip)}
              </div>
            </div>
          )}

          {/* 2. Categorized Skills */}
          {Object.entries(skillsByCategory).map(([category, skills]) => (
            <div key={category} className="space-y-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted font-bold border-b border-line pb-1">
                {category.replace(/-/g, ' ')} ({skills.length})
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {skills.map(renderChip)}
              </div>
            </div>
          ))}

          {filteredRecommended.length === 0 && Object.keys(skillsByCategory).length === 0 && (
            <p className="text-sm font-mono text-muted py-6 text-center">
              No matching skills found for &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export default SkillsStep;
