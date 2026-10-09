import { Link } from 'react-router';
import { GitFork, ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';

/**
 * GraphPreview renders a read-only visual mini-map representation
 * of the student's skill topology and links directly to /app/graph.
 *
 * @param {Object} props
 * @param {string} [props.careerName='Target Career']
 */
export function GraphPreview({ careerName = 'Target Career' }) {
  return (
    <Card className="p-6 md:p-8 flex flex-col justify-between space-y-6 bg-surface border-2 border-ink shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-muted font-bold block">
            KNOWLEDGE GRAPH
          </span>
          <h2 className="font-display text-xl text-ink uppercase tracking-tight font-bold">
            Skill Graph Topology
          </h2>
        </div>

        <Link
          to="/app/graph"
          className="p-2 border-2 border-ink shadow-sm bg-paper hover:bg-brand-soft text-ink transition-colors cursor-pointer"
          aria-label="Open Skill Graph"
        >
          <GitFork className="w-4 h-4" />
        </Link>
      </div>

      {/* Static Visual Graph Graphic */}
      <div className="relative h-44 sm:h-48 w-full bg-paper border-2 border-ink shadow-inner overflow-hidden flex items-center justify-center p-4">
        {/* Decorative Grid Lines */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(var(--color-ink) 1px, transparent 1px), radial-gradient(var(--color-ink) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 8px 8px',
          }}
        />

        {/* SVG Nodes and Connecting Edges Simulation */}
        <svg
          className="w-full h-full max-w-sm mx-auto"
          viewBox="0 0 320 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Edges */}
          <path d="M 60 80 L 160 50" stroke="var(--color-ink)" strokeWidth="2.5" strokeDasharray="4 4" />
          <path d="M 60 80 L 160 110" stroke="var(--color-ink)" strokeWidth="2.5" />
          <path d="M 160 50 L 260 80" stroke="var(--color-ink)" strokeWidth="2.5" />
          <path d="M 160 110 L 260 80" stroke="var(--color-ink)" strokeWidth="2.5" />

          {/* Node 1: Mastered */}
          <g transform="translate(60, 80)">
            <circle r="18" fill="var(--color-state-mastered)" stroke="var(--color-ink)" strokeWidth="2.5" />
            <text textAnchor="middle" dy="4" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="var(--color-ink)">
              PY
            </text>
          </g>

          {/* Node 2: Developing */}
          <g transform="translate(160, 50)">
            <circle r="18" fill="var(--color-state-partial)" stroke="var(--color-ink)" strokeWidth="2.5" />
            <text textAnchor="middle" dy="4" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="var(--color-ink)">
              SQL
            </text>
          </g>

          {/* Node 3: Developing */}
          <g transform="translate(160, 110)">
            <circle r="18" fill="var(--color-state-partial)" stroke="var(--color-ink)" strokeWidth="2.5" />
            <text textAnchor="middle" dy="4" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="var(--color-ink)">
              ML
            </text>
          </g>

          {/* Node 4: Target Career Capstone */}
          <g transform="translate(260, 80)">
            <circle r="22" fill="var(--color-brand)" stroke="var(--color-ink)" strokeWidth="2.5" />
            <text textAnchor="middle" dy="4" fontSize="11" fontFamily="sans-serif" fontWeight="900" fill="var(--color-surface)">
              GOAL
            </text>
          </g>
        </svg>

        {/* Legend Overlay */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-surface/90 px-2 py-0.5 border border-ink text-[10px] font-mono font-bold">
          <span className="inline-block w-2 h-2 rounded-full bg-state-mastered border border-ink" /> Strong
          <span className="inline-block w-2 h-2 rounded-full bg-state-partial border border-ink" /> Developing
          <span className="inline-block w-2 h-2 rounded-full bg-brand border border-ink" /> Target
        </div>
      </div>

      {/* Footer Call to Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <p className="text-xs text-muted font-sans">
          Interactive view of requirements for <strong className="text-ink">{careerName}</strong>.
        </p>

        <Link to="/app/graph" className="shrink-0">
          <Button variant="secondary" size="sm" icon={<ArrowUpRight size={14} />}>
            OPEN GRAPH
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export default GraphPreview;
