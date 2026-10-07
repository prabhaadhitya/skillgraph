import { describe, it, expect } from 'vitest';
import { layoutGraph } from './layout.js';

describe('Graph Layout (layoutGraph)', () => {
  it('positions a prerequisite strictly to the LEFT of its dependent in LR layout', () => {
    const nodes = [
      { id: 'skill-a', data: { name: 'Skill A' } },
      { id: 'skill-b', data: { name: 'Skill B' } },
      { id: 'skill-c', data: { name: 'Skill C' } },
    ];

    // skill-a is prerequisite of skill-b, skill-b is prerequisite of skill-c
    const edges = [
      { id: 'e1', source: 'skill-a', target: 'skill-b' },
      { id: 'e2', source: 'skill-b', target: 'skill-c' },
    ];

    const layoutedNodes = layoutGraph(nodes, edges);

    expect(layoutedNodes).toHaveLength(3);

    const nodeA = layoutedNodes.find((n) => n.id === 'skill-a');
    const nodeB = layoutedNodes.find((n) => n.id === 'skill-b');
    const nodeC = layoutedNodes.find((n) => n.id === 'skill-c');

    expect(nodeA.position).toBeDefined();
    expect(nodeB.position).toBeDefined();
    expect(nodeC.position).toBeDefined();

    // Verify prerequisite A is to the LEFT of dependent B (nodeA.x < nodeB.x)
    expect(nodeA.position.x).toBeLessThan(nodeB.position.x);

    // Verify prerequisite B is to the LEFT of dependent C (nodeB.x < nodeC.x)
    expect(nodeB.position.x).toBeLessThan(nodeC.position.x);
  });
});
