import { describe, expect, it } from 'vitest';
import { Rng, hashString } from '../src/sim/rng';

describe('Rng', () => {
  it('is deterministic for the same seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it('stays in range', () => {
    const r = new Rng(7);
    for (let i = 0; i < 10000; i++) {
      const v = r.int(3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it('can restore its state', () => {
    const r = new Rng(1);
    r.next();
    const s = r.state;
    const v = r.next();
    r.state = s;
    expect(r.next()).toBe(v);
  });

  it('hashes strings stably', () => {
    expect(hashString('city lab')).toBe(hashString('city lab'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
