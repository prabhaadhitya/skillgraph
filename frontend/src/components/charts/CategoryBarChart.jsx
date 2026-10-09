import { useState } from 'react';
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
import ChartTooltip from './ChartTooltip.jsx';

/**
 * CategoryBarChart - displays skill count or average level per category.
 *
 * @param {Object} props
 * @param {Array<Object>} props.data - Array of { category, name, skills, avgLevel }
 * @param {string} [props.className]
 */
export function CategoryBarChart({ data = [], className = '' }) {
  const [metric, setMetric] = useState('skills'); // 'skills' | 'avgLevel'

  const ariaLabel = `Category distribution showing ${
    metric === 'skills' ? 'skill counts' : 'average proficiency levels'
  } across ${data.length} categories`;

  return (
    <div
      className={`flex flex-col gap-3 font-sans ${className}`}
      aria-label={ariaLabel}
      role="region"
    >
      {/* Metric Switch Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs uppercase text-muted font-bold tracking-wider">
          Metric:
        </span>
        <div className="inline-flex border-2 border-ink bg-paper p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setMetric('skills')}
            className={`px-2.5 py-1 text-xs font-mono font-bold uppercase transition-all ${
              metric === 'skills'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink hover:text-brand'
            }`}
          >
            Skill Count
          </button>
          <button
            type="button"
            onClick={() => setMetric('avgLevel')}
            className={`px-2.5 py-1 text-xs font-mono font-bold uppercase transition-all ${
              metric === 'avgLevel'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink hover:text-brand'
            }`}
          >
            Avg Level
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[260px] relative">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={100}
          minHeight={260}
          initialDimension={{ width: 500, height: 260 }}
        >
          <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
            <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="var(--color-ink)"
              tick={{ fill: 'var(--color-ink)', fontSize: 10, fontFamily: 'var(--font-sans)' }}
              tickFormatter={(val) => (val && val.length > 10 ? `${val.slice(0, 9)}…` : val)}
              angle={-25}
              textAnchor="end"
              interval={0}
              height={45}
            />
            <YAxis
              stroke="var(--color-ink)"
              tick={{ fill: 'var(--color-ink)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickFormatter={(val) => (metric === 'avgLevel' ? `Lv ${val}` : val)}
              domain={metric === 'avgLevel' ? [0, 5] : [0, 'auto']}
              allowDecimals={metric === 'avgLevel'}
            />
            <Tooltip
              content={
                <ChartTooltip
                  unit={metric === 'avgLevel' ? ' / 5' : ''}
                />
              }
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
              dataKey={metric}
              name={metric === 'skills' ? 'Skills' : 'Avg Level'}
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
        <caption>Category distribution data summary</caption>
        <thead>
          <tr>
            <th>Category</th>
            <th>Skills Count</th>
            <th>Average Level</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.category}>
              <td>{item.name}</td>
              <td>{item.skills}</td>
              <td>{item.avgLevel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CategoryBarChart;
