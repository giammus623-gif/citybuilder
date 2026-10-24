// Il modello finanziario della Parte 10, ricalcolato con uno script perché
// ogni numero si possa rifare e cambiare. È un calcolo, non una previsione:
// tutto dipende dai contratti firmati, cioè dalle conversazioni fatte.

import { LISTINO, type NomePacchetto } from "./listino.ts";

export interface Ipotesi {
  /** contratti firmati in ciascuno dei 12 mesi */
  contratti: number[];
  mix: Record<NomePacchetto, number>;
  /** abbandono mensile, applicato dal mese indicato */
  abbandono: number;
  abbandonoDalMese: number;
  scontoPrimiContratti: { quanti: number; sconto: number };
  /** quota del setup incassata alla firma; il resto il mese dopo */
  quotaSetupAllaFirma: number;
  /** costo variabile medio per cliente al mese; se null si calcola dal listino e dal mix */
  costoVariabileMedio: number | null;
  /** moltiplicatore dei costi variabili di Pro e Premium (voce e telefonia) */
  fattoreCostoVoce: number;
  /** moltiplicatore dei canoni */
  fattoreCanoni: number;
  accantonamento: number;
  /** soglie dei costi fissi (Parte 5.8): [da clienti, euro al mese] in ordine crescente */
  costiFissi: [number, number][];
  /** su quale numero di clienti si sceglie la soglia dei costi fissi */
  baseCostiFissi: "fine_mese" | "inizio_mese";
}

export const IPOTESI_BASE: Ipotesi = {
  contratti: [0, 2, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3],
  mix: { start: 0.4, pro: 0.45, premium: 0.15 },
  abbandono: 0.03,
  abbandonoDalMese: 4,
  scontoPrimiContratti: { quanti: 3, sconto: 0.5 },
  quotaSetupAllaFirma: 0.5,
  // la Parte 10.1 usa 24,40; dal listino (3/30/65 con mix 40/45/15) viene 24,45
  costoVariabileMedio: 24.4,
  fattoreCostoVoce: 1,
  fattoreCanoni: 1,
  accantonamento: 0.3,
  costiFissi: [
    [0, 85],
    [10, 125],
    [20, 185],
  ],
  baseCostiFissi: "fine_mese",
};

export const SCENARI_CONTRATTI = {
  prudente: [0, 1, 1, 1, 1, 2, 1, 2, 2, 2, 2, 2],
  realistico: [0, 2, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3],
  ottimistico: [0, 2, 2, 3, 3, 4, 4, 4, 5, 5, 4, 4],
} as const;

export interface Mese {
  mese: number;
  nuoviContratti: number;
  clientiFineMese: number;
  ricaviRicorrenti: number;
  setupIncassati: number;
  ricaviTotali: number;
  costiVariabili: number;
  costiFissi: number;
  accantonamento: number;
  utile: number;
  cassaCumulata: number;
}

export interface Risultato {
  mesi: Mese[];
  contrattiTotali: number;
  clientiFineAnno: number;
  /** canoni mensili dei clienti attivi a fine anno */
  ricorrenteARegime: number;
  ricaviAnno: number;
  utileAnno: number;
  setupMedio: number;
  canoneMedio: number;
  costoVariabileMedio: number;
  margineLordoRicorrente: number;
}

const media = (mix: Ipotesi["mix"], campo: "setup" | "canone" | "costoVariabile") =>
  (Object.keys(mix) as NomePacchetto[]).reduce((s, p) => s + mix[p] * LISTINO[p][campo], 0);

export function calcola(ipotesi: Partial<Ipotesi> = {}): Risultato {
  const h: Ipotesi = { ...IPOTESI_BASE, ...ipotesi };
  const setupMedio = media(h.mix, "setup");
  const canoneMedio = media(h.mix, "canone") * h.fattoreCanoni;
  const baseVariabile = h.costoVariabileMedio ?? media(h.mix, "costoVariabile");
  // il raddoppio della voce pesa solo su Pro e Premium: Start non ha assistente
  const quotaVoce = (h.mix.pro * LISTINO.pro.costoVariabile + h.mix.premium * LISTINO.premium.costoVariabile) / media(h.mix, "costoVariabile");
  const costoVariabile = baseVariabile * (1 + (h.fattoreCostoVoce - 1) * quotaVoce);

  let firmatiPrima = 0;
  const setupDelMese: number[] = [];
  for (const n of h.contratti) {
    let totale = 0;
    for (let i = 0; i < n; i++) {
      const scontato = firmatiPrima + i < h.scontoPrimiContratti.quanti;
      totale += setupMedio * (scontato ? 1 - h.scontoPrimiContratti.sconto : 1);
    }
    setupDelMese.push(totale);
    firmatiPrima += n;
  }

  const mesi: Mese[] = [];
  let clienti = 0;
  let cassa = 0;
  h.contratti.forEach((nuovi, i) => {
    const mese = i + 1;
    // il canone parte il mese dopo la firma: paga chi era cliente a fine mese precedente
    const paganti = mese >= h.abbandonoDalMese ? clienti * (1 - h.abbandono) : clienti;
    const fine = paganti + nuovi;
    const ricorrenti = paganti * canoneMedio;
    const setup = h.quotaSetupAllaFirma * setupDelMese[i] + (1 - h.quotaSetupAllaFirma) * (setupDelMese[i - 1] ?? 0);
    const ricavi = ricorrenti + setup;
    const variabili = paganti * costoVariabile;
    const base = h.baseCostiFissi === "fine_mese" ? fine : paganti;
    const fissi = mese === 1 ? 0 : [...h.costiFissi].reverse().find(([da]) => base >= da)![1];
    const accantonato = ricavi * h.accantonamento;
    const utile = ricavi - variabili - fissi - accantonato;
    cassa += utile;
    mesi.push({
      mese,
      nuoviContratti: nuovi,
      clientiFineMese: fine,
      ricaviRicorrenti: ricorrenti,
      setupIncassati: setup,
      ricaviTotali: ricavi,
      costiVariabili: variabili,
      costiFissi: fissi,
      accantonamento: accantonato,
      utile,
      cassaCumulata: cassa,
    });
    clienti = fine;
  });

  return {
    mesi,
    contrattiTotali: h.contratti.reduce((a, b) => a + b, 0),
    clientiFineAnno: clienti,
    ricorrenteARegime: clienti * canoneMedio,
    ricaviAnno: mesi.reduce((s, m) => s + m.ricaviTotali, 0),
    utileAnno: cassa,
    setupMedio,
    canoneMedio,
    costoVariabileMedio: costoVariabile,
    margineLordoRicorrente: (canoneMedio - costoVariabile) / canoneMedio,
  };
}

/** Le righe della tabella di sensibilità della Parte 10.6. */
export function sensibilita(): { nome: string; risultato: Risultato }[] {
  const ritardo = [0, 0, 0, ...IPOTESI_BASE.contratti.slice(1, 10)];
  return [
    { nome: "Scenario di base", risultato: calcola() },
    { nome: "Abbandono al 6% mensile", risultato: calcola({ abbandono: 0.06 }) },
    { nome: "Abbandono al 10% mensile", risultato: calcola({ abbandono: 0.1 }) },
    { nome: "Primo contratto con due mesi di ritardo", risultato: calcola({ contratti: ritardo }) },
    { nome: "Solo clienti del pacchetto Start", risultato: calcola({ mix: { start: 1, pro: 0, premium: 0 }, costoVariabileMedio: null }) },
    { nome: "Solo clienti del pacchetto Pro", risultato: calcola({ mix: { start: 0, pro: 1, premium: 0 }, costoVariabileMedio: null }) },
    { nome: "Metà dei contratti (10 invece di 27)", risultato: calcola({ contratti: [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1] }) },
    { nome: "Canoni ridotti del 20%", risultato: calcola({ fattoreCanoni: 0.8 }) },
    { nome: "Costo di voce e telefonia raddoppiato", risultato: calcola({ fattoreCostoVoce: 2 }) },
    { nome: "Accantonamento al 20% invece del 30%", risultato: calcola({ accantonamento: 0.2 }) },
  ];
}

/** I valori pubblicati nel prompt master, per confrontarli con il calcolo. */
export const RIFERIMENTI_PDF = {
  scenari: {
    prudente: { contratti: 17, clienti: 15, ricorrente: 1664, ricavi: 17139, utile: 9340 },
    realistico: { contratti: 27, clienti: 24, ricorrente: 2634, ricavi: 28217, utile: 15964 },
    ottimistico: { contratti: 40, clienti: 35, ricorrente: 3898, ricavi: 42481, utile: 24515 },
  },
  sensibilita: {
    "Scenario di base": { clienti: 23.8, ricavi: 28217, utile: 15964 },
    "Abbandono al 6% mensile": { clienti: 21.1, ricavi: 27078, utile: 15479 },
    "Abbandono al 10% mensile": { clienti: 18.1, ricavi: 25753, utile: 14844 },
    "Primo contratto con due mesi di ritardo": { clienti: 19.0, ricavi: 19655, utile: 11083 },
    "Solo clienti del pacchetto Start": { clienti: 23.8, ricavi: 12076, utile: 6905 },
    "Solo clienti del pacchetto Pro": { clienti: 23.8, ricavi: 32428, utile: 18333 },
    "Metà dei contratti (10 invece di 27)": { clienti: 8.8, ricavi: 10128, utile: 5104 },
    "Canoni ridotti del 20%": { clienti: 23.8, ricavi: 25909, utile: 14349 },
    "Costo di voce e telefonia raddoppiato": { clienti: 23.8, ricavi: 28217, utile: 13537 },
    "Accantonamento al 20% invece del 30%": { clienti: 23.8, ricavi: 28217, utile: 18786 },
  } as Record<string, { clienti: number; ricavi: number; utile: number }>,
  /** tabella 10.5, scenario realistico: [ricavi totali, costi fissi, utile, cassa] */
  flussoRealistico: [
    [0, 0, 0, 0],
    [348, 85, 158, 158],
    [742, 85, 386, 544],
    [1190, 85, 677, 1221],
    [1916, 85, 1140, 2361],
    [2115, 85, 1235, 3596],
    [2655, 125, 1530, 5126],
    [3297, 125, 1914, 7041],
    [3582, 125, 2051, 9092],
    [3858, 125, 2183, 11275],
    [4127, 125, 2312, 13587],
    [4387, 185, 2377, 15964],
  ],
};
