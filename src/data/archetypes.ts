/**
 * Business archetypes the player can start from (Part 5.2). Without an API key the
 * description is mapped to one of these with a keyword classifier.
 */
export interface Archetype {
  id: string;
  nome: string;
  settore: string;
  parole: readonly string[];
  investimento: number;
  posti: number;
  /** Average ticket per customer. */
  scontrino: number;
  /** Gross margin, 0..1. */
  margine: number;
  costiFissiGiorno: number;
  /** How much the business depends on people walking by, 0..1. */
  passaggio: number;
  rischioFurti: number;
  orari: readonly [number, number];
}

export const ARCHETYPES: readonly Archetype[] = [
  { id: 'pizzeria', nome: 'Pizzeria al taglio', settore: 'Ristorazione', parole: ['pizz', 'taglio', 'focacc'], investimento: 40000, posti: 4, scontrino: 9, margine: 0.65, costiFissiGiorno: 900, passaggio: 0.8, rischioFurti: 0.4, orari: [11, 23] },
  { id: 'bar', nome: 'Bar caffetteria', settore: 'Ristorazione', parole: ['bar', 'caff', 'colazion', 'aperitiv'], investimento: 25000, posti: 3, scontrino: 4, margine: 0.7, costiFissiGiorno: 500, passaggio: 0.9, rischioFurti: 0.3, orari: [6, 21] },
  { id: 'forno', nome: 'Forno e pasticceria', settore: 'Alimentari', parole: ['forno', 'panett', 'pane', 'pasticc', 'dolc'], investimento: 35000, posti: 4, scontrino: 6, margine: 0.6, costiFissiGiorno: 700, passaggio: 0.7, rischioFurti: 0.3, orari: [6, 19] },
  { id: 'bici', nome: 'Officina di bici elettriche', settore: 'Mobilità', parole: ['bici', 'cicl', 'e-bike', 'ebike', 'monopatt', 'elettric'], investimento: 60000, posti: 3, scontrino: 120, margine: 0.4, costiFissiGiorno: 600, passaggio: 0.4, rischioFurti: 0.6, orari: [9, 19] },
  { id: 'officina', nome: 'Officina auto', settore: 'Mobilità', parole: ['officina', 'meccanic', 'auto', 'gomm', 'carrozz'], investimento: 150000, posti: 6, scontrino: 250, margine: 0.45, costiFissiGiorno: 1500, passaggio: 0.2, rischioFurti: 0.4, orari: [8, 18] },
  { id: 'fattoria', nome: 'Fattoria biologica con spaccio', settore: 'Agricoltura', parole: ['fattoria', 'agricol', 'bio', 'orto', 'spaccio', 'campo'], investimento: 220000, posti: 6, scontrino: 25, margine: 0.5, costiFissiGiorno: 1200, passaggio: 0.2, rischioFurti: 0.3, orari: [7, 19] },
  { id: 'palestra', nome: 'Palestra di quartiere', settore: 'Benessere', parole: ['palestra', 'fitness', 'crossfit', 'yoga', 'sport'], investimento: 180000, posti: 5, scontrino: 35, margine: 0.75, costiFissiGiorno: 1400, passaggio: 0.3, rischioFurti: 0.2, orari: [7, 22] },
  { id: 'foodtruck', nome: 'Food truck', settore: 'Ristorazione', parole: ['truck', 'carrett', 'street food', 'panin', 'ambulant'], investimento: 4500, posti: 1, scontrino: 8, margine: 0.6, costiFissiGiorno: 120, passaggio: 1, rischioFurti: 0.3, orari: [11, 22] },
  { id: 'hotel', nome: 'Hotel', settore: 'Turismo', parole: ['hotel', 'albergo', 'b&b', 'ostello', 'pension'], investimento: 1200000, posti: 20, scontrino: 110, margine: 0.7, costiFissiGiorno: 9000, passaggio: 0.3, rischioFurti: 0.3, orari: [0, 24] },
  { id: 'online', nome: 'Negozio online', settore: 'Commercio', parole: ['online', 'e-commerce', 'ecommerce', 'sito', 'shop'], investimento: 20000, posti: 2, scontrino: 45, margine: 0.35, costiFissiGiorno: 300, passaggio: 0.1, rischioFurti: 0.1, orari: [0, 24] },
  { id: 'dentista', nome: 'Studio dentistico', settore: 'Salute', parole: ['dentist', 'denti', 'studio medic', 'clinica', 'ambulator'], investimento: 300000, posti: 5, scontrino: 140, margine: 0.6, costiFissiGiorno: 2200, passaggio: 0.2, rischioFurti: 0.2, orari: [9, 19] },
  { id: 'parrucchiere', nome: 'Parrucchiere', settore: 'Benessere', parole: ['parrucch', 'barbier', 'estetic', 'capell', 'unghie'], investimento: 30000, posti: 3, scontrino: 28, margine: 0.7, costiFissiGiorno: 500, passaggio: 0.5, rischioFurti: 0.2, orari: [9, 19] },
  { id: 'libreria', nome: 'Libreria', settore: 'Cultura', parole: ['libr', 'fumett', 'cartoler', 'vinil', 'dischi'], investimento: 45000, posti: 3, scontrino: 18, margine: 0.4, costiFissiGiorno: 600, passaggio: 0.6, rischioFurti: 0.2, orari: [9, 20] },
  { id: 'bottega', nome: 'Bottega di quartiere', settore: 'Commercio', parole: [], investimento: 30000, posti: 3, scontrino: 15, margine: 0.45, costiFissiGiorno: 500, passaggio: 0.6, rischioFurti: 0.3, orari: [9, 20] },
];

export const SUGGERIMENTI = ['pizzeria', 'officina di bici', 'fattoria', 'palestra', 'negozio online', 'studio dentistico', 'food truck', 'bar', 'hotel'];

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Keyword classifier: the archetype with most keyword hits, ties go to the first listed. */
export function classify(description: string): Archetype {
  const text = normalize(description);
  let best = ARCHETYPES[ARCHETYPES.length - 1];
  let bestScore = 0;
  for (const a of ARCHETYPES) {
    let score = 0;
    for (const p of a.parole) if (text.includes(p)) score += p.length;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

export function archetypeById(id: string): Archetype {
  return ARCHETYPES.find((a) => a.id === id) ?? ARCHETYPES[ARCHETYPES.length - 1];
}
