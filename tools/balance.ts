/**
 * Headless run: plays the reference layout for N days with several seeds and prints
 * the numbers that matter. Usage: npx vite-node tools/balance.ts [days] [seeds]
 */
import { World } from '../src/sim/world';
import { TICKS_PER_DAY } from '../src/sim/constants';
import { referenceCommands } from './scenario';

const days = Number(process.argv[2] ?? 3);
const seeds = Number(process.argv[3] ?? 3);
for (let s = 1; s <= seeds; s++) {
  const w = new World(s * 7919, 'pizzeria');
  for (const c of referenceCommands(w)) w.apply(c);
  const t0 = performance.now();
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < TICKS_PER_DAY; i++) w.step();
    const l = w.ledger[w.ledger.length - 1];
    let bld = 0;
    for (let id = 0; id < w.b.count; id++) if (w.b.alive[id]) bld++;
    console.log(
      `seed ${s} giorno ${d + 1}: pop ${w.pop} lavoro ${w.employed}/${w.jobs} edifici ${bld} felicità ${w.happiness} ` +
        `domanda R${w.demand.r.toFixed(2)} C${w.demand.c.toFixed(2)} I${w.demand.i.toFixed(2)} ` +
        `soldi ${Math.round(w.money)} saldo ${Math.round(l.saldo)} (tasse ${l.tasse}, business ${l.business}) bacino ${w.business.bacino}`,
    );
  }
  const ms = (performance.now() - t0) / (days * TICKS_PER_DAY);
  console.log(`  tick medio ${ms.toFixed(3)} ms`);
}
