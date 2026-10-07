import dagre from '@dagrejs/dagre';

export const NODE_WIDTH = 168;
export const NODE_HEIGHT = 64;

/**
 * Computes Left-to-Right DAG layout for React Flow nodes using Dagre.
 *
 * @param {Array<object>} nodes - React Flow node definitions
 * @param {Array<object>} edges - Edge connections (source -> target)
 * @param {object} [options]
 * @param {string} [options.rankdir='LR'] - Layout direction
 * @param {number} [options.nodesep=40] - Node separation in px
 * @param {number} [options.ranksep=90] - Rank separation in px
 * @returns {Array<object>} Nodes with computed positions
 */
export function layoutGraph(nodes, edges, options = {}) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: options.rankdir || 'LR',
    nodesep: options.nodesep || 40,
    ranksep: options.ranksep || 90,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      // Convert center-based dagre coords to top-left coords for React Flow
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      initialWidth: NODE_WIDTH,
      initialHeight: NODE_HEIGHT,
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      data: {
        id: node.id,
        name: node.name,
        state: node.state,
        proficiency: node.proficiency,
        requiredLevel: node.requiredLevel,
        category: node.category,
        difficulty: node.difficulty,
        importance: node.importance,
        isReadyNow: node.isReadyNow,
        ...(node.data || {}),
      },
    };
  });

  // Support both array usage and destructuring { nodes, edges }
  layoutedNodes.nodes = layoutedNodes;
  layoutedNodes.edges = edges;

  return layoutedNodes;
}

export default layoutGraph;
