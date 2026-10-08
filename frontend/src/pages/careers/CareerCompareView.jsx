import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import Tag from '../../components/ui/Tag.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';

/**
 * Three-column Career Comparison view: Only A / In both / Only B.
 *
 * @param {Object} props
 * @param {Object} props.compareData - Comparison payload { a, b, common, uniqueToA, uniqueToB }
 * @param {boolean} props.isLoading - Whether query is loading
 * @param {boolean} props.isError - Whether query errored
 * @param {() => void} props.onClear - Clear comparison selection
 */
export function CareerCompareView({
  compareData,
  isLoading = false,
  isError = false,
  onClear,
}) {
  if (isLoading) {
    return (
      <div className="p-6 bg-surface border-2 border-ink shadow-md flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="w-64 h-8" />
          <Skeleton variant="text" className="w-24 h-8" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton variant="card" className="h-64" />
          <Skeleton variant="card" className="h-64" />
          <Skeleton variant="card" className="h-64" />
        </div>
      </div>
    );
  }

  if (isError || !compareData) {
    return (
      <div className="p-6 bg-surface border-2 border-ink shadow-md">
        <ErrorState
          title="COMPARISON FAILED"
          message="Could not compare the selected careers. Please try again."
          onRetry={onClear}
          retryLabel="CLEAR SELECTION"
        />
      </div>
    );
  }

  const { a, b, common = [], uniqueToA = [], uniqueToB = [] } = compareData;

  return (
    <div className="p-6 bg-paper border-2 border-ink shadow-md flex flex-col gap-6 my-6">
      {/* Comparison Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-line pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Tag tone="brand">SIDE-BY-SIDE ANALYSIS</Tag>
            <span className="font-mono text-xs text-muted uppercase">
              {common.length} SHARED SKILLS · {uniqueToA.length + uniqueToB.length} UNIQUE SKILLS
            </span>
          </div>
          <h2 className="font-display font-black text-2xl text-ink uppercase tracking-tight">
            CAREER COMPARISON
          </h2>
        </div>

        <Button variant="secondary" size="sm" onClick={onClear}>
          <X size={14} className="mr-1" />
          CLEAR COMPARISON
        </Button>
      </div>

      {/* Head-to-Head Alignment Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Career A Header */}
        <div className="p-4 bg-surface border-2 border-ink shadow-sm flex items-center justify-between">
          <div>
            <div className="font-mono text-xs text-muted uppercase font-bold tracking-wider">
              TRACK A
            </div>
            <h3 className="font-display font-black text-lg text-ink uppercase">
              {a.career?.name}
            </h3>
            <div className="font-mono text-xs text-muted mt-1">
              Path: {a.pathSteps ?? 0} steps · {a.effortPoints ?? 0} effort pts
            </div>
          </div>
          <div className="text-right">
            <span className="font-display font-black text-3xl text-brand">
              {a.fitScore}%
            </span>
            <div className="font-mono text-xs uppercase text-muted">ALIGNMENT</div>
          </div>
        </div>

        {/* Career B Header */}
        <div className="p-4 bg-surface border-2 border-ink shadow-sm flex items-center justify-between">
          <div>
            <div className="font-mono text-xs text-muted uppercase font-bold tracking-wider">
              TRACK B
            </div>
            <h3 className="font-display font-black text-lg text-ink uppercase">
              {b.career?.name}
            </h3>
            <div className="font-mono text-xs text-muted mt-1">
              Path: {b.pathSteps ?? 0} steps · {b.effortPoints ?? 0} effort pts
            </div>
          </div>
          <div className="text-right">
            <span className="font-display font-black text-3xl text-brand">
              {b.fitScore}%
            </span>
            <div className="font-mono text-xs uppercase text-muted">ALIGNMENT</div>
          </div>
        </div>
      </div>

      {/* Three Columns: Only A · In Both · Only B */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Only A */}
        <div className="flex flex-col gap-3">
          <div className="p-2.5 bg-surface border-2 border-ink shadow-2xs flex items-center justify-between">
            <span className="font-display font-black text-xs uppercase text-ink tracking-wider">
              ONLY IN {a.career?.name}
            </span>
            <Badge tone="neutral">{uniqueToA.length}</Badge>
          </div>

          <div className="flex flex-col gap-2.5">
            {uniqueToA.length === 0 ? (
              <p className="font-mono text-xs text-muted p-4 text-center border-2 border-dashed border-line">
                No unique skills required.
              </p>
            ) : (
              uniqueToA.map((item, idx) => (
                <div
                  key={item.skill?.slug || idx}
                  className="p-3 bg-surface border-2 border-ink shadow-2xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-xs uppercase text-ink">
                      {item.skill?.name}
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      Req Lvl {item.requiredLevel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted">Importance:</span>
                    <ProgressBar
                      value={Math.round((item.importance || 0) * 100)}
                      max={100}
                      tone="brand"
                      className="h-1.5 flex-1"
                    />
                    <span className="font-mono text-[11px] font-bold">
                      {Math.round((item.importance || 0) * 100)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: In Both */}
        <div className="flex flex-col gap-3">
          <div className="p-2.5 bg-surface border-2 border-ink shadow-2xs flex items-center justify-between">
            <span className="font-display font-black text-xs uppercase text-brand tracking-wider flex items-center gap-1">
              <Sparkles size={14} />
              IN BOTH TRACKS
            </span>
            <Badge tone="brand">{common.length}</Badge>
          </div>

          <div className="flex flex-col gap-2.5">
            {common.length === 0 ? (
              <p className="font-mono text-xs text-muted p-4 text-center border-2 border-dashed border-line">
                No overlapping skills.
              </p>
            ) : (
              common.map((item, idx) => (
                <div
                  key={item.skill?.slug || idx}
                  className="p-3 bg-surface border-2 border-ink shadow-2xs flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-xs uppercase text-ink">
                      {item.skill?.name}
                    </span>
                    <CheckCircle2 size={14} className="text-brand" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-line pt-1.5">
                    <div>
                      <div className="text-muted truncate">{a.career?.name}:</div>
                      <div className="font-bold">
                        Lvl {item.a?.requiredLevel} ({Math.round((item.a?.importance || 0) * 100)}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-muted truncate">{b.career?.name}:</div>
                      <div className="font-bold">
                        Lvl {item.b?.requiredLevel} ({Math.round((item.b?.importance || 0) * 100)}%)
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Only B */}
        <div className="flex flex-col gap-3">
          <div className="p-2.5 bg-surface border-2 border-ink shadow-2xs flex items-center justify-between">
            <span className="font-display font-black text-xs uppercase text-ink tracking-wider">
              ONLY IN {b.career?.name}
            </span>
            <Badge tone="neutral">{uniqueToB.length}</Badge>
          </div>

          <div className="flex flex-col gap-2.5">
            {uniqueToB.length === 0 ? (
              <p className="font-mono text-xs text-muted p-4 text-center border-2 border-dashed border-line">
                No unique skills required.
              </p>
            ) : (
              uniqueToB.map((item, idx) => (
                <div
                  key={item.skill?.slug || idx}
                  className="p-3 bg-surface border-2 border-ink shadow-2xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-xs uppercase text-ink">
                      {item.skill?.name}
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      Req Lvl {item.requiredLevel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted">Importance:</span>
                    <ProgressBar
                      value={Math.round((item.importance || 0) * 100)}
                      max={100}
                      tone="brand"
                      className="h-1.5 flex-1"
                    />
                    <span className="font-mono text-[11px] font-bold">
                      {Math.round((item.importance || 0) * 100)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CareerCompareView;
