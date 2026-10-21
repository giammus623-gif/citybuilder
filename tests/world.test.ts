import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { TICKS_PER_DAY, TileUse } from '../src/sim/constants';
import { referenceCommands } from '../tools/scenario';

function run(seed: number, days: number): World {
  const w = new World(seed, 'pizzeria');
  for (const c of referenceCommands(w)) w.apply(c);
  for (let i = 0; i < days * TICKS_PER_DAY; i++) w.step();
  return w;
}

describe('World', () => {
  it('starts from a single lot next to the highway', () => {
    const w = new World(5, 'bar');
    const built = Array.from(w.use).filter((u) => u === TileUse.Building).length;
    expect(built).toBe(1);
    expect(w.findAccess(w.business.tile)).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic: same seed and commands give the same hash', () => {
    expect(run(11, 1).hash()).toBe(run(11, 1).hash());
  });

  it('grows a city from roads and zones', () => {
    const w = run(21, 2);
    expect(w.pop).toBeGreaterThan(40);
    expect(w.employed).toBeGreaterThan(10);
    expect(Number.isFinite(w.money)).toBe(true);
    expect(w.ledger.length).toBe(2);
  });

  it('undo restores tiles and refunds money', () => {
    const w = new World(3, 'bar');
    const before = w.money;
    const cmd = referenceCommands(w)[1];
    w.apply(cmd);
    expect(w.money).toBeLessThan(before);
    w.apply({ t: 'undo' });
    expect(w.money).toBe(before);
    w.apply({ t: 'redo' });
    expect(w.money).toBeLessThan(before);
  });

  it('survives a save and load', () => {
    const w = run(8, 1);
    const save = w.serialize();
    const l = World.deserialize(save);
    expect(l.pop).toBe(w.pop);
    expect(l.tick).toBe(w.tick);
    for (let i = 0; i < 2000; i++) l.step();
    expect(l.pop).toBeGreaterThan(0);
  });
});
