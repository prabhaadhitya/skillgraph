/**
 * Neo-brutalist chart tooltip styled in Card style per DESIGN_SYSTEM.md section 8.
 *
 * @param {Object} props
 * @param {boolean} [props.active]
 * @param {Array<Object>} [props.payload]
 * @param {string} [props.label]
 * @param {string} [props.unit]
 * @param {React.ReactNode} [props.extra]
 */
export function ChartTooltip({ active, payload, label, unit = '', extra }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-surface border-2 border-ink shadow-sm p-2.5 font-sans text-xs select-none min-w-[130px]">
      <p className="font-bold text-ink mb-1">{label}</p>
      {payload.map((item, idx) => (
        <p key={idx} className="font-mono text-muted flex items-center justify-between gap-3">
          <span>{item.name || 'Value'}:</span>
          <span className="font-bold text-ink">
            {item.value}
            {unit}
          </span>
        </p>
      ))}
      {extra && (
        <div className="mt-1.5 pt-1.5 border-t border-line font-mono text-muted text-[11px]">
          {extra}
        </div>
      )}
    </div>
  );
}

export default ChartTooltip;
