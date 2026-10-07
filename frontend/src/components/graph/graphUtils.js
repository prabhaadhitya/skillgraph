import { MarkerType } from '@xyflow/react';

/**
 * Computes edge styling based on the currently selected node and edge type.
 * PREREQUISITE: 2px solid ink with arrowhead; brand violet when highlighted.
 * RELATED_TO: 1.5px dashed muted grey with no arrowhead.
 *
 * @param {Array<object>} edges - Base edges
 * @param {string | null} selectedNodeId - ID of the selected node
 * @returns {Array<object>} Styled edges
 */
export function getStyledEdges(edges = [], selectedNodeId = null) {
  return edges.map((edge) => {
    const isRelated =
      edge.type === 'RELATED_TO' || edge.type === 'RELATED' || edge.type === 'related_to';
    const isPrerequisite = selectedNodeId && edge.target === selectedNodeId;
    const isUnlock = selectedNodeId && edge.source === selectedNodeId;
    const isConnected = selectedNodeId && (isPrerequisite || isUnlock);

    if (isRelated) {
      return {
        ...edge,
        animated: false,
        style: {
          stroke: isConnected ? 'var(--color-brand)' : 'var(--color-muted)',
          strokeWidth: isConnected ? 2 : 1.5,
          strokeDasharray: '4 4',
          opacity: selectedNodeId ? (isConnected ? 1 : 0.4) : 0.8,
        },
        markerEnd: undefined,
      };
    }

    if (!selectedNodeId) {
      return {
        ...edge,
        animated: false,
        style: {
          stroke: 'var(--color-ink)',
          strokeWidth: 2,
          opacity: 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--color-ink)',
          width: 16,
          height: 16,
        },
      };
    }

    if (isConnected) {
      return {
        ...edge,
        animated: true,
        style: {
          stroke: 'var(--color-brand)',
          strokeWidth: 3,
          opacity: 1,
          zIndex: 10,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--color-brand)',
          width: 18,
          height: 18,
        },
      };
    }

    return {
      ...edge,
      animated: false,
      style: {
        stroke: 'var(--color-ink)',
        strokeWidth: 2,
        opacity: 0.4,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'var(--color-ink)',
        width: 14,
        height: 14,
      },
    };
  });
}

/**
 * Returns direct prerequisite and unlock IDs for a given node.
 *
 * @param {Array<object>} edges
 * @param {string} nodeId
 * @returns {{ prerequisiteIds: string[], unlockIds: string[] }}
 */
export function getNodeConnections(edges = [], nodeId = '') {
  if (!nodeId) return { prerequisiteIds: [], unlockIds: [] };

  const prerequisiteIds = [];
  const unlockIds = [];

  for (const edge of edges) {
    if (edge.type === 'PREREQUISITE' || !edge.type) {
      if (edge.target === nodeId) {
        prerequisiteIds.push(edge.source);
      }
      if (edge.source === nodeId) {
        unlockIds.push(edge.target);
      }
    }
  }

  return { prerequisiteIds, unlockIds };
}

/**
 * Pure function to filter graph nodes based on a search term.
 * Matches name, slug, or category case-insensitively.
 *
 * @param {Array<object>} nodes
 * @param {string} query
 * @returns {Array<object>}
 */
export function filterGraphNodes(nodes = [], query = '') {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return nodes;
  }
  const normalized = query.trim().toLowerCase();
  return nodes.filter((node) => {
    const name = (node.name || '').toLowerCase();
    const slug = (node.slug || node.id || '').toLowerCase();
    const category = (node.category || '').toLowerCase();
    return name.includes(normalized) || slug.includes(normalized) || category.includes(normalized);
  });
}

export default {
  getStyledEdges,
  getNodeConnections,
  filterGraphNodes,
};
