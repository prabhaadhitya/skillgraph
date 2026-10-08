import { useState, useMemo, useEffect } from 'react';
import { SlidersHorizontal, Trash2 } from 'lucide-react';
import { useUserSkills } from '../../hooks/useUserSkills.js';
import { getSkills } from '../../services/catalogService.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { LevelPicker, LEVEL_NAMES } from '../../components/ui/LevelPicker.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';

/**
 * SkillsEditor allows students to view and adjust proficiency across all skills
 * in the catalog grouped by category.
 *
 * Features:
 * - Category grouping
 * - Search filter
 * - LevelPicker per skill (0 removes skill)
 * - Optimistic update with automatic rollback on error
 * - Analysis query cache invalidation on save
 *
 * @param {Object} props
 * @param {Function} [props.onUpdateSkill] - Optional custom update handler (used in tests)
 */
export function SkillsEditor({ onUpdateSkill }) {
  const { skills: userSkills, isLoading: isUserSkillsLoading, error: userSkillsError, updateSkill } = useUserSkills();
  const { toast } = useToast();

  const [catalogSkills, setCatalogSkills] = useState([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localOverrides, setLocalOverrides] = useState({});

  // Fetch full skill catalog
  useEffect(() => {
    let ignore = false;
    getSkills()
      .then((skills) => {
        if (!ignore) {
          setCatalogSkills(skills);
          setIsCatalogLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setCatalogError(err.message || 'Failed to load skills catalog');
          setIsCatalogLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Map of skillSlug -> proficiency from userSkills
  const userSkillMap = useMemo(() => {
    const map = {};
    (userSkills || []).forEach((item) => {
      const slug = item.skill?.slug || item.skillSlug;
      if (slug) {
        map[slug] = item.proficiency;
      }
    });
    return map;
  }, [userSkills]);

  // Combined proficiencies with local optimistic overrides
  const getSkillLevel = (slug) => {
    if (localOverrides[slug] !== undefined) {
      return localOverrides[slug];
    }
    return userSkillMap[slug] ?? 0;
  };

  // Filter skills based on search query
  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return catalogSkills;
    const q = searchQuery.toLowerCase().trim();
    return catalogSkills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q)),
    );
  }, [catalogSkills, searchQuery]);

  // Group skills by category
  const groupedSkills = useMemo(() => {
    const groups = {};
    for (const skill of filteredSkills) {
      const cat = skill.category || 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(skill);
    }
    return groups;
  }, [filteredSkills]);

  // Handle level change with optimistic update and rollback
  const handleLevelChange = async (skill, newLevel) => {
    const oldLevel = getSkillLevel(skill.slug);
    if (oldLevel === newLevel) return;

    // 1. Optimistic update
    setLocalOverrides((prev) => ({ ...prev, [skill.slug]: newLevel }));

    try {
      if (onUpdateSkill) {
        await onUpdateSkill(skill.slug, newLevel, skill.name);
      } else {
        await updateSkill({
          skillSlug: skill.slug,
          proficiency: newLevel,
          skillName: skill.name,
        });
      }
    } catch (err) {
      // 2. Revert on error
      setLocalOverrides((prev) => ({ ...prev, [skill.slug]: oldLevel }));
      toast.error(err.message || `Failed to update ${skill.name}`);
    }
  };

  const isLoading = isUserSkillsLoading || isCatalogLoading;
  const error = userSkillsError || catalogError;

  if (isLoading) {
    return (
      <Card className="p-6 md:p-8 space-y-6 bg-surface border-2 border-ink shadow-md">
        <Skeleton variant="rectangular" height={40} />
        <div className="space-y-4">
          <Skeleton variant="card" height={100} />
          <Skeleton variant="card" height={100} />
          <Skeleton variant="card" height={100} />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 md:p-8 bg-surface border-2 border-ink shadow-md">
        <ErrorState
          title="Could Not Load Skills"
          message={error.message || 'Failed to fetch skill catalog'}
          onRetry={() => window.location.reload()}
        />
      </Card>
    );
  }

  const activeRatedCount = Object.keys(catalogSkills).reduce((acc, idx) => {
    const s = catalogSkills[idx];
    return getSkillLevel(s.slug) > 0 ? acc + 1 : acc;
  }, 0);

  return (
    <Card className="p-6 md:p-8 space-y-6 bg-surface border-2 border-ink shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-line pb-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-brand font-bold block">
            SKILL PROFICIENCY MANAGER
          </span>
          <h2 className="font-display text-xl text-ink uppercase tracking-tight font-bold">
            Edit Your Skill Levels
          </h2>
          <p className="text-xs text-muted font-sans mt-0.5">
            Calibrate each skill from 1 to 5. Setting a skill to 0 removes it from your profile.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-paper border-2 border-ink shadow-sm font-mono text-xs font-bold text-ink self-start sm:self-auto shrink-0">
          {activeRatedCount} ACTIVE {activeRatedCount === 1 ? 'SKILL' : 'SKILLS'}
        </div>
      </div>

      {/* Filter and Search Input */}
      <div className="max-w-md">
        <Input
          id="skills-editor-search"
          placeholder="Filter skills (e.g. Python, SQL, React)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grouped Skills Lists */}
      <div className="space-y-8 pt-2">
        {Object.entries(groupedSkills).map(([category, skills]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2 border-b-2 border-line pb-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
                {category.replace(/-/g, ' ')} ({skills.length})
              </h3>
            </div>

            <div className="divide-y divide-line border border-line bg-surface">
              {skills.map((skill) => {
                const currentLevel = getSkillLevel(skill.slug);
                const isRated = currentLevel > 0;

                return (
                  <div
                    key={skill.slug}
                    className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-paper/40 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm text-ink uppercase font-bold">
                          {skill.name}
                        </span>
                        {isRated && (
                          <span className="px-1.5 py-0.2 bg-brand-soft border border-ink text-[10px] font-mono font-bold text-ink">
                            {LEVEL_NAMES[currentLevel]}
                          </span>
                        )}
                      </div>
                      {skill.description && (
                        <p className="text-xs text-muted font-sans line-clamp-1">
                          {skill.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                      <LevelPicker
                        compact
                        value={currentLevel}
                        onChange={(lvl) => handleLevelChange(skill, lvl)}
                      />

                      {isRated && (
                        <button
                          type="button"
                          onClick={() => handleLevelChange(skill, 0)}
                          className="p-1.5 text-muted hover:text-state-missing transition-colors cursor-pointer"
                          title={`Remove ${skill.name}`}
                          aria-label={`Remove ${skill.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(groupedSkills).length === 0 && (
          <div className="text-center py-8 text-sm font-mono text-muted bg-paper border border-ink">
            No matching skills found for &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </Card>
  );
}

export default SkillsEditor;
