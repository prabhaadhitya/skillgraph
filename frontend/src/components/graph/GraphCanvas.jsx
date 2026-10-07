import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  SmoothStepEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SkillNode } from './SkillNode.jsx';
import { Legend } from './Legend.jsx';
import { getStyledEdges } from './graphUtils.js';

const nodeTypes = {
  skill: SkillNode,
};

const edgeTypes = {
  PREREQUISITE: SmoothStepEdge,
  prerequisite: SmoothStepEdge,
  smoothstep: SmoothStepEdge,
  default: SmoothStepEdge,
};

/**
 * Interactive React Flow canvas for the SkillGraph.
 * Provides LR layout, pan/zoom, edge highlighting, and node selection.
 *
 * @param {object} props
 * @param {Array<object>} props.nodes - Nodes with positions
 * @param {Array<object>} props.edges - Graph edges
 * @param {string | null} [props.selectedNodeId=null] - Currently selected node ID
 * @param {(nodeId: string | null) => void} props.onSelectNode - Selection change handler
 * @param {string} [props.className=''] - Additional class names
 */
export function GraphCanvas({
  nodes = [],
  edges = [],
  selectedNodeId = null,
  onSelectNode,
  className = '',
}) {
  // Sync React Flow's node.selected property with selectedNodeId
  const displayNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      type: 'skill',
      width: 168,
      height: 64,
      style: { width: 168, height: 64 },
      selected: node.id === selectedNodeId,
      data: node.data || {
        id: node.id,
        name: node.name,
        state: node.state,
        proficiency: node.proficiency,
        requiredLevel: node.requiredLevel,
        category: node.category,
        difficulty: node.difficulty,
        importance: node.importance,
        isReadyNow: node.isReadyNow,
      },
    }));
  }, [nodes, selectedNodeId]);

  // Compute highlighted vs faded edges
  const displayEdges = useMemo(() => {
    return getStyledEdges(edges, selectedNodeId);
  }, [edges, selectedNodeId]);

  const handleNodeClick = (_, node) => {
    onSelectNode?.(node.id);
  };

  const handlePaneClick = () => {
    onSelectNode?.(null);
  };

  return (
    <div className={`relative w-full h-full min-h-[500px] flex-1 bg-paper overflow-hidden ${className}`}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        style={{ width: '100%', height: '100%' }}
        className="w-full h-full"
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#111111"
          style={{ opacity: 0.2 }}
        />
        <Controls
          showInteractive={false}
          className="!bg-surface !border-2 !border-ink !rounded-none !shadow-md"
        />
      </ReactFlow>

      {/* Legend positioned bottom-left */}
      <Legend className="absolute bottom-6 left-6 z-10" />
    </div>
  );
}

export default GraphCanvas;
