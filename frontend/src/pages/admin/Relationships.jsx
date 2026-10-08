import { useState, useEffect, useMemo } from 'react';
import { GitFork, ArrowRight, Link as LinkIcon, Trash2, AlertTriangle, Plus, X } from 'lucide-react';
import { getSkills } from '../../services/catalogService.js';
import * as adminService from '../../services/adminService.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export function Relationships() {
  const { toast } = useToast();
  const [skills, setSkills] = useState([]);
  const [selectedSkillSlug, setSelectedSkillSlug] = useState('');
  const [relationships, setRelationships] = useState([]);

  // Form state
  const [sourceSlug, setSourceSlug] = useState('');
  const [targetSlug, setTargetSlug] = useState('');
  const [relType, setRelType] = useState('PREREQUISITE');
  const [strength, setStrength] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cycleError, setCycleError] = useState(null);

  useEffect(() => {
    let ignore = false;
    getSkills()
      .then((data) => {
        if (!ignore) {
          setSkills(data);
          if (data.length > 0 && !selectedSkillSlug) {
            setSelectedSkillSlug(data[0].slug);
            setSourceSlug(data[0].slug);
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          toast.error(err.message || 'Failed to load skills');
        }
      });

    return () => {
      ignore = true;
    };
  }, [toast, selectedSkillSlug]);

  useEffect(() => {
    let ignore = false;
    if (selectedSkillSlug) {
      adminService
        .getRelationships(selectedSkillSlug)
        .then((res) => {
          if (!ignore) {
            setRelationships(res.items || []);
          }
        })
        .catch((err) => {
          if (!ignore) {
            toast.error(err.message || 'Failed to load relationships');
          }
        });
    }

    return () => {
      ignore = true;
    };
  }, [selectedSkillSlug, toast]);

  const refreshRelationships = async (slug) => {
    if (!slug) return;
    try {
      const res = await adminService.getRelationships(slug);
      setRelationships(res.items || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load relationships');
    }
  };

  const { prerequisites, unlocks, related } = useMemo(() => {
    const prereqs = [];
    const unlcks = [];
    const rel = [];

    for (const r of relationships) {
      const srcSlug = r.source?.slug || r.source;
      const tgtSlug = r.target?.slug || r.target;

      if (r.type === 'RELATED_TO') {
        const other = srcSlug === selectedSkillSlug ? r.target : r.source;
        rel.push({ ...r, otherSkill: other });
      } else if (tgtSlug === selectedSkillSlug) {
        prereqs.push({ ...r, prereqSkill: r.source });
      } else if (srcSlug === selectedSkillSlug) {
        unlcks.push({ ...r, dependentSkill: r.target });
      }
    }

    return { prerequisites: prereqs, unlocks: unlcks, related: rel };
  }, [relationships, selectedSkillSlug]);

  const handleCreateRelationship = async (e) => {
    e.preventDefault();
    setCycleError(null);
    setIsSubmitting(true);

    try {
      await adminService.createRelationship({
        source: sourceSlug,
        target: targetSlug,
        type: relType,
        strength: Number(strength),
      });

      toast.success('Relationship added successfully');
      refreshRelationships(selectedSkillSlug);
    } catch (err) {
      // 422 cycle or loop error message
      if (err.status === 422 || err.code === 'RULE_VIOLATION') {
        setCycleError(err.message || 'That would create a loop in the prerequisite graph.');
      }
      toast.error(err.message || 'Failed to create relationship');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRelationship = async (relId) => {
    if (!window.confirm('Are you sure you want to delete this relationship edge?')) {
      return;
    }
    setCycleError(null);

    try {
      await adminService.deleteRelationship(relId);
      toast.success('Relationship deleted');
      setRelationships((prev) => prev.filter((r) => r.id !== relId));
    } catch (err) {
      toast.error(err.message || 'Failed to delete relationship');
    }
  };

  const selectedSkill = skills.find((s) => s.slug === selectedSkillSlug);

  return (
    <div className="space-y-6">
      {/* Cycle / Loop Warning Alert */}
      {cycleError && (
        <div
          role="alert"
          className="border-2 border-ink bg-state-missing/15 p-4 shadow-card flex items-start justify-between gap-4 animate-in fade-in"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-state-missing shrink-0 mt-0.5" size={20} />
            <div>
              <h2 className="font-display font-black text-sm uppercase text-ink">
                CYCLE DETECTED (422 RULE VIOLATION)
              </h2>
              <p className="text-sm font-sans font-bold text-ink mt-1 bg-surface border border-ink p-2">
                {cycleError}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCycleError(null)}
            className="text-ink hover:text-state-missing p-1"
            aria-label="Dismiss cycle error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Skill Picker */}
      <Card variant="default" className="p-4 bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border-2 border-ink bg-brand text-white flex items-center justify-center font-display font-black text-sm shadow-button">
              <GitFork size={18} />
            </div>
            <div>
              <label htmlFor="skill-picker" className="font-display font-black text-xs uppercase tracking-wider text-ink-muted">
                SELECT FOCAL SKILL
              </label>
              <h2 className="font-display font-black text-base text-ink">
                {selectedSkill?.name || 'Pick a Skill'}
              </h2>
            </div>
          </div>

          <div className="w-full sm:w-72">
            <select
              id="skill-picker"
              value={selectedSkillSlug}
              onChange={(e) => {
                setSelectedSkillSlug(e.target.value);
                setSourceSlug(e.target.value);
              }}
              className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm font-bold shadow-button"
              aria-label="Select focal skill"
            >
              {skills.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name} ({s.slug})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Main Grid: Edge Lists (Left) and Add Edge Form (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Prerequisites, Unlocks, Related */}
        <div className="lg:col-span-2 space-y-4">
          {/* 1. PREREQUISITES */}
          <Card variant="default" className="p-4">
            <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-state-partial border border-ink rounded-full" />
                <h3 className="font-display font-black text-xs uppercase tracking-wider">
                  PREREQUISITES (Must learn BEFORE {selectedSkill?.name})
                </h3>
              </div>
              <span className="font-mono text-xs font-bold bg-surface border border-ink px-2 py-0.5">
                {prerequisites.length}
              </span>
            </div>

            {prerequisites.length === 0 ? (
              <p className="text-xs text-ink-muted font-mono py-2">No prerequisites defined.</p>
            ) : (
              <ul className="divide-y divide-ink/20">
                {prerequisites.map((p) => (
                  <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">{p.prereqSkill?.name}</span>
                      <span className="font-mono text-xs text-ink-muted">({p.prereqSkill?.slug})</span>
                      <ArrowRight size={14} className="text-ink-muted" />
                      <span className="text-xs font-bold text-ink-muted">{selectedSkill?.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteRelationship(p.id)}
                      className="text-ink hover:text-state-missing p-1 border border-ink hover:bg-surface"
                      aria-label={`Delete prerequisite ${p.prereqSkill?.name}`}
                      title="Delete edge"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 2. UNLOCKS */}
          <Card variant="default" className="p-4">
            <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-state-mastered border border-ink rounded-full" />
                <h3 className="font-display font-black text-xs uppercase tracking-wider">
                  UNLOCKS (Dependents enabled by {selectedSkill?.name})
                </h3>
              </div>
              <span className="font-mono text-xs font-bold bg-surface border border-ink px-2 py-0.5">
                {unlocks.length}
              </span>
            </div>

            {unlocks.length === 0 ? (
              <p className="text-xs text-ink-muted font-mono py-2">No dependent skills unlocked.</p>
            ) : (
              <ul className="divide-y divide-ink/20">
                {unlocks.map((u) => (
                  <li key={u.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-muted">{selectedSkill?.name}</span>
                      <ArrowRight size={14} className="text-ink-muted" />
                      <span className="font-bold text-sm text-ink">{u.dependentSkill?.name}</span>
                      <span className="font-mono text-xs text-ink-muted">({u.dependentSkill?.slug})</span>
                    </div>
                    <button
                      onClick={() => handleDeleteRelationship(u.id)}
                      className="text-ink hover:text-state-missing p-1 border border-ink hover:bg-surface"
                      aria-label={`Delete unlock edge to ${u.dependentSkill?.name}`}
                      title="Delete edge"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 3. RELATED */}
          <Card variant="default" className="p-4">
            <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-brand border border-ink rounded-full" />
                <h3 className="font-display font-black text-xs uppercase tracking-wider">
                  RELATED TO (Undirected connections)
                </h3>
              </div>
              <span className="font-mono text-xs font-bold bg-surface border border-ink px-2 py-0.5">
                {related.length}
              </span>
            </div>

            {related.length === 0 ? (
              <p className="text-xs text-ink-muted font-mono py-2">No related skills defined.</p>
            ) : (
              <ul className="divide-y divide-ink/20">
                {related.map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <LinkIcon size={14} className="text-brand shrink-0" />
                      <span className="font-bold text-sm text-ink">{r.otherSkill?.name}</span>
                      <span className="font-mono text-xs text-ink-muted">({r.otherSkill?.slug})</span>
                    </div>
                    <button
                      onClick={() => handleDeleteRelationship(r.id)}
                      className="text-ink hover:text-state-missing p-1 border border-ink hover:bg-surface"
                      aria-label={`Delete related edge to ${r.otherSkill?.name}`}
                      title="Delete edge"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right Column (1 Col): Add Relationship Edge Form */}
        <div className="space-y-4">
          <Card variant="default" className="p-5 border-2 border-ink bg-surface shadow-card">
            <div className="flex items-center gap-2 border-b-2 border-ink pb-2 mb-4">
              <Plus size={18} className="text-brand" />
              <h3 className="font-display font-black text-sm uppercase tracking-wider text-ink">
                ADD RELATIONSHIP EDGE
              </h3>
            </div>

            <form onSubmit={handleCreateRelationship} className="space-y-4">
              <div>
                <label className="block font-display font-black text-xs uppercase mb-1">
                  SOURCE SKILL <span className="text-state-missing">*</span>
                </label>
                <select
                  value={sourceSlug}
                  onChange={(e) => setSourceSlug(e.target.value)}
                  className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm font-bold shadow-button"
                  required
                >
                  <option value="">Select source...</option>
                  {skills.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-muted font-mono mt-0.5">
                  For PREREQUISITE: Learned FIRST
                </p>
              </div>

              <div>
                <label className="block font-display font-black text-xs uppercase mb-1">
                  TARGET SKILL <span className="text-state-missing">*</span>
                </label>
                <select
                  value={targetSlug}
                  onChange={(e) => setTargetSlug(e.target.value)}
                  className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm font-bold shadow-button"
                  required
                >
                  <option value="">Select target...</option>
                  {skills.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-muted font-mono mt-0.5">
                  For PREREQUISITE: Enabled AFTER source
                </p>
              </div>

              <div>
                <label className="block font-display font-black text-xs uppercase mb-1">
                  RELATIONSHIP TYPE <span className="text-state-missing">*</span>
                </label>
                <select
                  value={relType}
                  onChange={(e) => setRelType(e.target.value)}
                  className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm font-bold shadow-button"
                >
                  <option value="PREREQUISITE">PREREQUISITE (Strict prerequisite)</option>
                  <option value="RELATED_TO">RELATED_TO (Mutual connection)</option>
                </select>
              </div>

              <div>
                <label className="block font-display font-black text-xs uppercase mb-1">
                  STRENGTH ({strength})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                  className="w-full accent-brand"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !sourceSlug || !targetSlug}
                className="w-full"
              >
                {isSubmitting ? 'SAVING EDGE...' : 'ADD RELATIONSHIP'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Relationships;
