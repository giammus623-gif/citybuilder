import { describe, expect, it } from 'vitest';
import { generateMap } from '../src/world/mapgen';
import { Terrain } from '../src/sim/constants';

describe('generateMap', () => {
  it('is deterministic', () => {
    const a = generateMap(123);
    const b = generateMap(123);
    expect(Array.from(a.terrain)).toEqual(Array.from(b.terrain));
    expect(a.startLot).toBe(b.startLot);
  });

  it('has a canal, a highway from the edge and a dry start lot', () => {
    const m = generateMap(99);
    expect(m.terrain.some((t) => t === Terrain.Water)).toBe(true);
    expect(m.entrance % m.size).toBe(0);
    expect(m.terrain[m.startLot]).not.toBe(Terrain.Water);
  });
});
