// Costruisce l'ambiente di produzione dalle variabili d'ambiente.
// Nessun segreto nel codice (Parte 5.7): tutto arriva da qui.

import { ArchivioPostgres, type Sql } from "./adattatori/archivio-postgres.ts";
import { MessaggeroConsole, MessaggeroWhatsApp } from "./adattatori/whatsapp-cloud.ts";
import type { Ambiente } from "./api/gestore.ts";
import type { Messaggero } from "./core/messaggero.ts";

export const VARIABILI = {
  ORVANE_URL_BASE: "indirizzo pubblico dell'API, es. https://<progetto>.supabase.co/functions/v1/orvane-api",
  ORVANE_SEGRETO_STRUMENTI: "stringa casuale lunga: da qui si ricava la chiave degli strumenti di ogni locale",
  ORVANE_SEGRETO_COLLEGAMENTI: "stringa casuale lunga: firma i collegamenti di approvazione del titolare",
  ORVANE_SEGRETO_WEBHOOK_VOCE: "segreto HMAC del webhook di fine chiamata configurato in ElevenLabs",
  ORVANE_ORIGINI_SITO: "origini dei siti dei clienti separate da virgola, es. https://trattoria.it",
  WHATSAPP_TOKEN: "facoltativo: token della WhatsApp Cloud API",
  WHATSAPP_ID_NUMERO: "facoltativo: id del numero WhatsApp Business",
  WHATSAPP_VERSIONE_API: "facoltativo: versione della Graph API, da verificare (es. v23.0)",
  WHATSAPP_MODELLI: 'facoltativo: JSON {"conferma_prenotazione":{"nome":"conferma_prenotazione","lingua":"it"}, ...}',
  WHATSAPP_TOKEN_VERIFICA: "facoltativo: token di verifica del webhook Meta",
  WHATSAPP_SEGRETO_APP: "facoltativo: segreto dell'app Meta per verificare la firma dei webhook",
} as const;

type Leggi = (nome: string) => string | undefined;

function obbligatoria(env: Leggi, n: keyof typeof VARIABILI): string {
  const v = env(n);
  if (!v) throw new Error(`Manca la variabile ${n}: ${VARIABILI[n]}`);
  return v;
}

/** WhatsApp se configurato, altrimenti console. */
export function creaMessaggero(env: Leggi): Messaggero {
  if (!env("WHATSAPP_TOKEN") || !env("WHATSAPP_ID_NUMERO")) return new MessaggeroConsole();
  return new MessaggeroWhatsApp({
    token: env("WHATSAPP_TOKEN")!,
    idNumero: env("WHATSAPP_ID_NUMERO")!,
    versioneApi: obbligatoria(env, "WHATSAPP_VERSIONE_API"),
    modelli: JSON.parse(env("WHATSAPP_MODELLI") ?? "{}"),
  });
}

export function creaAmbiente(env: Leggi, sql: Sql): Ambiente {
  const messaggero = creaMessaggero(env);
  const tokenVerifica = env("WHATSAPP_TOKEN_VERIFICA");
  return {
    archivio: new ArchivioPostgres(sql),
    messaggero,
    ora: () => new Date(),
    urlBase: obbligatoria(env, "ORVANE_URL_BASE").replace(/\/$/, ""),
    segretoStrumenti: obbligatoria(env, "ORVANE_SEGRETO_STRUMENTI"),
    segretoCollegamenti: obbligatoria(env, "ORVANE_SEGRETO_COLLEGAMENTI"),
    segretoWebhookVoce: env("ORVANE_SEGRETO_WEBHOOK_VOCE"),
    whatsapp: tokenVerifica ? { tokenVerifica, segretoApp: env("WHATSAPP_SEGRETO_APP") } : undefined,
    originiSito: (env("ORVANE_ORIGINI_SITO") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}
