// Stampa il modello finanziario e lo confronta con i numeri del prompt master.
//   npm run modello
//   npm run modello -- --contratti 0,1,1,2,2,2,2,3,3,3,3,3 --abbandono 0.04

import { calcola, RIFERIMENTI_PDF, SCENARI_CONTRATTI, sensibilita, type Ipotesi } from "../src/modello/modello-finanziario.ts";

const argomenti = process.argv.slice(2);
const valore = (nome: string) => {
  const i = argomenti.indexOf(`--${nome}`);
  return i >= 0 ? argomenti[i + 1] : undefined;
};

const euro = (n: number) => Math.round(n).toLocaleString("it-IT");
const riga = (celle: (string | number)[], larghezze: number[]) =>
  celle.map((c, i) => (i === 0 ? String(c).padEnd(larghezze[i]) : String(c).padStart(larghezze[i]))).join("  ");
const scarto = (calcolato: number, pdf: number, tolleranza: number) =>
  Math.abs(calcolato - pdf) <= tolleranza ? "uguale" : `DIFFERENZA ${calcolato > pdf ? "+" : ""}${euro(calcolato - pdf)}`;

const personalizzato: Partial<Ipotesi> = {};
if (valore("contratti")) personalizzato.contratti = valore("contratti")!.split(",").map(Number);
if (valore("abbandono")) personalizzato.abbandono = Number(valore("abbandono"));
if (valore("accantonamento")) personalizzato.accantonamento = Number(valore("accantonamento"));

if (Object.keys(personalizzato).length) {
  const r = calcola(personalizzato);
  console.log("Scenario personalizzato");
  console.log(riga(["Mese", "Nuovi", "Clienti", "Ricavi", "Utile", "Cassa"], [6, 6, 8, 9, 9, 9]));
  for (const m of r.mesi) console.log(riga([m.mese, m.nuoviContratti, m.clientiFineMese.toFixed(1), euro(m.ricaviTotali), euro(m.utile), euro(m.cassaCumulata)], [6, 6, 8, 9, 9, 9]));
  console.log(`\nRicavi anno ${euro(r.ricaviAnno)} · utile disponibile ${euro(r.utileAnno)} · ricorrente a regime ${euro(r.ricorrenteARegime)} al mese`);
  process.exit(0);
}

const base = calcola();
console.log(`Setup medio ${base.setupMedio.toFixed(2)} €, canone medio ${base.canoneMedio.toFixed(2)} €, costo variabile ${base.costoVariabileMedio.toFixed(2)} €, margine lordo ${(base.margineLordoRicorrente * 100).toFixed(1)}%\n`);

console.log("Flusso di cassa, scenario realistico (Parte 10.5)");
const L = [5, 6, 8, 10, 9, 10, 10, 7, 13, 8, 9];
console.log(riga(["Mese", "Nuovi", "Clienti", "Ricorrenti", "Setup", "Ricavi", "Variabili", "Fissi", "Accantonam.", "Utile", "Cassa"], L));
base.mesi.forEach((m, i) => {
  const [ricaviPdf, fissiPdf, utilePdf] = RIFERIMENTI_PDF.flussoRealistico[i];
  const nota = Math.abs(m.ricaviTotali - ricaviPdf) > 1 || m.costiFissi !== fissiPdf || Math.abs(m.utile - utilePdf) > 1.5 ? `  <- PDF: fissi ${fissiPdf}, utile ${utilePdf}` : "";
  console.log(
    riga([m.mese, m.nuoviContratti, m.clientiFineMese.toFixed(1), euro(m.ricaviRicorrenti), euro(m.setupIncassati), euro(m.ricaviTotali), euro(m.costiVariabili), m.costiFissi, euro(m.accantonamento), euro(m.utile), euro(m.cassaCumulata)], L) + nota,
  );
});

console.log("\nTre scenari (Parte 1.3)");
for (const [nome, contratti] of Object.entries(SCENARI_CONTRATTI)) {
  const r = calcola({ contratti: [...contratti] });
  const pdf = RIFERIMENTI_PDF.scenari[nome as keyof typeof RIFERIMENTI_PDF.scenari];
  console.log(
    `${nome.padEnd(12)} contratti ${r.contrattiTotali}, clienti ${r.clientiFineAnno.toFixed(1)}, ricorrente ${euro(r.ricorrenteARegime)}, ricavi ${euro(r.ricaviAnno)} (${scarto(r.ricaviAnno, pdf.ricavi, 2)}), utile ${euro(r.utileAnno)} (${scarto(r.utileAnno, pdf.utile, 2)})`,
  );
}

console.log("\nSensibilità (Parte 10.6)");
for (const { nome, risultato: r } of sensibilita()) {
  const pdf = RIFERIMENTI_PDF.sensibilita[nome];
  console.log(`${nome.padEnd(42)} clienti ${r.clientiFineAnno.toFixed(1).padStart(5)}  ricavi ${euro(r.ricaviAnno).padStart(7)} (${scarto(r.ricaviAnno, pdf.ricavi, 2)})  utile ${euro(r.utileAnno).padStart(7)} (${scarto(r.utileAnno, pdf.utile, 2)})`);
}
