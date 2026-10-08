import { Card } from '../../components/ui/Card.jsx';
import { StatBox, StatBoxGroup } from '../../components/ui/StatBox.jsx';

/**
 * SummaryStats renders the 3 key skill requirement status buckets:
 * STRONG, DEVELOPING, MISSING.
 *
 * @param {Object} props
 * @param {Object} [props.summary={}]
 * @param {number} [props.summary.strong=0]
 * @param {number} [props.summary.developing=0]
 * @param {number} [props.summary.missing=0]
 * @param {number} [props.summary.total=0]
 */
export function SummaryStats({ summary = {} }) {
  const strong = summary.strong ?? 0;
  const developing = summary.developing ?? 0;
  const missing = summary.missing ?? 0;
  const total = summary.total ?? strong + developing + missing;

  return (
    <Card className="p-6 md:p-8 flex flex-col justify-between space-y-6 bg-surface border-2 border-ink shadow-md">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-muted font-bold">
          SKILL GAP SUMMARY
        </span>
        <span className="font-mono text-xs font-bold text-ink px-2 py-0.5 bg-paper border border-ink shadow-sm">
          {total} TOTAL SKILLS
        </span>
      </div>

      <StatBoxGroup className="grid-cols-1 sm:grid-cols-3 md:grid-cols-3">
        <StatBox
          value={strong}
          label="STRONG"
          className="bg-emerald-50/40"
        />
        <StatBox
          value={developing}
          label="DEVELOPING"
          className="bg-amber-50/40"
        />
        <StatBox
          value={missing}
          label="MISSING"
          className="bg-rose-50/40"
        />
      </StatBoxGroup>

      <div className="text-xs font-mono text-muted text-center">
        {strong} mastered or on-track · {developing} in progress · {missing} yet to acquire
      </div>
    </Card>
  );
}

export default SummaryStats;
