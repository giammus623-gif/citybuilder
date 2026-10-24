// Il ciclo di miglioramento (Parte 5B): ogni correzione è una modifica
// proposta, approvata da una persona, applicata con data e motivo e
// annullabile. L'AI non cambia mai da sola le proprie istruzioni.

import type { Archivio } from "../core/archivio.ts";
import { leggiConfigurazione, TEMI, type ConfigurazioneLocale } from "../core/configurazione.ts";
import { dataValida } from "../core/tempo.ts";
import type { ModificaProposta, TipoModifica } from "../core/tipi.ts";

export class ModificaNonApplicabile extends Error {}

/** Quali tipi toccano regole che solo il titolare può approvare (Parte 5B.4). */
export function richiedeTitolare(tipo: TipoModifica): boolean {
  return tipo !== "faq";
}

const SEZIONE: Record<TipoModifica, keyof ConfigurazioneLocale | "assistente.istruzioniAggiuntive"> = {
  faq: "domandeFrequenti",
  chiusura_aggiungi: "chiusure",
  chiusura_rimuovi: "chiusure",
  istruzione_assistente: "assistente.istruzioniAggiuntive",
  regola_prenotazione: "prenotazioni",
};

function leggiSezione(config: ConfigurazioneLocale, sezione: string): unknown {
  if (sezione === "assistente.istruzioniAggiuntive") return structuredClone(config.assistente.istruzioniAggiuntive);
  return structuredClone(config[sezione as keyof ConfigurazioneLocale]);
}

function scriviSezione(config: ConfigurazioneLocale, sezione: string, valore: unknown): ConfigurazioneLocale {
  const nuova = structuredClone(config);
  if (sezione === "assistente.istruzioniAggiuntive") nuova.assistente.istruzioniAggiuntive = valore as string[];
  else (nuova as Record<string, unknown>)[sezione] = valore;
  return leggiConfigurazione(nuova);
}

const REGOLE_MODIFICABILI = ["maxPersoneSenzaTitolare", "durataTavoloMinuti", "anticipoMinimoMinuti", "capienzaCoperti"] as const;

/** Applica la modifica alla configurazione. Pura: non salva nulla. */
export function applica(config: ConfigurazioneLocale, m: Pick<ModificaProposta, "tipo" | "dati">): ConfigurazioneLocale {
  const d = m.dati;
  switch (m.tipo) {
    case "faq": {
      const tema = String(d.tema);
      if (!(TEMI as readonly string[]).includes(tema)) throw new ModificaNonApplicabile(`Tema sconosciuto: ${tema}`);
      if (typeof d.domanda !== "string" || typeof d.risposta !== "string" || !d.risposta.trim()) {
        throw new ModificaNonApplicabile("Una domanda frequente richiede domanda e risposta");
      }
      const faq = config.domandeFrequenti.filter((f) => f.domanda.toLowerCase() !== String(d.domanda).toLowerCase());
      faq.push({ tema: tema as (typeof TEMI)[number], domanda: d.domanda, risposta: d.risposta, verificata: true });
      return scriviSezione(config, "domandeFrequenti", faq);
    }
    case "chiusura_aggiungi": {
      const dal = String(d.dal);
      const al = String(d.al ?? d.dal);
      if (!dataValida(dal) || !dataValida(al) || al < dal) throw new ModificaNonApplicabile("Date di chiusura non valide");
      return scriviSezione(config, "chiusure", [...config.chiusure, { dal, al, motivo: String(d.motivo ?? "chiusura") }]);
    }
    case "chiusura_rimuovi": {
      const giorno = String(d.dal);
      const resto = config.chiusure.filter((c) => !(c.dal <= giorno && giorno <= c.al));
      if (resto.length === config.chiusure.length) throw new ModificaNonApplicabile(`Nessuna chiusura il ${giorno}`);
      return scriviSezione(config, "chiusure", resto);
    }
    case "istruzione_assistente": {
      if (typeof d.testo !== "string" || d.testo.trim().length < 5) throw new ModificaNonApplicabile("Istruzione vuota");
      return scriviSezione(config, "assistente.istruzioniAggiuntive", [...config.assistente.istruzioniAggiuntive, d.testo.trim()]);
    }
    case "regola_prenotazione": {
      const campo = String(d.campo);
      if (!(REGOLE_MODIFICABILI as readonly string[]).includes(campo)) throw new ModificaNonApplicabile(`Regola non modificabile: ${campo}`);
      return scriviSezione(config, "prenotazioni", { ...config.prenotazioni, [campo]: Number(d.valore) });
    }
  }
}

export async function proponi(
  archivio: Archivio,
  config: ConfigurazioneLocale,
  proposta: { tipo: TipoModifica; descrizione: string; dati: Record<string, unknown>; motivo: string; origine: ModificaProposta["origine"] },
): Promise<ModificaProposta> {
  applica(config, proposta); // scarta subito le proposte impossibili
  return archivio.creaModifica({ localeId: config.id, ...proposta, richiedeTitolare: richiedeTitolare(proposta.tipo) });
}

export type EsitoDecisione =
  | { ok: true; modifica: ModificaProposta; stato: "applicata" | "rifiutata" }
  | { ok: false; motivo: string };

/**
 * Il titolare (o il fondatore) risponde "ok N" o "no N".
 * Il fondatore non può approvare da solo ciò che richiede il titolare.
 */
export async function decidi(
  archivio: Archivio,
  localeId: string,
  numero: number,
  decisione: "ok" | "no",
  chi: "titolare" | "fondatore",
  adesso: Date,
): Promise<EsitoDecisione> {
  const m = await archivio.modificaPerNumero(localeId, numero);
  if (!m) return { ok: false, motivo: `Non trovo la proposta ${numero}.` };
  if (m.stato !== "proposta") return { ok: false, motivo: `La proposta ${numero} è già ${m.stato}.` };
  if (decisione === "ok" && m.richiedeTitolare && chi !== "titolare") {
    return { ok: false, motivo: `La proposta ${numero} cambia una regola del locale: la approva solo il titolare.` };
  }
  const quando = adesso.toISOString();
  if (decisione === "no") {
    await archivio.aggiornaModifica(localeId, m.id, { stato: "rifiutata", decisaIl: quando, decisaDa: chi, statoPrecedente: null });
    return { ok: true, modifica: { ...m, stato: "rifiutata" }, stato: "rifiutata" };
  }
  const config = await archivio.configurazione(localeId);
  if (!config) return { ok: false, motivo: "Locale non trovato." };
  const sezione = SEZIONE[m.tipo];
  let nuova: ConfigurazioneLocale;
  try {
    nuova = applica(config, m);
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : String(e) };
  }
  const statoPrecedente = { sezione, valore: leggiSezione(config, sezione) };
  await archivio.salvaConfigurazione(nuova);
  await archivio.aggiornaModifica(localeId, m.id, { stato: "applicata", decisaIl: quando, decisaDa: chi, statoPrecedente });
  return { ok: true, modifica: { ...m, stato: "applicata", statoPrecedente }, stato: "applicata" };
}

/** Torna indietro: solo l'ultima modifica applicata della stessa sezione. */
export async function annulla(archivio: Archivio, localeId: string, numero: number, adesso: Date): Promise<EsitoDecisione> {
  const m = await archivio.modificaPerNumero(localeId, numero);
  if (!m || m.stato !== "applicata" || !m.statoPrecedente) return { ok: false, motivo: `La proposta ${numero} non è applicata.` };
  const successive = (await archivio.modifiche(localeId, "applicata")).filter(
    (x) => x.numero > m.numero && x.statoPrecedente?.sezione === m.statoPrecedente?.sezione,
  );
  if (successive.length) {
    return { ok: false, motivo: `Prima vanno annullate le modifiche successive: ${successive.map((x) => x.numero).join(", ")}.` };
  }
  const config = await archivio.configurazione(localeId);
  if (!config) return { ok: false, motivo: "Locale non trovato." };
  await archivio.salvaConfigurazione(scriviSezione(config, m.statoPrecedente.sezione, m.statoPrecedente.valore));
  await archivio.aggiornaModifica(localeId, m.id, { stato: "annullata", decisaIl: adesso.toISOString(), decisaDa: "fondatore", statoPrecedente: m.statoPrecedente });
  return { ok: true, modifica: { ...m, stato: "annullata" }, stato: "rifiutata" };
}
