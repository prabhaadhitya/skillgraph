import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import Tag from '../../components/ui/Tag.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';

/**
 * What-If scenario modal showing alignment change, path delta, and skill requirements.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Object} [props.data] - What-if simulation payload { current, alternative, delta, newlyRequired, noLongerRequired }
 * @param {boolean} [props.isLoading]
 * @param {() => void} [props.onSetAsTarget] - Trigger target confirmation
 */
export function WhatIfModal({
  isOpen,
  onClose,
  data,
  isLoading = false,
  onSetAsTarget,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="WHAT IF I SWITCH?"
      maxWidth="max-w-xl"
    >
      {isLoading ? (
        <div className="flex flex-col gap-4 py-4">
          <Skeleton variant="text" className="w-48 h-6" />
          <Skeleton variant="card" className="h-32" />
          <Skeleton variant="card" className="h-28" />
        </div>
      ) : !data ? (
        <div className="py-6 text-center">
          <p className="font-mono text-xs text-muted">No simulation data available.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 py-2">
          {/* Header comparison box */}
          <div className="p-4 bg-surface border-2 border-ink shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b-2 border-line pb-3 mb-3">
              <div className="flex-1">
                <span className="font-mono text-[11px] text-muted uppercase font-bold">
                  CURRENT GOAL
                </span>
                <h4 className="font-display font-black text-sm text-ink uppercase truncate">
                  {data.current?.career?.name}
                </h4>
                <div className="font-display font-black text-2xl text-ink mt-0.5">
                  {data.current?.fitScore}%
                </div>
              </div>

              <div className="flex flex-col items-center justify-center px-2">
                <ArrowRight size={20} className="text-muted" />
                {data.delta >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 mt-1 border-2 border-ink bg-brand text-white font-mono text-xs font-bold shadow-2xs">
                    <TrendingUp size={12} />
                    +{data.delta}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 mt-1 border-2 border-ink bg-paper text-ink font-mono text-xs font-bold shadow-2xs">
                    <TrendingDown size={12} />
                    {data.delta}%
                  </span>
                )}
              </div>

              <div className="flex-1 text-right">
                <span className="font-mono text-[11px] text-muted uppercase font-bold">
                  ALTERNATIVE TRACK
                </span>
                <h4 className="font-display font-black text-sm text-ink uppercase truncate">
                  {data.alternative?.career?.name}
                </h4>
                <div className="font-display font-black text-2xl text-brand mt-0.5">
                  {data.alternative?.fitScore}%
                </div>
              </div>
            </div>

            {/* Path step comparison note */}
            <div className="flex items-center justify-between text-xs font-mono text-muted">
              <span>Learning pathway effort:</span>
              <span className="font-bold text-ink">
                {data.current?.pathSteps ?? 0} steps → {data.alternative?.pathSteps ?? 0} steps
              </span>
            </div>
          </div>

          {/* Top Priority Skills */}
          {data.alternative?.topPriority && data.alternative.topPriority.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag tone="brand">TOP PRIORITY</Tag>
                <span className="font-mono text-xs text-muted">
                  Skills you would tackle first in this track:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.alternative.topPriority.map((s) => (
                  <span
                    key={s.slug}
                    className="px-2.5 py-1 bg-surface border-2 border-ink text-xs font-mono font-bold uppercase shadow-2xs"
                  >
                    {s.name || s.slug}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Newly Required Skills */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag tone="neutral">NEW REQUIREMENTS</Tag>
              <span className="font-mono text-xs text-muted">
                Skills required by {data.alternative?.career?.name} that your current target didn&apos;t require:
              </span>
            </div>
            {data.newlyRequired && data.newlyRequired.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.newlyRequired.map((s) => (
                  <div
                    key={s.slug}
                    className="p-2.5 bg-surface border-2 border-ink text-xs flex items-center justify-between shadow-2xs"
                  >
                    <span className="font-mono font-bold uppercase text-ink">
                      {s.name || s.slug}
                    </span>
                    <Badge tone="brand">Req Lvl {s.requiredLevel}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-mono text-xs text-muted p-3 bg-surface border-2 border-dashed border-line text-center">
                All skills in this career are already part of your curriculum!
              </p>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-line">
            <Button variant="secondary" size="sm" onClick={onClose}>
              CLOSE
            </Button>
            {onSetAsTarget && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onSetAsTarget();
                }}
              >
                SET AS MY TARGET NOW
                <ArrowRight size={14} className="ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default WhatIfModal;
