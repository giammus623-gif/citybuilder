// Regole di disponibilità: quando si può prenotare e se c'è posto.
// Funzioni pure, senza archivio: si provano con i test e si riusano
// dall'assistente, dal sito e dal titolare.

import type { ConfigurazioneLocale } from "./configurazione.ts";
import type { Prenotazione } from "./tipi.ts";
import { aggiungiGiorni, differenzaGiorni, giornoSettimana, minutiDa, oraDa, type Istante } from "./tempo.ts";

export interface FasciaMinuti {
  dalle: number;
  /** può superare 1440 se il locale chiude dopo mezzanotte */
  alle: number;
}

export function chiusuraDel(config: ConfigurazioneLocale, data: string) {
  return config.chiusure.find((c) => c.dal <= data && data <= c.al) ?? null;
}

export function fasceDelGiorno(config: ConfigurazioneLocale, data: string): FasciaMinuti[] {
  if (chiusuraDel(config, data)) return [];
  return config.orari[giornoSettimana(data)].map((f) => {
    const dalle = minutiDa(f.dalle);
    let alle = minutiDa(f.alle);
    if (alle <= dalle) alle += 1440;
    return { dalle, alle };
  });
}

/** Orari d'inizio prenotabili del giorno, in minuti, ignorando l'occupazione. */
export function orariPrenotabili(config: ConfigurazioneLocale, data: string): number[] {
  const { intervalloMinuti, ultimaPrenotazioneMinutiPrimaChiusura } = config.prenotazioni;
  const orari: number[] = [];
  for (const f of fasceDelGiorno(config, data)) {
    const ultima = Math.min(f.alle - ultimaPrenotazioneMinutiPrimaChiusura, 1440 - intervalloMinuti);
    for (let m = f.dalle; m <= ultima; m += intervalloMinuti) orari.push(m);
  }
  return orari;
}

/** Vero se il locale è aperto in questo istante: serve a marcare le prenotazioni "fuori orario". */
export function apertoAdesso(config: ConfigurazioneLocale, adesso: Istante): boolean {
  const oggi = fasceDelGiorno(config, adesso.data).some((f) => adesso.minuti >= f.dalle && adesso.minuti < f.alle);
  if (oggi) return true;
  // fascia di ieri che continua dopo mezzanotte
  const ieri = aggiungiGiorni(adesso.data, -1);
  return fasceDelGiorno(config, ieri).some((f) => f.alle > 1440 && adesso.minuti < f.alle - 1440);
}

/**
 * "Alle 8" detto per una cena: se le 8:00 non sono prenotabili ma le 20:00 sì,
 * si intende 20:00. La risposta all'assistente ripete sempre l'orario scelto.
 */
export function risolviOraAmbigua(config: ConfigurazioneLocale, data: string, minuti: number): number {
  if (minuti >= 720) return minuti;
  const orari = orariPrenotabili(config, data);
  const inFascia = (m: number) => fasceDelGiorno(config, data).some((f) => m >= f.dalle && m < f.alle);
  if (!inFascia(minuti) && (orari.includes(minuti + 720) || inFascia(minuti + 720))) return minuti + 720;
  return minuti;
}

/** Massimo numero di coperti occupati insieme nella finestra della nuova prenotazione. */
export function piccoCoperti(esistenti: Prenotazione[], inizio: number, durata: number, persone: number): number {
  const attive = esistenti.filter((p) => p.stato === "confermata" || p.stato === "da_confermare");
  const inizi = attive.map((p) => minutiDa(p.ora));
  const punti = [inizio, ...inizi.filter((m) => m > inizio && m < inizio + durata)];
  let picco = 0;
  for (const punto of punti) {
    let occupati = persone;
    attive.forEach((p, i) => {
      if (inizi[i] <= punto && punto < inizi[i] + durata) occupati += p.persone;
    });
    picco = Math.max(picco, occupati);
  }
  return picco;
}

export type MotivoNonDisponibile =
  | "persone_non_valide"
  | "passato"
  | "troppo_presto"
  | "troppo_lontano"
  | "chiuso"
  | "fuori_orario"
  | "pieno"
  | "gruppo_grande";

export type EsitoVerifica = { disponibile: true } | { disponibile: false; motivo: MotivoNonDisponibile };

export function minutiDaAdesso(adesso: Istante, data: string, minuti: number): number {
  return differenzaGiorni(adesso.data, data) * 1440 + minuti - adesso.minuti;
}

/**
 * Controllo completo, nell'ordine in cui conviene spiegarlo al cliente.
 * `esistenti` sono le prenotazioni attive dello stesso giorno.
 */
export function verificaPrenotazione(
  config: ConfigurazioneLocale,
  esistenti: Prenotazione[],
  data: string,
  minuti: number,
  persone: number,
  adesso: Istante,
  opzioni: { ignoraLimiteGruppo?: boolean } = {},
): EsitoVerifica {
  const regole = config.prenotazioni;
  if (!Number.isInteger(persone) || persone < 1 || persone > regole.maxPersone) {
    return { disponibile: false, motivo: "persone_non_valide" };
  }
  const anticipo = minutiDaAdesso(adesso, data, minuti);
  if (anticipo < 0) return { disponibile: false, motivo: "passato" };
  if (anticipo < regole.anticipoMinimoMinuti) return { disponibile: false, motivo: "troppo_presto" };
  if (differenzaGiorni(adesso.data, data) > regole.giorniMassimiAnticipo) {
    return { disponibile: false, motivo: "troppo_lontano" };
  }
  if (fasceDelGiorno(config, data).length === 0) return { disponibile: false, motivo: "chiuso" };
  if (!orariPrenotabili(config, data).includes(minuti)) return { disponibile: false, motivo: "fuori_orario" };
  if (piccoCoperti(esistenti, minuti, regole.durataTavoloMinuti, persone) > regole.capienzaCoperti) {
    return { disponibile: false, motivo: "pieno" };
  }
  if (!opzioni.ignoraLimiteGruppo && persone > regole.maxPersoneSenzaTitolare) {
    return { disponibile: false, motivo: "gruppo_grande" };
  }
  return { disponibile: true };
}

/** Orari liberi dello stesso giorno, i più vicini a quello chiesto. */
export function orariLiberiVicini(
  config: ConfigurazioneLocale,
  esistenti: Prenotazione[],
  data: string,
  minuti: number,
  persone: number,
  adesso: Istante,
  quanti = 3,
): string[] {
  return orariPrenotabili(config, data)
    .filter((m) => m !== minuti)
    .filter((m) => {
      const e = verificaPrenotazione(config, esistenti, data, m, persone, adesso, { ignoraLimiteGruppo: true });
      return e.disponibile;
    })
    .sort((a, b) => Math.abs(a - minuti) - Math.abs(b - minuti) || a - b)
    .slice(0, quanti)
    .sort((a, b) => a - b)
    .map(oraDa);
}

export function descriviOrari(config: ConfigurazioneLocale): string {
  const nomi = { lun: "lunedì", mar: "martedì", mer: "mercoledì", gio: "giovedì", ven: "venerdì", sab: "sabato", dom: "domenica" };
  return (Object.keys(nomi) as (keyof typeof nomi)[])
    .map((g) => {
      const fasce = config.orari[g];
      const testo = fasce.length ? fasce.map((f) => `${f.dalle}-${f.alle}`).join(" e ") : "chiuso";
      return `${nomi[g]}: ${testo}`;
    })
    .join("; ");
}
