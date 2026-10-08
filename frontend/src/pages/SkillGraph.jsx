import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { Search, ZoomIn, ZoomOut, Maximize2, Sparkles } from 'lucide-react';
import { useGraph } from '../hooks/useGraph.js';
import { useDashboard } from '../hooks/useDashboard.js';
import { layoutGraph } from '../components/graph/layout.js';
import { GraphCanvas } from '../components/graph/GraphCanvas.jsx';
import { SkillDetailPanel } from '../components/graph/SkillDetailPanel.jsx';
import { filterGraphNodes } from '../components/graph/graphUtils.js';
import { Tag, Button, Skeleton, ErrorState, EmptyState } from '../components/ui';

/**
 * Skill Graph explorer page (/app/graph).
 * Live React Flow graph with Dagre layout, zoom toolbar, skill search, fit-view,
 * related-links toggle (?related=true), and responsive detail panel (bottom sheet on tablet).
 */
export default function SkillGraph({ career }) {
  useEffect(() => {
    document.title = 'SkillGraph — Skill Graph';
  }, []);

  const [includeRelated, setIncludeRelated] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [rfInstance, setRfInstance] = useState(null);
  const [latestFit, setLatestFit] = useState(null);

  const { data, isLoading, isError, error, refetch } = useGraph(career, {
    includeRelated,
  });

  const { data: dashboardData } = useDashboard();

  const nodes = useMemo(() => data?.nodes || [], [data?.nodes]);
  const edges = useMemo(() => data?.edges || [], [data?.edges]);

  // Memoized Dagre layout - only recalculates when graph data changes, not on hover
  const layoutedNodes = useMemo(() => {
    if (nodes.length === 0) return [];
    return layoutGraph(nodes, edges);
  }, [nodes, edges]);

  const selectedNode = useMemo(
    () => layoutedNodes.find((n) => n.id === selectedNodeId || n.slug === selectedNodeId) || null,
    [layoutedNodes, selectedNodeId],
  );

  const searchResults = useMemo(
    () => (searchQuery ? filterGraphNodes(layoutedNodes, searchQuery).slice(0, 6) : []),
    [layoutedNodes, searchQuery],
  );

  // Close panel on Esc key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectSearchResult = (node) => {
    setSelectedNodeId(node.id);
    setSearchQuery('');
    setSearchOpen(false);
    if (rfInstance && node.position) {
      rfInstance.setCenter(node.position.x + 84, node.position.y + 32, {
        zoom: 1,
        duration: 400,
      });
    }
  };

  const handleSelectNode = (nodeId) => {
    setSelectedNodeId(nodeId);
    if (!nodeId) return;
    const target = layoutedNodes.find((n) => n.id === nodeId || n.slug === nodeId);
    if (target && rfInstance && target.position) {
      rfInstance.setCenter(target.position.x + 84, target.position.y + 32, {
        zoom: 1,
        duration: 400,
      });
    }
  };

  // Alignment and delta calculation
  const alignmentScore =
    latestFit?.score ?? dashboardData?.fit?.score ?? null;
  const delta =
    latestFit != null
      ? latestFit.previousScore != null
        ? latestFit.score - latestFit.previousScore
        : null
      : dashboardData?.fit?.delta ?? null;

  // Check for empty profile
  const isEmptyProfile =
    layoutedNodes.length > 0 &&
    layoutedNodes.every((n) => !n.proficiency || n.proficiency === 0);

  if (isLoading) {
    return (
      <div data-testid="graph-skeleton" className="p-4 md:p-6 space-y-4 font-sans">
        <Skeleton variant="card" height={56} />
        <div className="h-[650px] bg-surface border-2 border-ink shadow-md p-6 flex flex-col gap-4 animate-pulse">
          <Skeleton variant="rectangular" height={40} className="w-72" />
          <div className="flex-1 bg-paper/60 border-2 border-line flex items-center justify-center">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
              Loading knowledge graph...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 md:p-12 font-sans flex items-center justify-center min-h-[500px]">
        <ErrorState
          title="FAILED TO LOAD GRAPH"
          message={error?.message || 'Could not fetch skill graph data.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (layoutedNodes.length === 0) {
    return (
      <div className="p-6 md:p-12 font-sans flex items-center justify-center min-h-[500px]">
        <EmptyState
          title="NO GRAPH DATA"
          text="No skills found for this career path yet. Explore careers or set up your profile."
        />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 font-sans flex flex-col gap-4 h-full min-h-[calc(100vh-80px)]">
      {/* Top Header Card */}
      <header className="bg-surface border-2 border-ink shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Tag tone="brand">GRAPH EXPLORER</Tag>
          <span className="font-display uppercase text-lg tracking-tight text-ink">
            {data?.career?.name || 'Skill Graph'}
          </span>
        </div>

        {/* Alignment, Delta, and Graph Stats */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {alignmentScore != null && (
            <div className="flex items-center gap-2 border-2 border-ink px-2.5 py-1 bg-paper shadow-2xs">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                Alignment
              </span>
              <span className="font-display text-base text-ink leading-none">
                {alignmentScore}%
              </span>
              {delta != null && delta !== 0 && (
                <span
                  className={`font-mono text-xs font-black px-1.5 py-0.5 rounded-xs border border-ink ${
                    delta > 0
                      ? 'bg-state-mastered text-ink'
                      : 'bg-state-missing text-white'
                  }`}
                  title={`Change in alignment: ${delta > 0 ? `+${delta}%` : `${delta}%`}`}
                >
                  {delta > 0 ? `+${delta}%` : `${delta}%`}
                </span>
              )}
            </div>
          )}
          <div className="font-mono text-xs text-muted">
            <span>{data?.stats?.nodes ?? layoutedNodes.length} nodes · </span>
            <span>{data?.stats?.edges ?? edges.length} edges</span>
          </div>
        </div>
      </header>

      {/* Empty Profile Banner */}
      {isEmptyProfile && (
        <div className="bg-state-next/20 border-2 border-ink p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand shrink-0" />
            <span className="font-sans font-bold text-xs sm:text-sm text-ink">
              Add your skills to see your progress
            </span>
          </div>
          <Link
            to="/app/profile"
            className="font-mono text-xs font-bold uppercase underline hover:text-brand transition-colors"
          >
            Go to Profile →
          </Link>
        </div>
      )}

      {/* Main Canvas & Detail Panel */}
      <div className="flex-1 w-full min-h-[640px] flex flex-col lg:flex-row gap-4 relative">
        <GraphCanvas
          nodes={layoutedNodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          onInit={setRfInstance}
          className="border-2 border-ink shadow-md"
        >
          {/* Top-Left Neo-brutalist Toolbar Card */}
          <div className="absolute top-4 left-4 z-20 bg-surface border-2 border-ink shadow-md p-2.5 flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <div className="flex items-center border-2 border-ink bg-paper px-2 py-1 shadow-2xs">
                <Search size={14} className="text-muted mr-1.5" />
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchResults.length > 0) {
                      e.preventDefault();
                      handleSelectSearchResult(searchResults[0]);
                    }
                  }}
                  className="bg-transparent text-xs font-sans font-bold text-ink focus:outline-none w-28 sm:w-36"
                />
              </div>

              {/* Search Results Dropdown */}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-surface border-2 border-ink shadow-md z-30 divide-y divide-line max-h-48 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-sans font-bold hover:bg-brand hover:text-white transition-colors cursor-pointer"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Zoom In & Out */}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => rfInstance?.zoomIn({ duration: 300 })}
              className="text-xs h-7 w-7 !p-0 flex items-center justify-center"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn size={13} />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => rfInstance?.zoomOut({ duration: 300 })}
              className="text-xs h-7 w-7 !p-0 flex items-center justify-center"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut size={13} />
            </Button>

            {/* Fit View Button */}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => rfInstance?.fitView({ duration: 400, padding: 0.2 })}
              className="text-xs h-7 px-2.5 flex items-center gap-1"
              title="Fit view"
              aria-label="Fit view"
            >
              <Maximize2 size={12} />
              <span>Fit view</span>
            </Button>

            {/* Show Related Links Toggle */}
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-mono text-[11px] font-bold uppercase select-none text-ink pl-1">
              <input
                type="checkbox"
                checked={includeRelated}
                onChange={(e) => setIncludeRelated(e.target.checked)}
                className="w-3.5 h-3.5 accent-brand cursor-pointer"
              />
              <span>Show related links</span>
            </label>
          </div>
        </GraphCanvas>

        {/* Live Detail Panel */}
        <SkillDetailPanel
          selectedNode={selectedNode}
          nodes={layoutedNodes}
          edges={edges}
          onSelectNode={handleSelectNode}
          onClose={() => setSelectedNodeId(null)}
          onSkillUpdated={(fit) => setLatestFit(fit)}
        />
      </div>
    </div>
  );
}
