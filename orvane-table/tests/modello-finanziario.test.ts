import { describe, expect, it } from "vitest";
import { calcola, RIFERIMENTI_PDF, SCENARI_CONTRATTI, sensibilita } from "../src/modello/modello-finanziario.ts";
import { LISTINO, setupScontato } from "../src/modello/listino.ts";

describe("modello finanziario (Parte 10)", () => {
  it("riproduce le medie ponderate del listino", () => {
    const r = calcola();
    expect(r.setupMedio).toBeCloseTo(695, 6);
    expect(r.canoneMedio).toBeCloseTo(110.5, 6);
    expect(r.costoVariabileMedio).toBeCloseTo(24.4, 6);
    expect(r.margineLordoRicorrente).toBeCloseTo(0.779, 3);
    // dal listino il costo variabile medio sarebbe 24,45: il PDF usa 24,40
    expect(calcola({ costoVariabileMedio: null }).costoVariabileMedio).toBeCloseTo(24.45, 6);
  });

  it("riproduce il flusso di cassa realistico mese per mese fino al mese 10", () => {
    const r = calcola();
    r.mesi.slice(0, 10).forEach((m, i) => {
      const [ricavi, fissi, utile, cassa] = RIFERIMENTI_PDF.flussoRealistico[i];
      expect(Math.abs(m.ricaviTotali - ricavi), `ricavi mese ${m.mese}`).toBeLessThanOrEqual(1);
      expect(m.costiFissi, `fissi mese ${m.mese}`).toBe(fissi);
      expect(Math.abs(m.utile - utile), `utile mese ${m.mese}`).toBeLessThanOrEqual(1.5);
      expect(Math.abs(m.cassaCumulata - cassa), `cassa mese ${m.mese}`).toBeLessThanOrEqual(5);
    });
  });

  it("al mese 11 applica la soglia dei 20 clienti scritta nel testo, a differenza della tabella del PDF", () => {
    const m11 = calcola().mesi[10];
    expect(m11.clientiFineMese).toBeGreaterThan(20);
    expect(m11.costiFissi).toBe(185);
    expect(RIFERIMENTI_PDF.flussoRealistico[10][1]).toBe(125);
  });

  it("riproduce esattamente i ricavi dei tre scenari e di tutta la tabella di sensibilità", () => {
    for (const [nome, contratti] of Object.entries(SCENARI_CONTRATTI)) {
      const r = calcola({ contratti: [...contratti] });
      const pdf = RIFERIMENTI_PDF.scenari[nome as keyof typeof RIFERIMENTI_PDF.scenari];
      expect(r.contrattiTotali).toBe(pdf.contratti);
      expect(Math.abs(r.ricaviAnno - pdf.ricavi), nome).toBeLessThanOrEqual(1);
      expect(Math.abs(r.ricorrenteARegime - pdf.ricorrente), nome).toBeLessThanOrEqual(1);
      expect(Math.round(r.clientiFineAnno)).toBe(pdf.clienti);
    }
    for (const { nome, risultato } of sensibilita()) {
      const pdf = RIFERIMENTI_PDF.sensibilita[nome];
      expect(Math.abs(risultato.ricaviAnno - pdf.ricavi), nome).toBeLessThanOrEqual(1);
      expect(Math.abs(risultato.clientiFineAnno - pdf.clienti), nome).toBeLessThanOrEqual(0.06);
    }
  });

  it("resta entro l'1% (al massimo 72 euro) dall'utile pubblicato in ogni caso", () => {
    const casi = [
      ...Object.entries(SCENARI_CONTRATTI).map(([n, c]) => [calcola({ contratti: [...c] }).utileAnno, RIFERIMENTI_PDF.scenari[n as keyof typeof RIFERIMENTI_PDF.scenari].utile] as const),
      ...sensibilita().map(({ nome, risultato }) => [risultato.utileAnno, RIFERIMENTI_PDF.sensibilita[nome].utile] as const),
    ];
    for (const [calcolato, pdf] of casi) {
      expect(Math.abs(calcolato - pdf) / pdf).toBeLessThan(0.01);
      expect(Math.abs(calcolato - pdf)).toBeLessThan(75);
    }
  });

  it("applica lo sconto dei clienti fondatori solo ai primi tre contratti", () => {
    expect(setupScontato("pro", true)).toBe(395);
    expect(setupScontato("pro", false)).toBe(LISTINO.pro.setup);
    const r = calcola({ contratti: [0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    // 3 contratti scontati e 1 pieno: (3 x 347,5 + 695) / 2 alla firma
    expect(r.mesi[1].setupIncassati).toBeCloseTo((3 * 347.5 + 695) / 2, 6);
  });
});
