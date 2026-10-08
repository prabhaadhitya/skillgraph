import { useState, useRef, useEffect } from 'react';
import { GitCompare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../components/ui/Toast.jsx';
import Tag from '../../components/ui/Tag.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

import {
  useCareers,
  useCareerFits,
  useCareerCompare,
  useWhatIfMutation,
  useSetTargetCareer,
} from '../../hooks/useCareerExplorer.js';

import CareerCard from './CareerCard.jsx';
import CareerCompareView from './CareerCompareView.jsx';
import WhatIfModal from './WhatIfModal.jsx';
import ConfirmTargetDialog from './ConfirmTargetDialog.jsx';

/**
 * Career Explorer page (/app/careers).
 * Allows students to inspect careers, evaluate alignment, run what-if simulations,
 * compare two careers side-by-side, and switch target careers.
 */
export function CareerExplorer() {
  useEffect(() => {
    document.title = 'SkillGraph — Career Explorer';
  }, []);

  const { user } = useAuth();
  const { toast } = useToast();
  const compareRef = useRef(null);

  // 1. Data queries
  const { data: careers = [], isLoading: isLoadingCareers, isError: isErrorCareers, refetch: refetchCareers } = useCareers();
  const { fitsMap, isLoading: isLoadingFits } = useCareerFits(careers);

  // 2. Comparison selection (up to 2 careers)
  const [selectedSlugs, setSelectedSlugs] = useState([]);
  const hasTwoSelected = selectedSlugs.length === 2;
  const compareQuery = useCareerCompare(
    hasTwoSelected ? selectedSlugs[0] : null,
    hasTwoSelected ? selectedSlugs[1] : null,
  );

  // 3. What-If Modal state & mutation
  const [whatIfCareer, setWhatIfCareer] = useState(null);
  const whatIfMutation = useWhatIfMutation();

  // 4. Target career confirmation dialog state & mutation
  const [targetToConfirm, setTargetToConfirm] = useState(null);
  const setTargetMutation = useSetTargetCareer();

  // Handlers
  const handleToggleCompare = (slug) => {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= 2) {
        // Replace second selection
        return [prev[0], slug];
      }
      const next = [...prev, slug];
      if (next.length === 2) {
        setTimeout(() => {
          compareRef.current?.scrollIntoView?.({ behavior: 'smooth' });
        }, 100);
      }
      return next;
    });
  };

  const handleClearCompare = () => {
    setSelectedSlugs([]);
  };

  const handleOpenWhatIf = (career) => {
    setWhatIfCareer(career);
    whatIfMutation.mutate(career.slug);
  };

  const handleCloseWhatIf = () => {
    setWhatIfCareer(null);
    whatIfMutation.reset();
  };

  const handleConfirmTarget = async () => {
    if (!targetToConfirm) return;
    try {
      await setTargetMutation.mutateAsync(targetToConfirm.slug);
      toast.success(`Target career set to ${targetToConfirm.name}`);
      setTargetToConfirm(null);
    } catch (err) {
      toast.error(err?.message || 'Failed to update target career');
    }
  };

  // Loading state
  if (isLoadingCareers) {
    return (
      <div className="p-4 md:p-8 font-sans max-w-7xl mx-auto flex flex-col gap-6">
        <header className="bg-surface border-2 border-ink shadow-sm p-4 flex items-center justify-between">
          <Skeleton variant="text" className="w-56 h-8" />
          <Skeleton variant="text" className="w-32 h-6" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton variant="card" className="h-80" />
          <Skeleton variant="card" className="h-80" />
          <Skeleton variant="card" className="h-80" />
          <Skeleton variant="card" className="h-80" />
          <Skeleton variant="card" className="h-80" />
        </div>
      </div>
    );
  }

  // Error state
  if (isErrorCareers) {
    return (
      <div className="p-4 md:p-8 font-sans max-w-4xl mx-auto">
        <ErrorState
          title="FAILED TO LOAD CAREER TRACKS"
          message="Could not retrieve career paths from the catalog."
          onRetry={refetchCareers}
          retryLabel="RELOAD CATALOG"
        />
      </div>
    );
  }

  // Empty state
  if (careers.length === 0) {
    return (
      <div className="p-4 md:p-8 font-sans max-w-4xl mx-auto">
        <EmptyState
          title="NO CAREERS AVAILABLE"
          text="The curriculum catalog currently contains no active career tracks."
        />
      </div>
    );
  }

  const currentTargetSlug = user?.targetCareer?.slug;

  return (
    <div className="p-4 md:p-8 font-sans max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <header className="bg-surface border-2 border-ink shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Tag tone="brand">CURRICULUM</Tag>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-ink uppercase tracking-tight">
              CAREER EXPLORER
            </h1>
          </div>
          <p className="font-mono text-xs text-muted">
            Inspect all pathways, compare alignments, and test what-if scenarios
          </p>
        </div>

        {/* Comparison status widget */}
        <div className="flex items-center gap-2">
          {selectedSlugs.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-paper border-2 border-ink shadow-2xs font-mono text-xs">
              <GitCompare size={14} className="text-brand" />
              <span>
                {selectedSlugs.length}/2 selected
              </span>
              <button
                type="button"
                onClick={handleClearCompare}
                className="text-xs text-muted hover:text-ink underline ml-1 font-bold"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Comparison Drawer / Section if 2 careers selected */}
      {hasTwoSelected && (
        <div ref={compareRef}>
          <CareerCompareView
            compareData={compareQuery.data}
            isLoading={compareQuery.isLoading}
            isError={compareQuery.isError}
            onClear={handleClearCompare}
          />
        </div>
      )}

      {/* Career Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {careers.map((career) => (
          <CareerCard
            key={career.slug}
            career={career}
            fit={fitsMap[career.slug]}
            isLoadingFit={isLoadingFits}
            isCurrentTarget={career.slug === currentTargetSlug}
            isSelectedForCompare={selectedSlugs.includes(career.slug)}
            onToggleCompare={() => handleToggleCompare(career.slug)}
            onWhatIf={() => handleOpenWhatIf(career)}
            onSetTarget={() => setTargetToConfirm(career)}
          />
        ))}
      </div>

      {/* What-If Modal */}
      <WhatIfModal
        isOpen={Boolean(whatIfCareer)}
        onClose={handleCloseWhatIf}
        data={whatIfMutation.data}
        isLoading={whatIfMutation.isPending}
        onSetAsTarget={() => {
          if (whatIfCareer) {
            setTargetToConfirm(whatIfCareer);
          }
        }}
      />

      {/* Confirm Target Dialog */}
      <ConfirmTargetDialog
        isOpen={Boolean(targetToConfirm)}
        onClose={() => setTargetToConfirm(null)}
        career={targetToConfirm}
        onConfirm={handleConfirmTarget}
        isPending={setTargetMutation.isPending}
      />
    </div>
  );
}

export default CareerExplorer;
