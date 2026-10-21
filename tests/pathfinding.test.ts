import { describe, expect, it } from 'vitest';
import { RoadGraph } from '../src/sim/pathfinding';

describe('RoadGraph', () => {
  const size = 8;
  const roads = new Set<number>();
  // An L-shaped road: row 1 from x=0..5, then column 5 down to y=6.
  for (let x = 0; x <= 5; x++) roads.add(1 * size + x);
  for (let y = 1; y <= 6; y++) roads.add(y * size + 5);
  roads.add(7 * size + 0); // isolated tile
  const g = new RoadGraph(size, (i) => roads.has(i));
  g.rebuild();

  it('finds the shortest path', () => {
    const p = g.path(1 * size + 0, 6 * size + 5);
    expect(p).not.toBeNull();
    expect(p!.length).toBe(6 + 6 - 1);
    expect(p![0]).toBe(8);
    expect(p![p!.length - 1]).toBe(53);
  });

  it('knows about disconnected pieces', () => {
    expect(g.connected(8, 7 * size)).toBe(false);
    expect(g.path(8, 7 * size)).toBeNull();
  });
});
