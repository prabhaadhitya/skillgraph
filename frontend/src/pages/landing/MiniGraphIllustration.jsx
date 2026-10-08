/**
 * Neo-brutalist SVG illustration of a skill graph with invented skill names.
 * Fully vector-drawn with 2px borders, hard shadows, status indicators, and directed edges.
 * No external images.
 */
export function MiniGraphIllustration({ className = '' }) {
  return (
    <div className={`relative w-full max-w-xl mx-auto ${className}`}>
      <svg
        viewBox="0 0 540 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-sm select-none"
        aria-label="Interactive skill graph illustration"
        role="img"
      >
        <defs>
          {/* Arrowhead marker */}
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#111111" />
          </marker>

          {/* Hard offset shadow filter */}
          <filter id="hard-shadow" x="0" y="0" width="200%" height="200%">
            <feOffset dx="4" dy="4" result="offset" />
            <feFlood floodColor="#111111" result="color" />
            <feComposite in2="offset" in="color" operator="in" />
            <feComposite in="SourceGraphic" operator="over" />
          </filter>
        </defs>

        {/* Directed Edges */}
        <g stroke="#111111" strokeWidth="2.5">
          {/* Node 1 -> Node 3 */}
          <path d="M 120 70 L 260 70" markerEnd="url(#arrow)" />
          {/* Node 2 -> Node 3 */}
          <path d="M 120 220 C 180 220, 200 110, 260 85" markerEnd="url(#arrow)" />
          {/* Node 3 -> Node 4 */}
          <path d="M 370 70 L 410 70" markerEnd="url(#arrow)" />
          {/* Node 2 -> Node 5 */}
          <path d="M 120 230 L 260 230" markerEnd="url(#arrow)" />
          {/* Node 5 -> Node 4 */}
          <path d="M 370 220 C 400 200, 410 130, 420 95" markerEnd="url(#arrow)" />
        </g>

        {/* Node 1: DATA FOUNDATIONS (Mastered) */}
        <g transform="translate(20, 40)">
          <rect
            x="4"
            y="4"
            width="110"
            height="55"
            fill="#111111"
          />
          <rect
            x="0"
            y="0"
            width="110"
            height="55"
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth="2.5"
          />
          <rect x="0" y="0" width="110" height="8" fill="#3DDC97" />
          <text
            x="8"
            y="26"
            fontFamily="Inter, sans-serif"
            fontWeight="800"
            fontSize="10"
            fill="#111111"
            letterSpacing="0.04em"
          >
            DATA FOUNDATIONS
          </text>
          <text
            x="8"
            y="42"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            fontSize="9"
            fill="#5B5B66"
          >
            LVL 4/4 · MASTERED
          </text>
        </g>

        {/* Node 2: CORE LOGIC (Mastered) */}
        <g transform="translate(20, 190)">
          <rect
            x="4"
            y="4"
            width="110"
            height="55"
            fill="#111111"
          />
          <rect
            x="0"
            y="0"
            width="110"
            height="55"
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth="2.5"
          />
          <rect x="0" y="0" width="110" height="8" fill="#3DDC97" />
          <text
            x="8"
            y="26"
            fontFamily="Inter, sans-serif"
            fontWeight="800"
            fontSize="10"
            fill="#111111"
            letterSpacing="0.04em"
          >
            CORE LOGIC
          </text>
          <text
            x="8"
            y="42"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            fontSize="9"
            fill="#5B5B66"
          >
            LVL 3/3 · MASTERED
          </text>
        </g>

        {/* Node 3: MODEL ENGINE (Recommended Next - Highlighted) */}
        <g transform="translate(260, 40)">
          <rect
            x="5"
            y="5"
            width="120"
            height="62"
            fill="#6D4AFF"
          />
          <rect
            x="0"
            y="0"
            width="120"
            height="62"
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth="2.5"
          />
          <rect x="0" y="0" width="120" height="10" fill="#4CC9F0" />
          <rect
            x="8"
            y="14"
            width="56"
            height="14"
            fill="#4CC9F0"
            stroke="#111111"
            strokeWidth="1.5"
          />
          <text
            x="12"
            y="24"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="800"
            fontSize="8"
            fill="#111111"
          >
            LEARN NEXT
          </text>
          <text
            x="8"
            y="42"
            fontFamily="Inter, sans-serif"
            fontWeight="800"
            fontSize="11"
            fill="#111111"
            letterSpacing="0.04em"
          >
            MODEL ENGINE
          </text>
          <text
            x="8"
            y="54"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            fontSize="9"
            fill="#6D4AFF"
          >
            STEP 1 · READY NOW
          </text>
        </g>

        {/* Node 5: SYSTEM DEPLOY (In Progress) */}
        <g transform="translate(260, 190)">
          <rect
            x="4"
            y="4"
            width="115"
            height="55"
            fill="#111111"
          />
          <rect
            x="0"
            y="0"
            width="115"
            height="55"
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth="2.5"
          />
          <rect x="0" y="0" width="115" height="8" fill="#FFC93C" />
          <text
            x="8"
            y="26"
            fontFamily="Inter, sans-serif"
            fontWeight="800"
            fontSize="10"
            fill="#111111"
            letterSpacing="0.04em"
          >
            SYSTEM DEPLOY
          </text>
          <text
            x="8"
            y="42"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            fontSize="9"
            fill="#5B5B66"
          >
            LVL 1/3 · IN PROGRESS
          </text>
        </g>

        {/* Node 4: KNOWLEDGE GRAPH (Missing) */}
        <g transform="translate(420, 45)">
          <rect
            x="4"
            y="4"
            width="110"
            height="55"
            fill="#111111"
          />
          <rect
            x="0"
            y="0"
            width="110"
            height="55"
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth="2.5"
          />
          <rect x="0" y="0" width="110" height="8" fill="#FF5A5F" />
          <text
            x="8"
            y="26"
            fontFamily="Inter, sans-serif"
            fontWeight="800"
            fontSize="10"
            fill="#111111"
            letterSpacing="0.04em"
          >
            KNOWLEDGE GRAPH
          </text>
          <text
            x="8"
            y="42"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            fontSize="9"
            fill="#FF5A5F"
          >
            LVL 0/4 · MISSING
          </text>
        </g>

        {/* Mini Legend Badge */}
        <g transform="translate(380, 260)">
          <rect
            x="0"
            y="0"
            width="150"
            height="46"
            fill="#FFF7E8"
            stroke="#111111"
            strokeWidth="2"
          />
          <circle cx="14" cy="15" r="5" fill="#3DDC97" stroke="#111111" strokeWidth="1.5" />
          <text x="24" y="18" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#111111">
            Mastered
          </text>
          <circle cx="85" cy="15" r="5" fill="#4CC9F0" stroke="#111111" strokeWidth="1.5" />
          <text x="95" y="18" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#111111">
            Learn Next
          </text>
          <circle cx="14" cy="33" r="5" fill="#FFC93C" stroke="#111111" strokeWidth="1.5" />
          <text x="24" y="36" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#111111">
            Partial
          </text>
          <circle cx="85" cy="33" r="5" fill="#FF5A5F" stroke="#111111" strokeWidth="1.5" />
          <text x="95" y="36" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#111111">
            Missing
          </text>
        </g>
      </svg>
    </div>
  );
}

export default MiniGraphIllustration;
