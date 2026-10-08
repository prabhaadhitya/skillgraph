import { CheckCircle2, GitCompare, HelpCircle, ArrowRight } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Tag from '../../components/ui/Tag.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';

/**
 * Career card displaying career details, alignment score, and action triggers.
 *
 * @param {Object} props
 * @param {Object} props.career - Career catalog item { id, slug, name, description, category }
 * @param {Object} [props.fit] - Alignment score { fitScore, band, coverage, readiness }
 * @param {boolean} [props.isLoadingFit] - Whether alignment score is loading
 * @param {boolean} [props.isCurrentTarget] - Whether this career is user's active target
 * @param {boolean} [props.isSelectedForCompare] - Whether selected for side-by-side compare
 * @param {() => void} props.onToggleCompare - Toggle comparison selection
 * @param {() => void} props.onWhatIf - Trigger what-if simulation modal
 * @param {() => void} props.onSetTarget - Trigger set target career confirmation
 */
export function CareerCard({
  career,
  fit,
  isLoadingFit = false,
  isCurrentTarget = false,
  isSelectedForCompare = false,
  onToggleCompare,
  onWhatIf,
  onSetTarget,
}) {
  const fitScore = fit?.fitScore ?? 0;
  const band = fit?.band ?? 'early';

  const bandTone = band === 'strong' ? 'brand' : band === 'developing' ? 'brand-light' : 'neutral';

  return (
    <Card
      tone={isCurrentTarget ? 'brand' : isSelectedForCompare ? 'accent' : 'default'}
      className={`flex flex-col justify-between transition-all duration-150 ${
        isSelectedForCompare ? 'ring-2 ring-brand' : ''
      }`}
    >
      <div>
        {/* Header & Badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <Tag tone={isCurrentTarget ? 'brand' : 'neutral'}>
            {career.category || 'CAREER'}
          </Tag>
          <div className="flex items-center gap-1.5">
            {isCurrentTarget && (
              <Badge tone="brand" className="flex items-center gap-1">
                <CheckCircle2 size={12} />
                CURRENT TARGET
              </Badge>
            )}
            <button
              type="button"
              onClick={onToggleCompare}
              className={`px-2 py-0.5 text-xs font-mono font-bold uppercase border-2 border-ink shadow-2xs transition-all ${
                isSelectedForCompare
                  ? 'bg-brand text-white'
                  : 'bg-paper text-ink hover:bg-surface'
              }`}
              title="Select two careers to compare side by side"
            >
              <span className="flex items-center gap-1">
                <GitCompare size={12} />
                {isSelectedForCompare ? 'COMPARING' : 'COMPARE'}
              </span>
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="font-display font-black text-xl text-ink tracking-tight mb-2 uppercase">
          {career.name}
        </h2>
        <p className="font-sans text-xs text-muted line-clamp-3 mb-4 leading-relaxed">
          {career.description || 'Explore requirements and roadmap for this career pathway.'}
        </p>

        {/* Alignment Score Meter */}
        <div className="p-3 bg-surface border-2 border-ink shadow-2xs mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-xs uppercase text-muted font-bold tracking-wider">
              ESTIMATED ALIGNMENT
            </span>
            {isLoadingFit ? (
              <Skeleton variant="text" className="w-12 h-5" />
            ) : (
              <Badge tone={bandTone}>
                {band.toUpperCase()}
              </Badge>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            {isLoadingFit ? (
              <Skeleton variant="text" className="w-20 h-9" />
            ) : (
              <span className="font-display font-black text-3xl text-ink">
                {fitScore}%
              </span>
            )}
          </div>

          {isLoadingFit ? (
            <Skeleton variant="bar" className="w-full h-3" />
          ) : (
            <ProgressBar value={fitScore} max={100} tone="brand" className="h-2.5" />
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t-2 border-line flex flex-col sm:flex-row gap-2 mt-auto">
        <Button
          variant="secondary"
          size="sm"
          onClick={onWhatIf}
          className="flex-1 justify-center text-xs"
        >
          <HelpCircle size={14} className="mr-1" />
          WHAT IF I SWITCH?
        </Button>

        {!isCurrentTarget && (
          <Button
            variant="primary"
            size="sm"
            onClick={onSetTarget}
            className="flex-1 justify-center text-xs"
          >
            SET AS TARGET
            <ArrowRight size={14} className="ml-1" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export default CareerCard;
