// Il rapporto settimanale (Parte 5B.7, 9.10 e prompt 17.6): è il prodotto
// che il titolare vede ogni lunedì. Si scrive dai numeri, senza modello
// linguistico, quindi costa zero e non inventa nulla.

import type { Archivio, FiltroPeriodo } from "../core/archivio.ts";
import type { ConfigurazioneLocale } from "../core/configurazione.ts";
import { aggiungiGiorni, dataBreve, istanteDaLocale, lunediDellaSettimana } from "../core/tempo.ts";
import type { Conversazione, ModificaProposta } from "../core/tipi.ts";

export interface DatiSettimana {
  dal: string;
  al: string;
  chiamateGestite: number;
  prenotazioniPrese: number;
  prenotazioniFuoriOrario: number;
  passateAlTitolare: number;
  domandeSenzaRisposta: string[];
  correzioniApplicate: ModificaProposta[];
  daApprovare: ModificaProposta[];
  indicatori: Indicatori;
}

/** Indicatori della Parte 5B.6 e 15.3, per il fondatore: non vanno promessi al cliente. */
export interface Indicatori {
  /** risolte senza intervento umano / totale, tra 0 e 1; null senza conversazioni */
  quotaRisolte: number | null;
  domandeAperte: number;
  /** ore medie tra proposta e applicazione delle correzioni decise nel periodo */
  oreMedieCorrezione: number | null;
  /** quota delle proposte decise dal titolare entro 24 ore */
  quotaApprovateEntro24h: number | null;
}

export function periodoSettimana(lunedi: string, fuso: string): FiltroPeriodo {
  return {
    da: istanteDaLocale(lunedi, 0, fuso).toISOString(),
    a: istanteDaLocale(aggiungiGiorni(lunedi, 7), 0, fuso).toISOString(),
  };
}

function calcolaIndicatori(conversazioni: Conversazione[], decise: ModificaProposta[], domandeAperte: number): Indicatori {
  const classificate = conversazioni.filter((c) => c.esito);
  const risolte = classificate.filter((c) => c.esito?.esito === "risolta").length;
  const ore = decise
    .filter((m) => m.stato === "applicata" && m.decisaIl)
    .map((m) => (Date.parse(m.decisaIl!) - Date.parse(m.creataIl)) / 3_600_000);
  const delTitolare = decise.filter((m) => m.decisaDa === "titolare" && m.decisaIl);
  const entro24 = delTitolare.filter((m) => Date.parse(m.decisaIl!) - Date.parse(m.creataIl) <= 86_400_000).length;
  return {
    quotaRisolte: classificate.length ? risolte / classificate.length : null,
    domandeAperte,
    oreMedieCorrezione: ore.length ? ore.reduce((a, b) => a + b, 0) / ore.length : null,
    quotaApprovateEntro24h: delTitolare.length ? entro24 / delTitolare.length : null,
  };
}

export async function datiSettimana(archivio: Archivio, config: ConfigurazioneLocale, unGiorno: string): Promise<DatiSettimana> {
  const dal = lunediDellaSettimana(unGiorno);
  const periodo = periodoSettimana(dal, config.fusoOrario);
  const dentro = (iso: string | null) => iso !== null && iso >= periodo.da && iso < periodo.a;

  const [conversazioni, prenotazioni, segnalazioni, aperte, tutte] = await Promise.all([
    archivio.conversazioni(config.id, periodo),
    archivio.prenotazioniNelPeriodo(config.id, periodo),
    archivio.segnalazioni(config.id, { periodo }),
    archivio.segnalazioni(config.id, { stato: "aperta" }),
    archivio.modifiche(config.id),
  ]);
  const dallAssistente = prenotazioni.filter((p) => p.canale === "telefono" || p.canale === "whatsapp");
  const passate = conversazioni.filter((c) => c.esito?.esito === "passata_a_persona").length;
  const domande = [
    ...new Set(segnalazioni.filter((s) => s.tipo === "domanda_senza_risposta").map((s) => s.testo)),
  ];
  const decise = tutte.filter((m) => dentro(m.decisaIl));
  return {
    dal,
    al: aggiungiGiorni(dal, 6),
    chiamateGestite: conversazioni.filter((c) => c.canale === "telefono").length,
    prenotazioniPrese: dallAssistente.length,
    prenotazioniFuoriOrario: dallAssistente.filter((p) => p.fuoriOrario).length,
    passateAlTitolare:
      passate ||
      segnalazioni.filter((s) => s.tipo === "messaggio_titolare" || s.tipo === "gruppo_grande" || s.tipo === "richiesta_persona").length,
    domandeSenzaRisposta: domande,
    correzioniApplicate: decise.filter((m) => m.stato === "applicata"),
    daApprovare: tutte.filter((m) => m.stato === "proposta").sort((a, b) => a.numero - b.numero),
    indicatori: calcolaIndicatori(
      conversazioni,
      decise,
      aperte.filter((s) => s.tipo === "domanda_senza_risposta").length,
    ),
  };
}

/** Testo WhatsApp per il titolare: massimo 120 parole, niente promesse economiche. */
export function testoRapporto(config: ConfigurazioneLocale, d: DatiSettimana): string {
  const righe = [
    `Buongiorno ${config.titolare.nome}. Settimana dal ${dataBreve(d.dal)} al ${dataBreve(d.al)}:`,
    `chiamate gestite ${d.chiamateGestite}, prenotazioni prese ${d.prenotazioniPrese} (${d.prenotazioniFuoriOrario} fuori orario), richieste passate a voi ${d.passateAlTitolare}.`,
  ];
  if (d.domandeSenzaRisposta.length) {
    const esempi = d.domandeSenzaRisposta.slice(0, 2).map((x) => `"${x.slice(0, 60)}"`).join(", ");
    righe.push(`Domande a cui non ha saputo rispondere: ${d.domandeSenzaRisposta.length} (${esempi}).`);
  } else {
    righe.push("Nessuna domanda rimasta senza risposta.");
  }
  if (d.correzioniApplicate.length) {
    righe.push(`Imparato questa settimana: ${d.correzioniApplicate.slice(0, 3).map((m) => m.descrizione).join("; ")}.`);
  }
  const daApprovare = d.daApprovare.slice(0, 3);
  if (daApprovare.length) {
    righe.push(
      `${daApprovare.length === 1 ? "Una cosa" : `Le ${daApprovare.length} cose`} da approvare: ${daApprovare.map((m) => `${m.numero}) ${m.descrizione}`).join("; ")}.`,
    );
    righe.push(`Risponda ${daApprovare.map((m) => `"ok ${m.numero}"`).join(" o ")}, oppure "no" con il numero.`);
  }
  let testo = righe.join("\n");
  const parole = testo.split(/\s+/);
  if (parole.length > 120) testo = `${parole.slice(0, 118).join(" ")} […]`;
  return testo;
}

/** Versione per il fondatore, con gli indicatori di qualità. */
export function testoIndicatori(d: DatiSettimana): string {
  const pct = (x: number | null) => (x === null ? "n/d" : `${Math.round(x * 100)}%`);
  const i = d.indicatori;
  return [
    `Risolte senza intervento umano: ${pct(i.quotaRisolte)} (obiettivo 70% al giorno 30, 85% al giorno 90)`,
    `Domande senza risposta aperte: ${i.domandeAperte} (obiettivo meno di 10, poi meno di 3)`,
    `Tempo medio di correzione: ${i.oreMedieCorrezione === null ? "n/d" : `${Math.round(i.oreMedieCorrezione)} ore`} (obiettivo meno di 48, poi 24)`,
    `Approvate dal titolare entro 24 ore: ${pct(i.quotaApprovateEntro24h)} (obiettivo 60%, poi 80%)`,
  ].join("\n");
}
