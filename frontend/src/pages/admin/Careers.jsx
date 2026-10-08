import { useState, useEffect } from 'react';
import { Briefcase, AlertTriangle, Plus, Trash2, Check, Sparkles } from 'lucide-react';
import { getCareers, getCareerDetail, getSkills } from '../../services/catalogService.js';
import * as adminService from '../../services/adminService.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

function getImportanceLabel(val) {
  if (val >= 0.9) return 'Very High';
  if (val >= 0.7) return 'High';
  if (val >= 0.5) return 'Medium';
  return 'Low';
}

export function Careers() {
  const { toast } = useToast();

  const [careers, setCareers] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [selectedCareerSlug, setSelectedCareerSlug] = useState('');
  const [careerSkills, setCareerSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [closureErrorDetails, setClosureErrorDetails] = useState(null);
  const [skillToAdd, setSkillToAdd] = useState('');

  useEffect(() => {
    let ignore = false;
    Promise.all([getCareers(), getSkills()])
      .then(([cList, sList]) => {
        if (!ignore) {
          setCareers(cList);
          setAllSkills(sList);
          if (cList.length > 0 && !selectedCareerSlug) {
            setSelectedCareerSlug(cList[0].slug);
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          toast.error(err.message || 'Failed to load catalog data');
        }
      });

    return () => {
      ignore = true;
    };
  }, [toast, selectedCareerSlug]);

  useEffect(() => {
    let ignore = false;
    if (selectedCareerSlug) {
      getCareerDetail(selectedCareerSlug)
        .then((detail) => {
          if (!ignore) {
            const items = (detail.skills || []).map((cs) => ({
              skillSlug: cs.skill?.slug || cs.skillSlug,
              name: cs.skill?.name || cs.skillSlug,
              category: cs.skill?.category || 'general',
              importance: cs.importance !== undefined ? cs.importance : 0.8,
              requiredLevel: cs.requiredLevel || 3,
            }));
            setCareerSkills(items);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (!ignore) {
            toast.error(err.message || 'Failed to load career skills');
            setIsLoading(false);
          }
        });
    }

    return () => {
      ignore = true;
    };
  }, [selectedCareerSlug, toast]);

  const refreshCareerSkills = async (slug) => {
    if (!slug) return;
    try {
      setIsLoading(true);
      setClosureErrorDetails(null);
      const detail = await getCareerDetail(slug);
      const items = (detail.skills || []).map((cs) => ({
        skillSlug: cs.skill?.slug || cs.skillSlug,
        name: cs.skill?.name || cs.skillSlug,
        category: cs.skill?.category || 'general',
        importance: cs.importance !== undefined ? cs.importance : 0.8,
        requiredLevel: cs.requiredLevel || 3,
      }));
      setCareerSkills(items);
    } catch (err) {
      toast.error(err.message || 'Failed to load career skills');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportanceChange = (slug, value) => {
    setCareerSkills((prev) =>
      prev.map((cs) => (cs.skillSlug === slug ? { ...cs, importance: Number(value) } : cs)),
    );
  };

  const handleLevelChange = (slug, level) => {
    setCareerSkills((prev) =>
      prev.map((cs) => (cs.skillSlug === slug ? { ...cs, requiredLevel: Number(level) } : cs)),
    );
  };

  const handleRemoveSkill = (slug) => {
    setCareerSkills((prev) => prev.filter((cs) => cs.skillSlug !== slug));
  };

  const handleAddSkill = () => {
    if (!skillToAdd) return;
    const skillMeta = allSkills.find((s) => s.slug === skillToAdd);
    if (!skillMeta) return;

    if (careerSkills.some((cs) => cs.skillSlug === skillToAdd)) {
      toast.info(`Skill '${skillMeta.name}' is already in this career`);
      return;
    }

    setCareerSkills((prev) => [
      ...prev,
      {
        skillSlug: skillMeta.slug,
        name: skillMeta.name,
        category: skillMeta.category || 'general',
        importance: 0.7,
        requiredLevel: 3,
      },
    ]);
    setSkillToAdd('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setClosureErrorDetails(null);

    const payload = careerSkills.map((cs) => ({
      skillSlug: cs.skillSlug,
      importance: cs.importance,
      requiredLevel: cs.requiredLevel,
    }));

    try {
      await adminService.updateCareerSkills(selectedCareerSlug, payload);
      toast.success('Career requirements updated successfully');
      refreshCareerSkills(selectedCareerSlug);
    } catch (err) {
      if (err.status === 422 || err.code === 'RULE_VIOLATION') {
        const details = err.details || [
          { message: err.message || 'Prerequisite closure violated' },
        ];
        setClosureErrorDetails(details);
      }
      toast.error(err.message || 'Save failed: closure validation error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMissingPrerequisites = () => {
    if (!closureErrorDetails) return;

    // Extract unique missing slugs
    const missingSlugs = [
      ...new Set(
        closureErrorDetails
          .map((d) => d.missingSkillSlug || d.missingSkill || d.slug)
          .filter(Boolean),
      ),
    ];

    if (missingSlugs.length > 0) {
      setCareerSkills((prev) => {
        const toAppend = missingSlugs
          .filter((slug) => !prev.some((cs) => cs.skillSlug === slug))
          .map((slug) => {
            const meta = allSkills.find((s) => s.slug === slug);
            return {
              skillSlug: slug,
              name: meta ? meta.name : slug,
              category: meta ? meta.category : 'general',
              importance: 0.7,
              requiredLevel: 2,
            };
          });
        return toAppend.length > 0 ? [...prev, ...toAppend] : prev;
      });
    }

    setClosureErrorDetails(null);
    toast.info('Appended missing prerequisite skills with defaults. Review and save.');
  };

  const selectedCareer = careers.find((c) => c.slug === selectedCareerSlug);
  const unassignedSkills = allSkills.filter(
    (s) => !careerSkills.some((cs) => cs.skillSlug === s.slug),
  );

  return (
    <div className="space-y-6">
      {/* 422 Closure Error Alert with Add Missing Prerequisites Button */}
      {closureErrorDetails && (
        <div
          role="alert"
          className="border-2 border-ink bg-state-missing/15 p-5 shadow-card animate-in fade-in space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-state-missing shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h2 className="font-display font-black text-sm uppercase text-ink">
                PREREQUISITE CLOSURE VIOLATION (422 RULE VIOLATION)
              </h2>
              <p className="text-xs font-mono text-ink-muted mt-0.5">
                For every skill required by a career, all of its direct prerequisites must also be required by the career.
              </p>

              <ul className="mt-2 space-y-1 bg-surface border border-ink p-2 text-xs font-sans">
                {closureErrorDetails.map((detail, idx) => (
                  <li key={idx} className="text-ink flex items-center gap-1.5">
                    <span className="text-state-missing font-bold">•</span>
                    {detail.message || `Missing prerequisite: ${detail.missingSkillSlug || detail.slug}`}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleAddMissingPrerequisites}
              className="border-2 border-ink bg-brand text-white px-4 py-2 font-display font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-button hover:bg-brand-dark cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            >
              <Sparkles size={16} />
              ADD MISSING PREREQUISITES
            </button>
          </div>
        </div>
      )}

      {/* Top Career Picker & Actions */}
      <Card variant="default" className="p-4 bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border-2 border-ink bg-brand text-white flex items-center justify-center font-display font-black text-sm shadow-button">
              <Briefcase size={18} />
            </div>
            <div>
              <label htmlFor="career-select" className="font-display font-black text-xs uppercase tracking-wider text-ink-muted">
                SELECT CAREER MODEL
              </label>
              <h2 className="font-display font-black text-base text-ink">
                {selectedCareer?.name || 'Pick a Career'}
              </h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              id="career-select"
              value={selectedCareerSlug}
              onChange={(e) => setSelectedCareerSlug(e.target.value)}
              className="border-2 border-ink bg-paper px-3 py-2 text-sm font-bold shadow-button"
              aria-label="Select career to edit"
            >
              {careers.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center justify-center gap-1.5"
            >
              <Check size={16} />
              {isSaving ? 'SAVING...' : 'SAVE CAREER SKILLS'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Career Skills Table and Add Skill Section */}
      <Card variant="default" className="p-0 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b-2 border-ink bg-surface flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-black text-xs uppercase tracking-wider text-ink">
              REQUIRED SKILLS ({careerSkills.length})
            </h3>
          </div>

          {/* Quick Add Skill Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={skillToAdd}
              onChange={(e) => setSkillToAdd(e.target.value)}
              className="border border-ink bg-paper px-2 py-1.5 text-xs font-bold shadow-button"
              aria-label="Select skill to add"
            >
              <option value="">+ Add another skill...</option>
              {unassignedSkills.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={handleAddSkill}
              disabled={!skillToAdd}
              className="py-1 px-2.5 text-xs flex items-center gap-1"
            >
              <Plus size={14} />
              ADD
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="rectangular" height={40} />
          </div>
        ) : careerSkills.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display font-bold text-ink-muted">NO SKILLS ASSIGNED TO THIS CAREER YET</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Career skills table">
              <thead>
                <tr className="border-b-2 border-ink bg-surface/50 font-display font-black text-xs uppercase tracking-wider text-ink">
                  <th className="p-3 pl-4">SKILL</th>
                  <th className="p-3">IMPORTANCE (0.0 - 1.0)</th>
                  <th className="p-3">REQUIRED LEVEL (1 - 5)</th>
                  <th className="p-3 pr-4 text-right">REMOVE</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink font-sans text-sm">
                {careerSkills.map((cs) => (
                  <tr key={cs.skillSlug} className="hover:bg-surface/50 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="font-bold text-ink">{cs.name}</div>
                      <div className="font-mono text-xs text-ink-muted">
                        {cs.skillSlug} • <span className="uppercase">{cs.category}</span>
                      </div>
                    </td>

                    {/* Importance Slider */}
                    <td className="p-3 w-72">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={cs.importance}
                          onChange={(e) => handleImportanceChange(cs.skillSlug, e.target.value)}
                          className="w-36 accent-brand"
                          aria-label={`Importance for ${cs.name}`}
                        />
                        <span className="font-mono text-xs font-bold w-10 text-right">
                          {Number(cs.importance).toFixed(2)}
                        </span>
                        <span className="border border-ink bg-surface px-1.5 py-0.5 text-xs font-mono font-bold uppercase">
                          {getImportanceLabel(cs.importance)}
                        </span>
                      </div>
                    </td>

                    {/* Required Level Picker */}
                    <td className="p-3 w-48">
                      <select
                        value={cs.requiredLevel}
                        onChange={(e) => handleLevelChange(cs.skillSlug, e.target.value)}
                        className="border border-ink bg-paper px-2 py-1 text-xs font-bold shadow-button"
                        aria-label={`Required level for ${cs.name}`}
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            Level {lvl} ({lvl === 1 ? 'Beginner' : lvl === 2 ? 'Basic' : lvl === 3 ? 'Intermediate' : lvl === 4 ? 'Advanced' : 'Expert'})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Remove Action */}
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() => handleRemoveSkill(cs.skillSlug)}
                        className="p-1.5 border border-ink bg-surface hover:bg-state-missing hover:text-white transition-colors shadow-button"
                        aria-label={`Remove ${cs.name} from career`}
                        title="Remove from career"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Careers;
