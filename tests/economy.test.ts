import { describe, expect, it } from 'vitest';
import { ARCHETYPES, classify } from '../src/data/archetypes';
import { REFERENCE_CATCHMENT, bandFor, paybackDays } from '../src/sim/economy';

describe('classify', () => {
  it('maps free descriptions to archetypes', () => {
    expect(classify('una pizzeria al taglio vicino alla stazione').id).toBe('pizzeria');
    expect(classify("un'officina di bici elettriche").id).toBe('bici');
    expect(classify('una fattoria biologica con spaccio').id).toBe('fattoria');
    expect(classify('qualcosa di strano').id).toBe('bottega');
  });
});

describe('payback curve (Part 6.2)', () => {
  // Two reference configurations: the reference catchment, and a busier street
  // with one competitor. Both must stay within 25% of the band target.
  for (const a of ARCHETYPES) {
    it(`${a.id} pays back within 25% of its band target`, () => {
      const target = bandFor(a.investimento).rientroGiorni;
      const ref = paybackDays(a, REFERENCE_CATCHMENT, 0);
      expect(Math.abs(ref - target) / target).toBeLessThanOrEqual(0.25);
      const busy = paybackDays(a, REFERENCE_CATCHMENT * 1.1, 1);
      expect(Math.abs(busy - target) / target).toBeLessThanOrEqual(0.25);
    });
  }
});
