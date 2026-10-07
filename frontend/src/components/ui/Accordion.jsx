import { useState } from 'react';

/**
 * @typedef {Object} AccordionItem
 * @property {string|number} id - Unique identifier
 * @property {React.ReactNode} title - Heading / question text
 * @property {React.ReactNode} content - Body content
 */

/**
 * Accordion with bordered cards and + / - toggles.
 *
 * @param {Object} props
 * @param {AccordionItem[]} props.items - Array of accordion items
 * @param {string|number|null} [props.defaultOpenId=null] - Initially open item ID
 * @param {boolean} [props.allowMultiple=false] - Whether multiple items can be open
 * @param {string} [props.className=''] - Additional classes
 */
export function Accordion({
  items = [],
  defaultOpenId = null,
  allowMultiple = false,
  className = '',
}) {
  const [openIds, setOpenIds] = useState(() =>
    defaultOpenId ? new Set([defaultOpenId]) : new Set(),
  );

  const toggleItem = (id) => {
    setOpenIds((prev) => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        const headerId = `accordion-header-${item.id}`;
        const panelId = `accordion-panel-${item.id}`;

        return (
          <div
            key={item.id}
            className="border-2 border-ink bg-surface shadow-sm transition-all duration-120"
          >
            <h3>
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center justify-between p-4 text-left font-sans font-bold text-base text-ink cursor-pointer hover:bg-paper/50 focus:outline-none focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-[2px] transition-colors"
              >
                <span className="pr-4">{item.title}</span>
                <span
                  aria-hidden="true"
                  className="shrink-0 w-7 h-7 border-2 border-ink bg-paper flex items-center justify-center font-mono font-bold text-base leading-none select-none"
                >
                  {isOpen ? '−' : '+'}
                </span>
              </button>
            </h3>

            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="p-4 pt-1 border-t-2 border-line text-sm text-ink/90 font-sans"
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Accordion;
