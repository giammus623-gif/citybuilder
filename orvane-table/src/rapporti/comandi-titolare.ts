// I comandi che il titolare manda su WhatsApp (Parte 13.2: la scheda con i
// cinque comandi principali). Volutamente rigidi: niente interpretazione
// libera, così una frase ambigua non cambia mai orari o regole.

import type { Archivio } from "../core/archivio.ts";
import type { ConfigurazioneLocale } from "../core/configurazione.ts";
import { aggiungiGiorni, dataBreve, dataInParole, interpretaData, istanteLocale } from "../core/tempo.ts";
import { decidi, proponi } from "./miglioramento.ts";

export const AIUTO_TITOLARE = [
  "Comandi:",
  "OK 3 - approva la proposta numero 3 (anche OK 3 4)",
  "NO 3 - scarta la proposta numero 3",
  "CHIUSO 10/11 ferie - chiusura straordinaria (anche CHIUSO 10/11 - 12/11)",
  "APERTO 10/11 - toglie una chiusura",
  "OGGI o DOMANI - elenco delle prenotazioni",
  "Qualsiasi altro messaggio arriva al fondatore come segnalazione.",
].join("\n");

export async function gestisciMessaggioTitolare(
  archivio: Archivio,
  config: ConfigurazioneLocale,
  testoGrezzo: string,
  adesso: Date,
): Promise<string> {
  const testo = testoGrezzo.trim().replace(/\s+/g, " ");
  const minuscolo = testo.toLowerCase();
  const oggi = istanteLocale(adesso, config.fusoOrario).data;

  if (["aiuto", "help", "?", "comandi"].includes(minuscolo)) return AIUTO_TITOLARE;

  const decisione = /^(ok|sì|si|no)\b[\s:]*((?:\d+[\s,e]*)*)$/i.exec(testo);
  if (decisione) {
    const verso = decisione[1].toLowerCase() === "no" ? "no" : "ok";
    let numeri = (decisione[2].match(/\d+/g) ?? []).map(Number);
    if (numeri.length === 0) {
      const aperte = await archivio.modifiche(config.id, "proposta");
      if (aperte.length !== 1) {
        return aperte.length === 0
          ? "Non ci sono proposte da approvare."
          : `Ci sono ${aperte.length} proposte aperte: scriva il numero, per esempio "${verso.toUpperCase()} ${aperte[0].numero}".`;
      }
      numeri = [aperte[0].numero];
    }
    const righe: string[] = [];
    for (const n of numeri) {
      const e = await decidi(archivio, config.id, n, verso, "titolare", adesso);
      righe.push(e.ok ? `${n}: ${e.stato === "applicata" ? "fatto, da ora l'assistente lo sa" : "scartata"}.` : `${n}: ${e.motivo}`);
    }
    return righe.join("\n");
  }

  const chiuso = /^chius[oa]\s+(\S+)(?:\s*(?:-|al)\s*(\S+))?(?:\s+(.+))?$/i.exec(testo);
  if (chiuso) {
    const dal = interpretaData(chiuso[1], oggi);
    const al = chiuso[2] ? interpretaData(chiuso[2], oggi) : dal;
    if (!dal || !al || al < dal) return 'Non ho capito le date. Esempio: "CHIUSO 10/11 ferie" oppure "CHIUSO 10/11 - 12/11".';
    const motivo = chiuso[3]?.trim() || "chiusura straordinaria";
    const m = await proponi(archivio, config, {
      tipo: "chiusura_aggiungi",
      descrizione: dal === al ? `Chiuso ${dataInParole(dal)} (${motivo})` : `Chiuso dal ${dataInParole(dal)} al ${dataInParole(al)} (${motivo})`,
      dati: { dal, al, motivo },
      motivo: "richiesta del titolare su WhatsApp",
      origine: "titolare",
    });
    return `${m.descrizione}. Le prenotazioni già prese in quei giorni restano: le controlli. Confermi? Risponda OK ${m.numero}.`;
  }

  const aperto = /^apert[oa]\s+(\S+)$/i.exec(testo);
  if (aperto) {
    const giorno = interpretaData(aperto[1], oggi);
    if (!giorno) return 'Non ho capito la data. Esempio: "APERTO 10/11".';
    if (!config.chiusure.some((c) => c.dal <= giorno && giorno <= c.al)) return `Il ${dataBreve(giorno)} non risulta nessuna chiusura.`;
    const m = await proponi(archivio, config, {
      tipo: "chiusura_rimuovi",
      descrizione: `Tolta la chiusura che comprende ${dataInParole(giorno)}`,
      dati: { dal: giorno },
      motivo: "richiesta del titolare su WhatsApp",
      origine: "titolare",
    });
    return `${m.descrizione}. Confermi? Risponda OK ${m.numero}.`;
  }

  if (minuscolo === "oggi" || minuscolo === "domani" || minuscolo === "prenotazioni") {
    const giorno = minuscolo === "domani" ? aggiungiGiorni(oggi, 1) : oggi;
    const elenco = (await archivio.prenotazioniAttive(config.id, giorno)).sort((a, b) => a.ora.localeCompare(b.ora));
    if (!elenco.length) return `${dataInParole(giorno)}: nessuna prenotazione.`;
    const coperti = elenco.reduce((s, p) => s + p.persone, 0);
    return [
      `${dataInParole(giorno)}: ${elenco.length} prenotazioni, ${coperti} coperti.`,
      ...elenco.map((p) => `${p.ora} ${p.nome} (${p.persone})${p.stato === "da_confermare" ? " DA CONFERMARE" : ""}${p.note ? ` - ${p.note}` : ""}`),
    ].join("\n");
  }

  await archivio.creaSegnalazione({
    localeId: config.id,
    tipo: "correzione_staff",
    testo,
    urgenza: "normale",
    nome: config.titolare.nome,
    telefono: config.titolare.telefono,
    idConversazione: null,
  });
  return `Ricevuto, lo giro al fondatore entro 24 ore lavorative.\n${AIUTO_TITOLARE}`;
}
