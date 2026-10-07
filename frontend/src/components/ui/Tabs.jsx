/**
 * @typedef {Object} TabItem
 * @property {string|number} id - Unique tab identifier
 * @property {React.ReactNode} label - Tab display label
 * @property {React.ReactNode} [icon] - Optional icon
 * @property {boolean} [disabled] - Disabled state
 */

/**
 * Underline-less tabs where active tab has brand fill and ink border.
 *
 * @param {Object} props
 * @param {TabItem[]} props.tabs - Array of tabs
 * @param {string|number} props.activeTab - Currently active tab id
 * @param {(id: string|number) => void} props.onChange - Tab change handler
 * @param {string} [props.className=''] - Additional classes
 */
export function Tabs({ tabs = [], activeTab, onChange, className = '' }) {
  return (
    <div
      role="tablist"
      className={`flex flex-wrap items-center gap-2 border-b-2 border-ink pb-3 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            disabled={tab.disabled}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange?.(tab.id)}
            className={`inline-flex items-center gap-2 h-10 px-4 font-sans font-bold text-xs uppercase tracking-[0.04em] border-2 border-ink cursor-pointer transition-all duration-120 select-none focus:outline-none focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-[2px] disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-brand text-white shadow-sm -translate-y-0.5'
                : 'bg-surface text-ink hover:bg-paper hover:-translate-y-0.5'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
