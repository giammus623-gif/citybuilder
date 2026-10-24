// Tutto ciò che è specifico di ElevenLabs Agents (scelta di base, Parte 5.9):
// configurazione dell'agente, firma dei webhook, lettura dell'esito della
// chiamata. Se si cambia piattaforma vocale si riscrive solo questo file.
//
// I formati sono quelli dell'API "convai" consultata il 24/10/2026
// (strumenti webhook, strumenti di sistema transfer_to_number ed end_call,
// variabili di sistema system__caller_id e system__conversation_id).
// Da ricontrollare sulla documentazione prima di ogni attivazione.

import type { ConfigurazioneLocale } from "../core/configurazione.ts";
import type { Turno } from "../core/tipi.ts";
import { DEFINIZIONI, type Parametro } from "./definizioni.ts";
import { istruzioniAssistente, primoMessaggio } from "./prompt.ts";

export const INTESTAZIONE_CHIAVE = "x-orvane-chiave";

function proprieta(p: Parametro) {
  const base: Record<string, unknown> = { type: p.tipo, description: p.descrizione };
  if (p.valori) base.enum = [...p.valori];
  return base;
}

export interface OpzioniAgente {
  /** URL pubblico dell'API, es. https://xyz.supabase.co/functions/v1/orvane-api */
  urlBase: string;
  /** id del segreto nel deposito di ElevenLabs; senza, la chiave va scritta in chiaro (solo per la demo) */
  idSegretoChiave?: string;
  chiaveInChiaro?: string;
  /** modello linguistico scelto nella piattaforma: da confrontare su costo e latenza */
  llm?: string;
}

/** Corpo per POST /v1/convai/tools, uno per strumento. */
export function configurazioniStrumenti(config: ConfigurazioneLocale, opzioni: OpzioniAgente) {
  const chiave = opzioni.idSegretoChiave
    ? { secret_id: opzioni.idSegretoChiave }
    : (opzioni.chiaveInChiaro ?? "IMPOSTARE-LA-CHIAVE");
  return DEFINIZIONI.map((d) => ({
    tool_config: {
      type: "webhook",
      name: d.nome,
      description: d.descrizione,
      response_timeout_secs: 10,
      api_schema: {
        url: `${opzioni.urlBase}/api/${config.slug}/strumenti/${d.nome}`,
        method: "POST",
        request_headers: { [INTESTAZIONE_CHIAVE]: chiave },
        request_body_schema: {
          type: "object",
          description: d.descrizione,
          properties: {
            ...Object.fromEntries(Object.entries(d.parametri).map(([k, p]) => [k, proprieta(p)])),
            _telefono_chiamante: { type: "string", dynamic_variable: "system__caller_id" },
            _id_conversazione: { type: "string", dynamic_variable: "system__conversation_id" },
          },
          required: Object.entries(d.parametri)
            .filter(([, p]) => p.obbligatorio)
            .map(([k]) => k),
        },
      },
    },
  }));
}

/** Corpo per POST /v1/convai/agents/create; tool_ids si riempie dopo aver creato gli strumenti. */
export function configurazioneAgente(config: ConfigurazioneLocale, opzioni: OpzioniAgente, idStrumenti: string[] = []) {
  const builtIn: Record<string, unknown> = {
    end_call: { type: "system", name: "end_call", description: "", params: { system_tool_type: "end_call" } },
  };
  if (config.assistente.trasferimento && config.assistente.numeroTrasferimento) {
    builtIn.transfer_to_number = {
      type: "system",
      name: "transfer_to_number",
      description: "Passa la chiamata al locale solo dopo che trasferisci_chiamata ha risposto consentito=true.",
      params: {
        system_tool_type: "transfer_to_number",
        enable_client_message: true,
        transfers: [
          {
            transfer_destination: { type: "phone", phone_number: config.assistente.numeroTrasferimento },
            condition: "Il cliente vuole parlare con una persona e trasferisci_chiamata ha risposto consentito=true.",
            transfer_type: "conference",
          },
        ],
      },
    };
  }
  return {
    name: `${config.nome} - assistente`,
    tags: ["orvane-table", config.slug, config.demo ? "demo" : "cliente"],
    conversation_config: {
      agent: {
        first_message: primoMessaggio(config),
        language: config.assistente.lingua,
        dynamic_variables: {
          dynamic_variable_placeholders: {
            saluto: "Salve",
            oggi: "un giorno che non conosci: chiedi sempre giorno e mese",
          },
        },
        prompt: {
          prompt: istruzioniAssistente(config),
          ...(opzioni.llm ? { llm: opzioni.llm } : {}),
          timezone: config.fusoOrario,
          tool_ids: idStrumenti,
          built_in_tools: builtIn,
        },
      },
      ...(config.assistente.voceId ? { tts: { voice_id: config.assistente.voceId } } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// webhook di avvio chiamata: saluto e data di oggi come variabili dinamiche

const SALUTI = (minuti: number) => (minuti < 13 * 60 ? "Buongiorno" : minuti < 17 * 60 ? "Buon pomeriggio" : "Buonasera");

export function datiAvvioChiamata(oggiInParole: string, minuti: number) {
  return {
    type: "conversation_initiation_client_data",
    dynamic_variables: { saluto: SALUTI(minuti), oggi: oggiInParole },
  };
}

// ---------------------------------------------------------------------------
// firma HMAC dei webhook di fine chiamata

function esadecimale(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function uguali(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function firmaHmac(segreto: string, testo: string): Promise<string> {
  const chiave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return esadecimale(await crypto.subtle.sign("HMAC", chiave, new TextEncoder().encode(testo)));
}

/**
 * Intestazione "ElevenLabs-Signature: t=<secondi>,v0=<hmac>" con
 * hmac = HMAC-SHA256(segreto, "<secondi>.<corpo>"); tolleranza 30 minuti.
 * Formato dell'esempio ufficiale: da verificare se la documentazione cambia.
 */
export async function firmaValida(intestazione: string | null, corpo: string, segreto: string, adesso: Date): Promise<boolean> {
  if (!intestazione) return false;
  const parti = Object.fromEntries(
    intestazione.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(parti.t);
  if (!Number.isFinite(t) || !parti.v0) return false;
  if (Math.abs(adesso.getTime() / 1000 - t) > 30 * 60) return false;
  return uguali(await firmaHmac(segreto, `${parti.t}.${corpo}`), parti.v0);
}

// ---------------------------------------------------------------------------
// lettura del webhook di fine chiamata (post_call_transcription)

export interface ChiamataConclusa {
  idEsterno: string;
  iniziataIl: string;
  durataSecondi: number;
  telefonoChiamante: string | null;
  trascrizione: Turno[];
  riassunto: string | null;
  esitoPiattaforma: "success" | "failure" | "unknown";
  clienteSoddisfatto: boolean | null;
}

const testo = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

export function leggiFineChiamata(payload: unknown, adesso: Date): ChiamataConclusa | null {
  const p = payload as Record<string, any>;
  if (!p || p.type !== "post_call_transcription" || !p.data) return null;
  const d = p.data;
  const id = testo(d.conversation_id);
  if (!id) return null;
  const inizio = Number(d.metadata?.start_time_unix_secs);
  const variabili = d.conversation_initiation_client_data?.dynamic_variables ?? {};
  const trascrizione: Turno[] = Array.isArray(d.transcript)
    ? d.transcript
        .filter((t: any) => testo(t?.message))
        .map((t: any) => ({
          ruolo: t.role === "agent" ? "assistente" : "cliente",
          testo: String(t.message),
          ...(Number.isFinite(Number(t.time_in_call_secs)) ? { secondo: Number(t.time_in_call_secs) } : {}),
        }))
    : [];
  const criteri = d.analysis?.evaluation_criteria_results ?? {};
  const soddisfazione = criteri.cliente_soddisfatto?.result;
  return {
    idEsterno: id,
    iniziataIl: Number.isFinite(inizio) && inizio > 0 ? new Date(inizio * 1000).toISOString() : adesso.toISOString(),
    durataSecondi: Math.max(0, Math.round(Number(d.metadata?.call_duration_secs) || 0)),
    telefonoChiamante: testo(variabili.system__caller_id),
    trascrizione,
    riassunto: testo(d.analysis?.transcript_summary),
    esitoPiattaforma: d.analysis?.call_successful === "success" || d.analysis?.call_successful === "failure" ? d.analysis.call_successful : "unknown",
    clienteSoddisfatto: soddisfazione === "success" ? true : soddisfazione === "failure" ? false : null,
  };
}
