// L'API in un solo gestore Request -> Response (standard Web): gira uguale
// su Supabase Edge Functions (Deno), Cloudflare Workers e Node.

import { datiAvvioChiamata, firmaHmac, firmaValida, INTESTAZIONE_CHIAVE, leggiFineChiamata } from "../assistente/elevenlabs.ts";
import { eUnoStrumento, eseguiStrumento, type ContestoStrumenti } from "../assistente/strumenti.ts";
import type { Archivio } from "../core/archivio.ts";
import type { ConfigurazioneLocale } from "../core/configurazione.ts";
import { orariPrenotabili, verificaPrenotazione } from "../core/disponibilita.ts";
import type { Messaggero } from "../core/messaggero.ts";
import { dataInParole, interpretaData, istanteLocale, oraDa } from "../core/tempo.ts";
import { classifica } from "../rapporti/classificazione.ts";
import { gestisciMessaggioTitolare } from "../rapporti/comandi-titolare.ts";
import { decidi } from "../rapporti/miglioramento.ts";
import { esc, pagina, paginaApprovazioni, paginaPrenotazione } from "./pagine.ts";

export interface Ambiente {
  archivio: Archivio;
  messaggero: Messaggero;
  ora: () => Date;
  /** indirizzo pubblico di questa API, senza barra finale */
  urlBase: string;
  /** segreto da cui si ricava la chiave degli strumenti di ogni locale */
  segretoStrumenti: string;
  /** segreto per firmare i collegamenti di approvazione del titolare */
  segretoCollegamenti: string;
  /** segreto HMAC dei webhook di fine chiamata di ElevenLabs */
  segretoWebhookVoce?: string;
  /** token di verifica e segreto dell'app per il webhook WhatsApp (Meta) */
  whatsapp?: { tokenVerifica: string; segretoApp?: string };
  /** origini da cui il modulo di prenotazione del sito può chiamare l'API; "*" per la demo */
  originiSito: string[];
}

export async function chiaveStrumenti(segreto: string, slug: string): Promise<string> {
  return (await firmaHmac(segreto, `strumenti:${slug}`)).slice(0, 40);
}

export async function collegamentoApprovazione(amb: Pick<Ambiente, "urlBase" | "segretoCollegamenti">, slug: string, scadenza: Date) {
  const s = Math.floor(scadenza.getTime() / 1000);
  const firma = (await firmaHmac(amb.segretoCollegamenti, `approva:${slug}:${s}`)).slice(0, 32);
  return `${amb.urlBase}/approva/${slug}/${s}/${firma}`;
}

const json = (dati: unknown, stato = 200, intestazioni: Record<string, string> = {}) =>
  new Response(JSON.stringify(dati), { status: stato, headers: { "content-type": "application/json; charset=utf-8", ...intestazioni } });
const html = (corpo: string, stato = 200) => new Response(corpo, { status: stato, headers: { "content-type": "text/html; charset=utf-8" } });
const testo = (t: string, stato = 200) => new Response(t, { status: stato, headers: { "content-type": "text/plain; charset=utf-8" } });

function uguali(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function leggiJson(req: Request): Promise<{ grezzo: string; dati: unknown }> {
  const grezzo = await req.text();
  if (grezzo.length > 200_000) throw new Error("corpo troppo grande");
  try {
    return { grezzo, dati: grezzo ? JSON.parse(grezzo) : {} };
  } catch {
    return { grezzo, dati: null };
  }
}

function cors(amb: Ambiente, req: Request): Record<string, string> {
  const origine = req.headers.get("origin");
  if (!origine) return {};
  if (amb.originiSito.includes("*") || amb.originiSito.includes(origine)) {
    return {
      "access-control-allow-origin": origine,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      vary: "origin",
    };
  }
  return {};
}

function contesto(amb: Ambiente, config: ConfigurazioneLocale, extra: Partial<ContestoStrumenti> = {}): ContestoStrumenti {
  return { archivio: amb.archivio, messaggero: amb.messaggero, config, adesso: amb.ora(), urlBase: amb.urlBase, ...extra };
}

export function creaGestore(amb: Ambiente): (req: Request) => Promise<Response> {
  return async (req) => {
    try {
      return await instrada(amb, req);
    } catch (e) {
      console.error("errore non gestito:", e);
      return json({ ok: false, messaggio: "Errore interno" }, 500);
    }
  };
}

async function instrada(amb: Ambiente, req: Request): Promise<Response> {
  const url = new URL(req.url);
  // su Supabase il percorso inizia con /orvane-api o /functions/v1/orvane-api
  const percorso = url.pathname.replace(/^\/(functions\/v1\/)?orvane-api/, "") || "/";
  const metodo = req.method.toUpperCase();
  let m: RegExpExecArray | null;

  if (metodo === "OPTIONS") return new Response(null, { status: 204, headers: cors(amb, req) });
  if (percorso === "/salute") return json({ ok: true, ora: amb.ora().toISOString() });

  if ((m = /^\/api\/([a-z0-9-]+)\/(.+)$/.exec(percorso))) {
    const config = await amb.archivio.configurazionePerSlug(m[1]);
    if (!config) return json({ ok: false, messaggio: "Locale sconosciuto" }, 404);
    const resto = m[2];

    if ((m = /^strumenti\/([a-z_]+)$/.exec(resto)) && metodo === "POST") return strumento(amb, req, config, m[1]);
    if (resto === "avvio-chiamata" && metodo === "POST") return avvioChiamata(amb, req, config);
    if (resto === "fine-chiamata" && metodo === "POST") return fineChiamata(amb, req, config);
    if (resto === "disponibilita" && metodo === "GET") return disponibilitaSito(amb, req, config, url);
    if (resto === "prenotazioni" && metodo === "POST") return prenotazioneSito(amb, req, config);
    if (resto === "whatsapp" && metodo === "GET") return verificaWhatsApp(amb, url);
    if (resto === "whatsapp" && metodo === "POST") return messaggioWhatsApp(amb, req, config);
    return json({ ok: false, messaggio: "Percorso sconosciuto" }, 404);
  }

  if ((m = /^\/p\/([a-f0-9]{40})(\/annulla)?$/.exec(percorso))) return gestionePrenotazione(amb, m[1], Boolean(m[2]) && metodo === "POST");

  if ((m = /^\/approva\/([a-z0-9-]+)\/(\d+)\/([a-f0-9]{32})(?:\/(\d+)\/(ok|no))?$/.exec(percorso))) {
    return approvazioni(amb, m[1], Number(m[2]), m[3], m[4] && metodo === "POST" ? { numero: Number(m[4]), decisione: m[5] as "ok" | "no" } : null);
  }

  return testo("Non trovato", 404);
}

// --- strumenti dell'assistente vocale ---------------------------------------

async function strumento(amb: Ambiente, req: Request, config: ConfigurazioneLocale, nome: string): Promise<Response> {
  const attesa = await chiaveStrumenti(amb.segretoStrumenti, config.slug);
  if (!uguali(req.headers.get(INTESTAZIONE_CHIAVE) ?? "", attesa)) return json({ ok: false, messaggio: "Non autorizzato" }, 401);
  if (!eUnoStrumento(nome)) return json({ ok: false, messaggio: `Strumento sconosciuto: ${nome}` }, 404);
  const { dati } = await leggiJson(req);
  if (dati === null) return json({ ok: false, messaggio: "Richiesta non valida" }, 400);
  const corpo = dati as Record<string, unknown>;
  const { _telefono_chiamante, _id_conversazione, ...ingresso } = corpo;
  const risposta = await eseguiStrumento(
    nome,
    contesto(amb, config, {
      telefonoChiamante: typeof _telefono_chiamante === "string" ? _telefono_chiamante : null,
      idConversazione: typeof _id_conversazione === "string" ? _id_conversazione : null,
      canale: "telefono",
    }),
    ingresso,
  );
  return json(risposta);
}

async function avvioChiamata(amb: Ambiente, req: Request, config: ConfigurazioneLocale): Promise<Response> {
  const attesa = await chiaveStrumenti(amb.segretoStrumenti, config.slug);
  if (!uguali(req.headers.get(INTESTAZIONE_CHIAVE) ?? "", attesa)) return json({ ok: false }, 401);
  const adesso = istanteLocale(amb.ora(), config.fusoOrario);
  return json(datiAvvioChiamata(`${dataInParole(adesso.data)} ${adesso.data.slice(0, 4)}, ore ${oraDa(adesso.minuti)}`, adesso.minuti));
}

async function fineChiamata(amb: Ambiente, req: Request, config: ConfigurazioneLocale): Promise<Response> {
  const { grezzo, dati } = await leggiJson(req);
  if (amb.segretoWebhookVoce) {
    const valida = await firmaValida(req.headers.get("elevenlabs-signature"), grezzo, amb.segretoWebhookVoce, amb.ora());
    if (!valida) return json({ ok: false, messaggio: "Firma non valida" }, 401);
  } else if (!config.demo) {
    return json({ ok: false, messaggio: "Segreto del webhook non configurato" }, 401);
  }
  const chiamata = leggiFineChiamata(dati, amb.ora());
  if (!chiamata) return json({ ok: true, ignorato: true });
  const registro = await amb.archivio.registroConversazione(config.id, chiamata.idEsterno);
  const esito = classifica(chiamata, registro);
  const scade = new Date(Date.parse(chiamata.iniziataIl) + config.assistente.conservazioneTrascrizioniGiorni * 86_400_000);
  const salvata = await amb.archivio.salvaConversazione({
    localeId: config.id,
    idEsterno: chiamata.idEsterno,
    canale: "telefono",
    iniziataIl: chiamata.iniziataIl,
    durataSecondi: chiamata.durataSecondi,
    telefonoChiamante: chiamata.telefonoChiamante,
    trascrizione: chiamata.trascrizione,
    riassunto: chiamata.riassunto,
    scadeIl: scade.toISOString(),
    esito,
  });
  return json({ ok: true, id: salvata.id, esito: esito.esito });
}

// --- modulo di prenotazione del sito ----------------------------------------

async function disponibilitaSito(amb: Ambiente, req: Request, config: ConfigurazioneLocale, url: URL): Promise<Response> {
  const intestazioni = cors(amb, req);
  const adesso = istanteLocale(amb.ora(), config.fusoOrario);
  const data = interpretaData(url.searchParams.get("data") ?? "", adesso.data);
  const persone = Number(url.searchParams.get("persone") ?? "2");
  if (!data || !Number.isInteger(persone) || persone < 1) return json({ ok: false, messaggio: "Data o persone non valide" }, 400, intestazioni);
  const esistenti = await amb.archivio.prenotazioniAttive(config.id, data);
  const orari = orariPrenotabili(config, data).filter(
    (min) => verificaPrenotazione(config, esistenti, data, min, persone, adesso, { ignoraLimiteGruppo: true }).disponibile,
  );
  return json(
    {
      ok: true,
      data,
      data_in_parole: dataInParole(data),
      orari: orari.map(oraDa),
      gruppo_grande: persone > config.prenotazioni.maxPersoneSenzaTitolare,
    },
    200,
    intestazioni,
  );
}

async function prenotazioneSito(amb: Ambiente, req: Request, config: ConfigurazioneLocale): Promise<Response> {
  const intestazioni = cors(amb, req);
  const { dati } = await leggiJson(req);
  const d = (dati ?? {}) as Record<string, unknown>;
  // campo trappola: i programmi automatici lo compilano, le persone non lo vedono
  if (typeof d.sito_web === "string" && d.sito_web.trim()) return json({ ok: true, confermata: true, messaggio: "Grazie" }, 200, intestazioni);
  if (d.privacy !== true) {
    return json({ ok: false, campo: "privacy", messaggio: "Per prenotare serve la presa visione dell'informativa privacy." }, 400, intestazioni);
  }
  const ingresso = { ...d };
  delete ingresso.privacy;
  delete ingresso.sito_web;
  const risposta = await eseguiStrumento("crea_prenotazione", contesto(amb, config, { canale: "sito", telefonoChiamante: null }), ingresso);
  return json(risposta, risposta.ok ? 200 : 400, intestazioni);
}

// --- pagine per clienti e titolare ------------------------------------------

async function gestionePrenotazione(amb: Ambiente, token: string, annulla: boolean): Promise<Response> {
  const p = await amb.archivio.prenotazionePerToken(token);
  if (!p) return html(pagina("Prenotazione", "<h1>Prenotazione non trovata</h1><p>Il collegamento non è valido o è scaduto.</p>"), 404);
  const config = await amb.archivio.configurazione(p.localeId);
  if (!config) return html(pagina("Prenotazione", "<h1>Locale non trovato</h1>"), 404);
  const azione = `${amb.urlBase}/p/${token}/annulla`;
  if (!annulla) return html(paginaPrenotazione(config, p, azione));

  const adesso = istanteLocale(amb.ora(), config.fusoOrario);
  if (p.stato !== "confermata" && p.stato !== "da_confermare") return html(paginaPrenotazione(config, p, azione, "La prenotazione non è più attiva."));
  if (p.data < adesso.data) return html(paginaPrenotazione(config, p, azione, "La data è già passata."));
  const aggiornata = await amb.archivio.aggiornaSeDisponibile(config.id, p.id, { stato: "annullata" }, () => true);
  if (p.data === adesso.data) {
    await amb.messaggero.invia({
      a: config.titolare.telefono,
      tipo: "avviso_titolare",
      testo: `Disdetta dal sito per oggi: ${p.nome}, ${p.persone} persone alle ${p.ora}.`,
    });
  }
  return html(paginaPrenotazione(config, aggiornata ?? p, azione, "Prenotazione annullata. Grazie per averci avvisato."));
}

async function approvazioni(
  amb: Ambiente,
  slug: string,
  scadenza: number,
  firma: string,
  decisione: { numero: number; decisione: "ok" | "no" } | null,
): Promise<Response> {
  const attesa = (await firmaHmac(amb.segretoCollegamenti, `approva:${slug}:${scadenza}`)).slice(0, 32);
  if (!uguali(firma, attesa) || scadenza * 1000 < amb.ora().getTime()) {
    return html(pagina("Collegamento scaduto", "<h1>Collegamento non valido o scaduto</h1><p>Chieda un nuovo collegamento o risponda su WhatsApp.</p>"), 403);
  }
  const config = await amb.archivio.configurazionePerSlug(slug);
  if (!config) return html(pagina("Locale", "<h1>Locale non trovato</h1>"), 404);
  let messaggio: string | undefined;
  if (decisione) {
    const e = await decidi(amb.archivio, config.id, decisione.numero, decisione.decisione, "titolare", amb.ora());
    messaggio = e.ok ? `Proposta ${decisione.numero}: ${e.stato === "applicata" ? "approvata e applicata" : "scartata"}.` : e.motivo;
  }
  const proposte = await amb.archivio.modifiche(config.id, "proposta");
  return html(paginaApprovazioni(config, proposte, `${amb.urlBase}/approva/${esc(slug)}/${scadenza}/${firma}`, messaggio));
}

// --- WhatsApp del titolare --------------------------------------------------

function verificaWhatsApp(amb: Ambiente, url: URL): Response {
  const p = url.searchParams;
  if (amb.whatsapp && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === amb.whatsapp.tokenVerifica) {
    return testo(p.get("hub.challenge") ?? "");
  }
  return testo("Vietato", 403);
}

const cifre = (t: string) => t.replace(/\D/g, "");

async function messaggioWhatsApp(amb: Ambiente, req: Request, config: ConfigurazioneLocale): Promise<Response> {
  if (!amb.whatsapp) return json({ ok: false }, 404);
  const { grezzo, dati } = await leggiJson(req);
  if (amb.whatsapp.segretoApp) {
    const firma = req.headers.get("x-hub-signature-256") ?? "";
    const attesa = `sha256=${await firmaHmac(amb.whatsapp.segretoApp, grezzo)}`;
    if (!uguali(firma, attesa)) return json({ ok: false }, 401);
  }
  const messaggi: { from?: string; text?: { body?: string } }[] =
    (dati as any)?.entry?.flatMap((e: any) => e?.changes ?? []).flatMap((c: any) => c?.value?.messages ?? []) ?? [];
  for (const msg of messaggi) {
    const corpo = msg.text?.body;
    if (!msg.from || !corpo) continue;
    // solo il titolare può dare comandi; i messaggi dei clienti non passano da qui
    if (cifre(msg.from) !== cifre(config.titolare.telefono)) continue;
    const risposta = await gestisciMessaggioTitolare(amb.archivio, config, corpo, amb.ora());
    await amb.messaggero.invia({ a: config.titolare.telefono, tipo: "risposta_comando", testo: risposta });
  }
  // Meta vuole sempre 200, altrimenti ripete l'invio
  return json({ ok: true });
}
