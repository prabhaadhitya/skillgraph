import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import EmptyState from '../ui/EmptyState.jsx';
import ChartTooltip from './ChartTooltip.jsx';

/**
 * TopMissingBarChart - renders horizontal bars for student's top missing skills.
 *
 * @param {Object} props
 * @param {Array<Object>} props.data - Array of { skill: { slug, name }, gap, importance }
 * @param {string} [props.className]
 */
export function TopMissingBarChart({ data = [], className = '' }) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No missing skills"
        text="All required skills for this career track are mastered."
        className={className}
      />
    );
  }

  const chartData = data.map((item) => ({
    name: item.skill?.name || item.skill?.slug || 'Skill',
    gap: item.gap,
    importance: item.importance,
    importancePercent: Math.round((item.importance || 0) * 100),
  }));

  const ariaLabel = `Top missing skills showing gap severity for ${data.length} critical skills`;

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
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
          >
            <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 5]}
              stroke="var(--color-ink)"
              tick={{ fill: 'var(--color-ink)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickFormatter={(val) => `${val} lvls`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="var(--color-ink)"
              tick={{ fill: 'var(--color-ink)', fontSize: 10, fontFamily: 'var(--font-sans)' }}
              tickFormatter={(val) => (val && val.length > 13 ? `${val.slice(0, 12)}…` : val)}
              width={105}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0].payload;
                return (
                  <ChartTooltip
                    active={active}
                    label={label}
                    payload={[{ name: 'Gap', value: `${item.gap} levels` }]}
                    extra={
                      <span className="text-muted">
                        Importance: <strong className="text-ink">{item.importancePercent}%</strong>
                      </span>
                    }
                  />
                );
              }}
            />
            <Legend
              wrapperStyle={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                color: 'var(--color-ink)',
                paddingTop: '6px',
              }}
            />
            <Bar
              dataKey="gap"
              name="Skill Gap"
              fill="var(--color-brand)"
              stroke="var(--color-ink)"
              strokeWidth={2}
              radius={0}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Visually hidden accessible data table */}
      <table className="sr-only">
        <caption>Top missing skills gap and importance table</caption>
        <thead>
          <tr>
            <th>Skill Name</th>
            <th>Gap</th>
            <th>Importance (%)</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((item, idx) => (
            <tr key={idx}>
              <td>{item.name}</td>
              <td>{item.gap}</td>
              <td>{item.importancePercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TopMissingBarChart;
