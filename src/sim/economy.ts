import type { Archetype } from '../data/archetypes';

/** Investment bands and their payback target in game days (Part 6.2). */
export const BANDS = [
  { id: 'micro', nome: 'Micro', max: 5000, rientroGiorni: 0.5 },
  { id: 'piccola', nome: 'Piccola', max: 50000, rientroGiorni: 1 },
  { id: 'media', nome: 'Media', max: 500000, rientroGiorni: 2.5 },
  { id: 'grande', nome: 'Grande', max: 5000000, rientroGiorni: 6 },
  { id: 'enorme', nome: 'Enorme', max: Infinity, rientroGiorni: 12 },
] as const;

export type Band = (typeof BANDS)[number];

export function bandFor(investment: number): Band {
  return BANDS.find((b) => investment <= b.max) ?? BANDS[BANDS.length - 1];
}

export const SALARY_PER_DAY = 80;
/** Catchment (people reachable) at which a business sells its reference volume. */
export const REFERENCE_CATCHMENT = 300;

/**
 * Customers per day at the reference catchment, calibrated so the business pays
 * back exactly on its band's target. This is the single payback curve.
 */
export function referenceCustomers(a: Archetype): number {
  const target = bandFor(a.investimento).rientroGiorni;
  const dailyProfit = a.investimento / target;
  const fixed = a.costiFissiGiorno + a.posti * SALARY_PER_DAY;
  return (dailyProfit + fixed) / (a.scontrino * a.margine);
}

/** Demand multiplier from catchment: 0.25 with nobody around, 1 at reference, capped at 1.5. */
export function demandFactor(catchment: number): number {
  return Math.min(1.5, 0.25 + 0.75 * (catchment / REFERENCE_CATCHMENT));
}

/**
 * Same-area crowding (Part 6.3, shared lane): each competing shop nearby takes a
 * share of customers, weighted by how much the archetype depends on footfall.
 */
export function crowdingFactor(a: Archetype, competitors: number): number {
  return 1 / (1 + 0.15 * competitors * a.passaggio);
}

export interface DayResult {
  clienti: number;
  entrate: number;
  uscite: number;
  profitto: number;
}

export function businessDay(a: Archetype, catchment: number, competitors: number, staffRatio: number): DayResult {
  const clienti = Math.round(
    referenceCustomers(a) * demandFactor(catchment) * crowdingFactor(a, competitors) * (0.4 + 0.6 * staffRatio),
  );
  const entrate = clienti * a.scontrino;
  const uscite = Math.round(entrate * (1 - a.margine) + a.costiFissiGiorno + a.posti * SALARY_PER_DAY);
  return { clienti, entrate, uscite, profitto: entrate - uscite };
}

export function paybackDays(a: Archetype, catchment: number, competitors: number): number {
  const d = businessDay(a, catchment, competitors, 1);
  return d.profitto > 0 ? a.investimento / d.profitto : Infinity;
}
