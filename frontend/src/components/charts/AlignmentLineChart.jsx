import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import EmptyState from '../ui/EmptyState.jsx';
import ChartTooltip from './ChartTooltip.jsx';

/**
 * Custom square brand marker for line charts.
 */
function SquareBrandDot({ cx, cy }) {
  if (cx == null || cy == null) return null;
  const size = 8;
  return (
    <rect
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      fill="var(--color-brand)"
      stroke="var(--color-ink)"
      strokeWidth={2}
    />
  );
}

/**
 * AlignmentLineChart - renders student's estimated career alignment history.
 *
 * @param {Object} props
 * @param {Array<Object>} props.data - Array of { at, fitScore }
 * @param {string} [props.className]
 */
export function AlignmentLineChart({ data = [], className = '' }) {
  if (!data || data.length < 2) {
    return (
      <EmptyState
        title="Not enough history"
        text="Update your skills a few times to see your progress"
        className={className}
      />
    );
  }

  const formattedData = data.map((d) => {
    const dateObj = new Date(d.at);
    const label = !isNaN(dateObj)
      ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.at;
    return { ...d, label };
  });

  const ariaLabel = `Alignment history showing estimated career alignment progress across ${data.length} recorded snapshots`;

  return (
    <div
      className={`flex flex-col gap-3 font-sans ${className}`}
      aria-label={ariaLabel}
      role="region"
    >
      <div className="w-full h-[260px] relative">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={100}
          minHeight={260}
          initialDimension={{ width: 500, height: 260 }}
        >
          <LineChart
            data={formattedData}
            margin={{ top: 15, right: 15, left: -15, bottom: 10 }}
          >
            <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke="var(--color-ink)"
              tick={{ fill: 'var(--color-ink)', fontSize: 11, fontFamily: 'var(--font-sans)' }}
            />
            <YAxis
              stroke="var(--color-ink)"
              domain={[0, 100]}
              tick={{ fill: 'var(--color-ink)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            />
            <Tooltip content={<ChartTooltip unit="%" />} />
            <Line
              type="monotone"
              dataKey="fitScore"
              name="Alignment"
              stroke="var(--color-ink)"
              strokeWidth={3}
              dot={<SquareBrandDot />}
              activeDot={{ r: 6, fill: 'var(--color-pop)', stroke: 'var(--color-ink)', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Visually hidden accessible data table */}
      <table className="sr-only">
        <caption>Alignment history snapshots</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Estimated Career Alignment (%)</th>
          </tr>
        </thead>
        <tbody>
          {formattedData.map((item, idx) => (
            <tr key={idx}>
              <td>{item.label}</td>
              <td>{item.fitScore}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AlignmentLineChart;
