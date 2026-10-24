// La configurazione di un locale. Un nuovo cliente si attiva compilando
// questo oggetto (Parte 5.1, principio 2): nessuna riga di codice per locale.

import { z } from "zod";
import { dataValida, oraValida } from "./tempo.ts";

/** I 14 allergeni dell'allegato II del Reg. UE 1169/2011. */
export const ALLERGENI = {
  glutine: "cereali contenenti glutine",
  crostacei: "crostacei",
  uova: "uova",
  pesce: "pesce",
  arachidi: "arachidi",
  soia: "soia",
  latte: "latte e lattosio",
  frutta_a_guscio: "frutta a guscio",
  sedano: "sedano",
  senape: "senape",
  sesamo: "semi di sesamo",
  solfiti: "anidride solforosa e solfiti",
  lupini: "lupini",
  molluschi: "molluschi",
} as const;
export type Allergene = keyof typeof ALLERGENI;

const ORDINE_ALLERGENI = Object.keys(ALLERGENI);

/** Senza doppioni e nell'ordine del regolamento, così il confronto tra archivi è stabile. */
export function ordinaAllergeni(elenco: Allergene[]): Allergene[] {
  return [...new Set(elenco)].sort((a, b) => ORDINE_ALLERGENI.indexOf(a) - ORDINE_ALLERGENI.indexOf(b));
}

export const TEMI = [
  "orari",
  "chiusure",
  "indirizzo",
  "parcheggio",
  "animali",
  "accessibilita",
  "menu",
  "vegetariano",
  "allergie",
  "prezzi",
  "menu_fisso",
  "eventi",
  "pagamenti",
  "asporto",
  "altro",
] as const;
export type Tema = (typeof TEMI)[number];

const ora = z.string().refine(oraValida, "orario nel formato HH:MM");
const data = z.string().refine(dataValida, "data nel formato AAAA-MM-GG");
const telefono = z.string().regex(/^\+\d{8,15}$/, "telefono in formato internazionale, es. +390612345678");

const fascia = z.object({ dalle: ora, alle: ora });

const voceMenu = z.object({
  nome: z.string().min(1),
  descrizione: z.string().optional(),
  prezzo: z.number().nonnegative(),
  allergeni: z
    .array(z.enum(Object.keys(ALLERGENI) as [Allergene, ...Allergene[]]))
    .default([])
    .transform(ordinaAllergeni),
  vegetariano: z.boolean().default(false),
  vegano: z.boolean().default(false),
  senzaGlutine: z.boolean().default(false),
});

export const schemaConfigurazione = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug in minuscolo con trattini"),
  nome: z.string().min(2),
  tipo: z.enum(["ristorante", "pizzeria", "trattoria", "osteria", "agriturismo", "bistrot"]),
  pacchetto: z.enum(["start", "pro", "premium"]),
  /** true per i locali fittizi usati nelle demo */
  demo: z.boolean().default(false),
  fusoOrario: z.string().default("Europe/Rome"),
  contatti: z.object({
    telefono,
    whatsapp: telefono.optional(),
    email: z.string().email().optional(),
    indirizzo: z.object({
      via: z.string(),
      cap: z.string().regex(/^\d{5}$/),
      citta: z.string(),
      provincia: z.string().length(2),
    }),
    coordinate: z.object({ lat: z.number(), lon: z.number() }).optional(),
  }),
  titolare: z.object({
    nome: z.string(),
    /** numero su cui arrivano avvisi, rapporti e richieste di approvazione */
    telefono,
  }),
  orari: z.object({
    lun: z.array(fascia).default([]),
    mar: z.array(fascia).default([]),
    mer: z.array(fascia).default([]),
    gio: z.array(fascia).default([]),
    ven: z.array(fascia).default([]),
    sab: z.array(fascia).default([]),
    dom: z.array(fascia).default([]),
  }),
  chiusure: z.array(z.object({ dal: data, al: data, motivo: z.string().default("chiusura") })).default([]),
  prenotazioni: z.object({
    capienzaCoperti: z.number().int().positive(),
    durataTavoloMinuti: z.number().int().min(30).max(300).default(90),
    intervalloMinuti: z.number().int().min(5).max(60).default(15),
    ultimaPrenotazioneMinutiPrimaChiusura: z.number().int().min(0).default(45),
    anticipoMinimoMinuti: z.number().int().min(0).default(30),
    giorniMassimiAnticipo: z.number().int().positive().default(60),
    /** oltre questo numero l'assistente non conferma e passa la richiesta al titolare */
    maxPersoneSenzaTitolare: z.number().int().positive().default(8),
    /** limite assoluto per scartare dati incoerenti */
    maxPersone: z.number().int().positive().default(40),
  }),
  menu: z.array(z.object({ categoria: z.string(), voci: z.array(voceMenu) })).default([]),
  domandeFrequenti: z
    .array(
      z.object({
        tema: z.enum(TEMI),
        domanda: z.string(),
        risposta: z.string(),
        /** solo le risposte verificate dal titolare vengono lette ai clienti */
        verificata: z.boolean().default(true),
      }),
    )
    .default([]),
  assistente: z
    .object({
      lingua: z.string().default("it"),
      voceId: z.string().optional(),
      /** se false l'assistente non passa mai la chiamata e lascia un messaggio */
      trasferimento: z.boolean().default(false),
      numeroTrasferimento: telefono.optional(),
      conservazioneTrascrizioniGiorni: z.number().int().min(1).max(365).default(60),
      /** regole approvate dal titolare con il ciclo di miglioramento (Parte 5B) */
      istruzioniAggiuntive: z.array(z.string()).default([]),
    })
    .default({}),
  sito: z
    .object({
      dominio: z.string().optional(),
      /** indirizzo pubblico dell'API per il modulo di prenotazione */
      apiBase: z.string().url().optional(),
      slogan: z.string().default(""),
      descrizione: z.string().default(""),
      cucina: z.array(z.string()).default([]),
      fasciaPrezzo: z.enum(["€", "€€", "€€€"]).default("€€"),
      colori: z
        .object({
          primario: z.string().default("#8a2d1c"),
          sfondo: z.string().default("#fbf7f0"),
          testo: z.string().default("#2a211c"),
        })
        .default({}),
      foto: z.array(z.object({ src: z.string(), alt: z.string() })).default([]),
      social: z.object({ instagram: z.string().url().optional(), facebook: z.string().url().optional() }).default({}),
    })
    .default({}),
  privacy: z.object({
    /** chi è titolare del trattamento: il ristorante (Parte 12.4) */
    ragioneSociale: z.string(),
    partitaIva: z.string().regex(/^\d{11}$/).optional(),
    email: z.string().email(),
  }),
});

export type ConfigurazioneLocale = z.infer<typeof schemaConfigurazione>;
export type IngressoConfigurazione = z.input<typeof schemaConfigurazione>;
export type Fascia = z.infer<typeof fascia>;
export type VoceMenu = z.infer<typeof voceMenu>;

export class ErroreConfigurazione extends Error {}

export function leggiConfigurazione(grezza: unknown): ConfigurazioneLocale {
  const r = schemaConfigurazione.safeParse(grezza);
  if (!r.success) {
    const righe = r.error.issues.map((i) => `- ${i.path.join(".") || "(radice)"}: ${i.message}`);
    throw new ErroreConfigurazione(`Configurazione del locale non valida:\n${righe.join("\n")}`);
  }
  const c = r.data;
  for (const ch of c.chiusure) {
    if (ch.al < ch.dal) throw new ErroreConfigurazione(`Chiusura con "al" (${ch.al}) prima di "dal" (${ch.dal})`);
  }
  if (c.assistente.trasferimento && !c.assistente.numeroTrasferimento) {
    throw new ErroreConfigurazione("assistente.trasferimento è attivo ma manca numeroTrasferimento");
  }
  if (c.prenotazioni.maxPersoneSenzaTitolare > c.prenotazioni.maxPersone) {
    throw new ErroreConfigurazione("maxPersoneSenzaTitolare non può superare maxPersone");
  }
  return c;
}
