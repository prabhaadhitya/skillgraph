import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, AlertTriangle, X, Check } from 'lucide-react';
import { getSkills } from '../../services/catalogService.js';
import * as adminService from '../../services/adminService.js';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

const CATEGORIES = [
  { slug: 'programming', name: 'Programming' },
  { slug: 'web-development', name: 'Web Development' },
  { slug: 'backend', name: 'Backend' },
  { slug: 'frontend', name: 'Frontend' },
  { slug: 'database', name: 'Database' },
  { slug: 'data-analytics', name: 'Data Analytics' },
  { slug: 'machine-learning', name: 'Machine Learning' },
  { slug: 'deep-learning', name: 'Deep Learning' },
  { slug: 'ai-llm', name: 'AI & LLM' },
  { slug: 'cloud', name: 'Cloud' },
  { slug: 'devops', name: 'DevOps' },
  { slug: 'cybersecurity', name: 'Cybersecurity' },
  { slug: 'tools', name: 'Tools' },
];

export function Skills() {
  const { toast } = useToast();
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [conflictError, setConflictError] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    slug: '',
    category: 'programming',
    difficulty: 2,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const data = await getSkills();
        setSkills(data);
      } catch (err) {
        toast.error(err.message || 'Failed to load skills');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [toast]);

  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchesCategory = selectedCategory ? s.category === selectedCategory : true;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [skills, selectedCategory, searchQuery]);

  const openAddModal = () => {
    setFormState({
      name: '',
      slug: '',
      category: 'programming',
      difficulty: 2,
      description: '',
    });
    setIsEditing(false);
    setIsModalOpen(true);
    setConflictError(null);
  };

  const openEditModal = (skill) => {
    setFormState({
      name: skill.name,
      slug: skill.slug,
      category: skill.category || 'programming',
      difficulty: skill.difficulty || 2,
      description: skill.description || '',
    });
    setIsEditing(true);
    setIsModalOpen(true);
    setConflictError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormState((prev) => ({
      ...prev,
      name: val,
      // Auto-generate slug when creating a new skill
      slug: !isEditing
        ? val
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        : prev.slug,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setConflictError(null);

    try {
      if (isEditing) {
        const res = await adminService.updateSkill(formState.slug, {
          name: formState.name,
          category: formState.category,
          difficulty: Number(formState.difficulty),
          description: formState.description,
        });
        const updated = res.skill || { ...formState, difficulty: Number(formState.difficulty) };
        setSkills((prev) => prev.map((s) => (s.slug === formState.slug ? updated : s)));
        toast.success(`Skill '${updated.name}' updated successfully`);
      } else {
        const res = await adminService.createSkill({
          name: formState.name,
          slug: formState.slug,
          category: formState.category,
          difficulty: Number(formState.difficulty),
          description: formState.description,
        });
        const created = res.skill || { ...formState, difficulty: Number(formState.difficulty) };
        setSkills((prev) => [created, ...prev]);
        toast.success(`Skill '${created.name}' created successfully`);
      }
      closeModal();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (skill) => {
    if (!window.confirm(`Are you sure you want to delete '${skill.name}' (${skill.slug})?`)) {
      return;
    }
    setConflictError(null);

    try {
      await adminService.deleteSkill(skill.slug);
      setSkills((prev) => prev.filter((s) => s.slug !== skill.slug));
      toast.success(`Skill '${skill.name}' deleted`);
    } catch (err) {
      // 409 conflict: display prominently
      setConflictError(err.message || `Cannot delete skill '${skill.name}': it is referenced.`);
      toast.error(err.message || 'Delete blocked by reference check');
    }
  };

  return (
    <div className="space-y-6">
      {/* 409 Conflict Alert Notice */}
      {conflictError && (
        <div
          role="alert"
          className="border-2 border-ink bg-state-missing/10 p-4 shadow-card flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-state-missing shrink-0 mt-0.5" size={20} />
            <div>
              <h2 className="font-display font-black text-sm uppercase text-ink">
                CANNOT DELETE SKILL (409 CONFLICT)
              </h2>
              <p className="text-sm font-sans text-ink mt-0.5">{conflictError}</p>
            </div>
          </div>
          <button
            onClick={() => setConflictError(null)}
            className="text-ink hover:text-state-missing p-1"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search skills by name, slug, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search skills"
            />
            <Search size={16} className="absolute left-3 top-3 text-ink-muted" />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border-2 border-ink bg-surface px-3 py-2 text-sm font-bold shadow-button"
            aria-label="Filter by category"
          >
            <option value="">ALL CATEGORIES ({skills.length})</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Button variant="primary" onClick={openAddModal} className="shrink-0 flex items-center gap-2">
          <Plus size={16} />
          ADD SKILL
        </Button>
      </div>

      {/* Skills Table */}
      <Card variant="default" className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="rectangular" height={40} />
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display font-bold text-ink-muted text-base">NO SKILLS MATCH YOUR FILTER</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Skills catalog table">
              <thead>
                <tr className="border-b-2 border-ink bg-surface font-display font-black text-xs uppercase tracking-wider text-ink">
                  <th className="p-3 pl-4">SKILL NAME</th>
                  <th className="p-3">SLUG</th>
                  <th className="p-3">CATEGORY</th>
                  <th className="p-3">DIFFICULTY</th>
                  <th className="p-3">DESCRIPTION</th>
                  <th className="p-3 pr-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink font-sans text-sm">
                {filteredSkills.map((s) => (
                  <tr key={s.slug} className="hover:bg-surface/50 transition-colors">
                    <td className="p-3 pl-4 font-bold text-ink">{s.name}</td>
                    <td className="p-3 font-mono text-xs text-ink-muted">{s.slug}</td>
                    <td className="p-3">
                      <span className="inline-block border border-ink bg-surface px-2 py-0.5 text-xs font-mono font-bold uppercase shadow-badge">
                        {s.category}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs font-bold">
                      <span className="inline-flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <span
                            key={lvl}
                            className={`w-2.5 h-2.5 border border-ink rounded-full ${
                              lvl <= (s.difficulty || 1) ? 'bg-brand' : 'bg-surface'
                            }`}
                          />
                        ))}
                        <span className="ml-1">L{s.difficulty || 1}</span>
                      </span>
                    </td>
                    <td className="p-3 text-xs text-ink-muted max-w-xs truncate" title={s.description}>
                      {s.description || '—'}
                    </td>
                    <td className="p-3 pr-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(s)}
                          className="border border-ink bg-surface p-1.5 hover:bg-brand hover:text-white transition-colors shadow-button"
                          aria-label={`Edit ${s.name}`}
                          title="Edit Skill"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="border border-ink bg-surface p-1.5 hover:bg-state-missing hover:text-white transition-colors shadow-button"
                          aria-label={`Delete ${s.name}`}
                          title="Delete Skill"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Skill Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="border-2 border-ink bg-paper p-6 max-w-lg w-full shadow-modal animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b-2 border-ink pb-3 mb-4">
              <h2 className="font-display font-black text-lg uppercase tracking-tight">
                {isEditing ? `EDIT SKILL: ${formState.name}` : 'ADD NEW SKILL'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-surface border border-ink" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-display font-black text-xs uppercase mb-1">
                  SKILL NAME <span className="text-state-missing">*</span>
                </label>
                <Input
                  type="text"
                  required
                  value={formState.name}
                  onChange={handleNameChange}
                  placeholder="e.g. FastAPI"
                />
              </div>

              <div>
                <label className="block font-display font-black text-xs uppercase mb-1">
                  SLUG (IMMUTABLE) <span className="text-state-missing">*</span>
                </label>
                <Input
                  type="text"
                  required
                  disabled={isEditing}
                  value={formState.slug}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().trim(),
                    }))
                  }
                  placeholder="e.g. fastapi"
                  className={isEditing ? 'opacity-60 cursor-not-allowed bg-surface' : ''}
                />
                {isEditing && (
                  <p className="text-xs text-ink-muted font-mono mt-1">Slugs are immutable once created.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-display font-black text-xs uppercase mb-1">
                    CATEGORY <span className="text-state-missing">*</span>
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) => setFormState((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm font-bold shadow-button"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-display font-black text-xs uppercase mb-1">
                    DIFFICULTY (1-5) <span className="text-state-missing">*</span>
                  </label>
                  <select
                    value={formState.difficulty}
                    onChange={(e) => setFormState((prev) => ({ ...prev, difficulty: Number(e.target.value) }))}
                    className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm font-bold shadow-button"
                  >
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Level {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-display font-black text-xs uppercase mb-1">
                  DESCRIPTION (MAX 300 CHARS)
                </label>
                <textarea
                  value={formState.description}
                  onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                  maxLength={300}
                  rows={3}
                  className="w-full border-2 border-ink bg-surface p-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand shadow-button"
                  placeholder="Short 1-2 sentence description..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-ink">
                <Button type="button" variant="outline" onClick={closeModal}>
                  CANCEL
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  <Check size={16} className="mr-1 inline" />
                  {isSubmitting ? 'SAVING...' : isEditing ? 'UPDATE SKILL' : 'CREATE SKILL'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Skills;
