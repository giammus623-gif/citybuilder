// Testi dei messaggi ai clienti. Brevi, senza promesse, con il nome del locale.

import type { ConfigurazioneLocale } from "../core/configurazione.ts";
import { dataInParole } from "../core/tempo.ts";
import type { Prenotazione } from "../core/tipi.ts";

export function testoConferma(config: ConfigurazioneLocale, p: Prenotazione, urlBase: string): string {
  return [
    `${config.nome}: prenotazione confermata per ${dataInParole(p.data)} alle ${p.ora}, ${p.persone} ${p.persone === 1 ? "persona" : "persone"}, a nome ${p.nome}.`,
    `Codice ${p.codice}. Per modificare o annullare: ${urlBase}/p/${p.tokenGestione}`,
    `Per informazioni: ${config.contatti.telefono}.`,
  ].join("\n");
}

export function testoModifica(config: ConfigurazioneLocale, p: Prenotazione, urlBase: string): string {
  return [
    `${config.nome}: prenotazione modificata. Ora è per ${dataInParole(p.data)} alle ${p.ora}, ${p.persone} ${p.persone === 1 ? "persona" : "persone"}.`,
    `Codice ${p.codice}. Gestisci la prenotazione: ${urlBase}/p/${p.tokenGestione}`,
  ].join("\n");
}

export function testoAnnullamento(config: ConfigurazioneLocale, p: Prenotazione): string {
  return `${config.nome}: la prenotazione di ${dataInParole(p.data)} alle ${p.ora} è annullata. A presto!`;
}
