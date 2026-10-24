// Invio di messaggi (WhatsApp, SMS, console). Il resto del codice conosce
// solo questa interfaccia: il fornitore si cambia senza toccare la logica.

import type { MessaggioInviato, TipoMessaggio } from "./tipi.ts";

export interface Messaggio {
  a: string;
  tipo: TipoMessaggio;
  testo: string;
  /** valori per i modelli approvati (WhatsApp li richiede fuori dalla finestra di 24 ore) */
  parametri?: string[];
}

export interface Messaggero {
  invia(m: Messaggio): Promise<{ ok: boolean; errore?: string }>;
}

/** Tiene i messaggi in memoria: per la demo e per i test. */
export class MessaggeroMemoria implements Messaggero {
  readonly inviati: MessaggioInviato[] = [];
  constructor(private readonly ora: () => Date = () => new Date()) {}

  async invia(m: Messaggio) {
    this.inviati.push({ a: m.a, tipo: m.tipo, testo: m.testo, inviatoIl: this.ora().toISOString() });
    return { ok: true };
  }
}

/** Prova più messaggeri in ordine: per esempio WhatsApp e, se fallisce, SMS. */
export class MessaggeroConRiserva implements Messaggero {
  constructor(private readonly messaggeri: Messaggero[]) {}

  async invia(m: Messaggio) {
    let errore = "nessun messaggero configurato";
    for (const messaggero of this.messaggeri) {
      try {
        const r = await messaggero.invia(m);
        if (r.ok) return r;
        errore = r.errore ?? errore;
      } catch (e) {
        errore = e instanceof Error ? e.message : String(e);
      }
    }
    return { ok: false, errore };
  }
}
