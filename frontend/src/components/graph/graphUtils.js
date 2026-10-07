import { MarkerType } from '@xyflow/react';

/**
 * Computes edge styling based on the currently selected node.
 * Highlights prerequisite and unlock edges in brand violet; fades others to 40% opacity.
 *
 * @param {Array<object>} edges - Base edges
 * @param {string | null} selectedNodeId - ID of the selected node
 * @returns {Array<object>} Styled edges
 */
export function getStyledEdges(edges = [], selectedNodeId = null) {
  return edges.map((edge) => {
    const isPrerequisite = selectedNodeId && edge.target === selectedNodeId;
    const isUnlock = selectedNodeId && edge.source === selectedNodeId;
    const isConnected = isPrerequisite || isUnlock;

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
