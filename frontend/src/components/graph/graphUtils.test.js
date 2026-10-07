import { describe, it, expect } from 'vitest';
import {
  filterGraphNodes,
  getStyledEdges,
  getNodeConnections,
} from './graphUtils.js';

describe('graphUtils', () => {
  const sampleNodes = [
    { id: 'python', name: 'Python', category: 'programming' },
    { id: 'statistics', name: 'Statistics', category: 'data-analytics' },
    { id: 'ml-fundamentals', name: 'Machine Learning Fundamentals', category: 'machine-learning' },
    { id: 'docker', name: 'Docker', category: 'devops' },
  ];

  const sampleEdges = [
    { id: 'e1', source: 'python', target: 'statistics', type: 'PREREQUISITE' },
    { id: 'e2', source: 'statistics', target: 'ml-fundamentals', type: 'PREREQUISITE' },
    { id: 'e3', source: 'docker', target: 'ml-fundamentals', type: 'RELATED_TO' },
  ];

  describe('filterGraphNodes (pure function)', () => {
    it('returns all nodes when query is empty or whitespace', () => {
      expect(filterGraphNodes(sampleNodes, '')).toEqual(sampleNodes);
      expect(filterGraphNodes(sampleNodes, '   ')).toEqual(sampleNodes);
      expect(filterGraphNodes(sampleNodes, null)).toEqual(sampleNodes);
    });

    it('filters nodes by partial name case-insensitively', () => {
      const result = filterGraphNodes(sampleNodes, 'stat');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('statistics');
    });

    it('filters nodes by category or id', () => {
      const prog = filterGraphNodes(sampleNodes, 'programming');
      expect(prog).toHaveLength(1);
      expect(prog[0].id).toBe('python');

      const docker = filterGraphNodes(sampleNodes, 'dock');
      expect(docker).toHaveLength(1);
      expect(docker[0].id).toBe('docker');
    });

    it('returns an empty array when no node matches query', () => {
      const none = filterGraphNodes(sampleNodes, 'xyz-nonexistent');
      expect(none).toEqual([]);
    });
  });

  describe('getStyledEdges', () => {
    it('renders normal PREREQUISITE edges with ink arrow markers when nothing is selected', () => {
      const styled = getStyledEdges(sampleEdges, null);
      const prereq = styled.find((e) => e.id === 'e1');
      expect(prereq.style.stroke).toBe('var(--color-ink)');
      expect(prereq.markerEnd).toBeDefined();
    });

    it('renders RELATED_TO edges dashed with muted color and no arrowhead marker', () => {
      const styled = getStyledEdges(sampleEdges, null);
      const related = styled.find((e) => e.id === 'e3');
      expect(related.style.strokeDasharray).toBe('4 4');
      expect(related.markerEnd).toBeUndefined();
    });

    it('highlights prerequisite and unlock edges of selected node in brand violet', () => {
      const styled = getStyledEdges(sampleEdges, 'statistics');
      const incoming = styled.find((e) => e.id === 'e1');
      const outgoing = styled.find((e) => e.id === 'e2');
      const unrelated = styled.find((e) => e.id === 'e3');

      expect(incoming.style.stroke).toBe('var(--color-brand)');
      expect(incoming.style.strokeWidth).toBe(3);
      expect(outgoing.style.stroke).toBe('var(--color-brand)');
      expect(outgoing.style.strokeWidth).toBe(3);
      expect(unrelated.style.opacity).toBe(0.4);
    });
  });

  describe('getNodeConnections', () => {
    it('accurately identifies prerequisite and unlock IDs', () => {
      const { prerequisiteIds, unlockIds } = getNodeConnections(sampleEdges, 'statistics');
      expect(prerequisiteIds).toEqual(['python']);
      expect(unlockIds).toEqual(['ml-fundamentals']);
    });

    it('returns empty lists for empty or invalid nodeId', () => {
      expect(getNodeConnections(sampleEdges, '')).toEqual({
        prerequisiteIds: [],
        unlockIds: [],
      });
    });
  });
});
