// Listino della Parte 4: unica fonte dei prezzi per proposte, preventivi e
// modello finanziario. Prezzi indicativi al netto di IVA, da validare nelle
// prime dieci conversazioni (Parte 4.6): il canone non si abbassa mai.

export type NomePacchetto = "start" | "pro" | "premium";

export interface Pacchetto {
  nome: string;
  setup: number;
  canone: number;
  /** voce, telefonia, messaggi, modello linguistico: stima della Parte 4.2 */
  costoVariabile: number;
  minutiInclusi: number;
  oreAttivazione: number;
  supporto: string;
  incluso: string[];
}

export const LISTINO: Record<NomePacchetto, Pacchetto> = {
  start: {
    nome: "Table Start",
    setup: 290,
    canone: 49,
    costoVariabile: 3,
    minutiInclusi: 0,
    oreAttivazione: 6,
    supporto: "email, risposta entro 2 giorni lavorativi",
    incluso: ["sito multipagina con menu e foto", "prenotazione online", "scheda Google Business ottimizzata"],
  },
  pro: {
    nome: "Table Pro",
    setup: 790,
    canone: 129,
    costoVariabile: 30,
    minutiInclusi: 250,
    oreAttivazione: 12,
    supporto: "WhatsApp, entro 24 ore lavorative",
    incluso: [
      "sito multipagina con menu e foto",
      "prenotazione online",
      "scheda Google Business ottimizzata",
      "assistente AI al telefono e su WhatsApp, 250 minuti al mese",
      "rapporto settimanale e miglioramento continuo",
    ],
  },
  premium: {
    nome: "Table Premium",
    setup: 1490,
    canone: 219,
    costoVariabile: 65,
    minutiInclusi: 500,
    oreAttivazione: 25,
    supporto: "WhatsApp, entro 24 ore lavorative, intervento in sede se serve",
    incluso: [
      "tutto il pacchetto Pro, con 500 minuti al mese",
      "gestionale comande, tavoli e stampa in cucina sui dispositivi del locale",
      "statistiche no-show e tempi di servizio",
    ],
  },
};

export const EXTRA = {
  minutoExtra: 0.25,
  linguaAggiuntiva: 45,
  paginaAggiuntiva: 60,
  scontoClienteFondatore: 0.5,
  /** opzione annuale: 11 mesi pagati per 12 */
  mesiPagatiAnnuale: 11,
  /** segnalazione: metà di un mese di canone a chi presenta un cliente che firma */
  scontoSegnalazione: 0.5,
  compensoPartner: 100,
} as const;

export const NON_INCLUSO = [
  "nuove lingue per l'assistente (45 euro una tantum per lingua)",
  "pagine aggiuntive del sito (60 euro a pagina)",
  "foto professionali, campagne pubblicitarie, hardware",
  "integrazione con gestionali di terzi (preventivo a parte)",
];

export const MAI_VENDUTO = [
  "registratore telematico o funzioni fiscali",
  "gestione delle paghe",
  "consulenze legali o fiscali",
  "promesse di risultati economici",
];

export function setupScontato(p: NomePacchetto, clienteFondatore: boolean): number {
  return LISTINO[p].setup * (clienteFondatore ? 1 - EXTRA.scontoClienteFondatore : 1);
}
