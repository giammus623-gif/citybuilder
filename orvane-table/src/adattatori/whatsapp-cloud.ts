// Invio con WhatsApp Business Platform (Cloud API di Meta).
// I messaggi iniziati dall'azienda fuori dalla finestra di 24 ore (per esempio
// la conferma dopo una telefonata) richiedono un modello approvato da Meta e
// sono a pagamento: qui ogni tipo di messaggio si associa a un modello.
// Versione dell'API, nomi dei modelli e prezzi: da verificare sulla
// documentazione Meta prima dell'attivazione.

import type { Messaggero, Messaggio } from "../core/messaggero.ts";
import type { TipoMessaggio } from "../core/tipi.ts";

export interface OpzioniWhatsApp {
  token: string;
  idNumero: string;
  versioneApi: string;
  /** nome e lingua del modello approvato per ciascun tipo; senza modello si manda testo libero */
  modelli: Partial<Record<TipoMessaggio, { nome: string; lingua: string }>>;
  fetch?: typeof fetch;
}

export class MessaggeroWhatsApp implements Messaggero {
  constructor(private readonly o: OpzioniWhatsApp) {}

  async invia(m: Messaggio) {
    const modello = this.o.modelli[m.tipo];
    const corpo = modello
      ? {
          messaging_product: "whatsapp",
          to: m.a.replace("+", ""),
          type: "template",
          template: {
            name: modello.nome,
            language: { code: modello.lingua },
            components: m.parametri?.length
              ? [{ type: "body", parameters: m.parametri.map((t) => ({ type: "text", text: t.slice(0, 1000) })) }]
              : [],
          },
        }
      : { messaging_product: "whatsapp", to: m.a.replace("+", ""), type: "text", text: { body: m.testo.slice(0, 4096) } };
    const risposta = await (this.o.fetch ?? fetch)(`https://graph.facebook.com/${this.o.versioneApi}/${this.o.idNumero}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.o.token}`, "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    if (risposta.ok) return { ok: true };
    return { ok: false, errore: `WhatsApp ${risposta.status}: ${(await risposta.text()).slice(0, 300)}` };
  }
}

/** Scrive su console: per le prove senza account WhatsApp. */
export class MessaggeroConsole implements Messaggero {
  async invia(m: Messaggio) {
    console.log(`[messaggio ${m.tipo} a ${m.a}]\n${m.testo}\n`);
    return { ok: true };
  }
}
