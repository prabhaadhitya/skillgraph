import { useState, useMemo } from 'react';
import mockGraphData from '../mocks/graph.prabha.json';
import { layoutGraph } from '../components/graph/layout.js';
import { GraphCanvas } from '../components/graph/GraphCanvas.jsx';
import { SkillDetailPanel } from '../components/graph/SkillDetailPanel.jsx';
import { Card, Tag, Button, Highlight } from '../components/ui';

/**
 * SkillGraph prototype page rendering the 35-node ML Engineer graph
 * with interactive selection, Dagre LR layout, and a detail panel.
 */
export default function SkillGraph({
  initialData = mockGraphData,
  initialLoading = false,
  initialEmpty = false,
}) {
  const [loading, setLoading] = useState(initialLoading);
  const [empty, setEmpty] = useState(initialEmpty);
  const [selectedNodeId, setSelectedNodeId] = useState('statistics');

  // Compute Dagre layout
  const layoutedNodes = useMemo(() => {
    const nodes = empty ? [] : initialData?.nodes || [];
    const edges = empty ? [] : initialData?.edges || [];
    if (nodes.length === 0) return [];
    return layoutGraph(nodes, edges);
  }, [empty, initialData]);

  const currentEdges = useMemo(() => {
    return empty ? [] : initialData?.edges || [];
  }, [empty, initialData]);

  const selectedNode = useMemo(() => {
    return layoutedNodes.find((n) => n.id === selectedNodeId) || null;
  }, [layoutedNodes, selectedNodeId]);

  return (
    <div className="min-h-screen bg-paper text-ink p-4 md:p-8 flex flex-col gap-4 font-sans">
      {/* Top Header Card */}
      <header className="bg-surface border-2 border-ink shadow-md p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Tag tone="brand">PROTOTYPE · FLOW F3</Tag>
            <Tag tone="pop">{initialData.career?.name || 'Career Graph'}</Tag>
          </div>
          <h1 className="font-display uppercase text-xl md:text-2xl tracking-tight">
            SKILL GRAPH <Highlight>EXPLORER</Highlight>
          </h1>
        </div>

        {/* Toolbar & Demo Toggles */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setLoading(!loading)}
          >
            {loading ? 'Show Graph' : 'Simulate Loading'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEmpty(!empty);
              setSelectedNodeId(null);
            }}
          >
            {empty ? 'Show 35 Nodes' : 'Simulate Empty'}
          </Button>
          <a
            href="/_kit"
            className="hidden sm:inline-flex items-center px-3 py-2 font-bold uppercase border-2 border-ink bg-paper hover:bg-brand hover:text-white transition-colors"
          >
            UI Kit
          </a>
        </div>
      </header>

      {/* Main Graph Content Area */}
      <main className="flex-1 w-full h-[760px] flex flex-col lg:flex-row gap-4">
        {loading ? (
          // Skeleton Loading State
          <div
            data-testid="graph-skeleton"
            className="flex-1 w-full h-full bg-surface border-2 border-ink shadow-md p-8 flex flex-col gap-6 animate-pulse"
          >
            <div className="h-8 w-64 bg-line border-2 border-ink" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="h-16 bg-line/60 border-2 border-ink" />
              <div className="h-16 bg-line/60 border-2 border-ink" />
              <div className="h-16 bg-line/60 border-2 border-ink" />
              <div className="h-16 bg-line/60 border-2 border-ink" />
            </div>
            <div className="flex-1 bg-paper/60 border-2 border-line flex items-center justify-center">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
                Computing graph layout...
              </span>
            </div>
          </div>
        ) : empty || layoutedNodes.length === 0 ? (
          // Empty State
          <div
            data-testid="graph-empty"
            className="flex-1 w-full h-full bg-paper border-2 border-ink shadow-md flex items-center justify-center p-8"
          >
            <Card tone="default" className="text-center max-w-md p-8 space-y-4">
              <Tag tone="pop">NO SKILLS</Tag>
              <h2 className="font-display uppercase text-2xl text-ink">Empty Skill Graph</h2>
              <p className="font-sans text-sm text-muted">
                No skills are currently mapped for this career. Add your skills in Onboarding or Profile to light up your graph.
              </p>
              <Button variant="primary" onClick={() => setEmpty(false)}>
                RESET DEMO GRAPH
              </Button>
            </Card>
          </div>
        ) : (
          // Working Graph Canvas & Side Panel
          <>
            <div className="flex-1 flex flex-col h-[760px] lg:h-full min-h-[500px] border-2 border-ink shadow-md relative overflow-hidden">
              <GraphCanvas
                nodes={layoutedNodes}
                edges={currentEdges}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            </div>

            <SkillDetailPanel
              selectedNode={selectedNode}
              nodes={layoutedNodes}
              edges={currentEdges}
              onSelectNode={setSelectedNodeId}
              onClose={() => setSelectedNodeId(null)}
            />
          </>
        )}
      </main>
    </div>
  );
}
