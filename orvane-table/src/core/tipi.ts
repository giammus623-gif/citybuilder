// Tipi dei dati salvati. Rispecchiano le tabelle di supabase/migrations.

export type StatoPrenotazione = "confermata" | "da_confermare" | "annullata" | "completata" | "no_show";
export type Canale = "telefono" | "whatsapp" | "sito" | "titolare";

export interface Prenotazione {
  id: string;
  localeId: string;
  /** quattro cifre, facili da dire al telefono; unico tra le prenotazioni attive del locale */
  codice: string;
  /** segreto del collegamento per modificare o annullare */
  tokenGestione: string;
  nome: string;
  telefono: string;
  data: string;
  ora: string;
  persone: number;
  stato: StatoPrenotazione;
  canale: Canale;
  note: string | null;
  /** dato particolare (art. 9 GDPR): solo con consenso, cancellato dopo la data */
  noteSalute: string | null;
  consensoNoteSalute: boolean;
  /** creata quando il locale era chiuso: serve al rapporto settimanale */
  fuoriOrario: boolean;
  idConversazione: string | null;
  creataIl: string;
  aggiornataIl: string;
}

export type NuovaPrenotazione = Omit<Prenotazione, "id" | "creataIl" | "aggiornataIl">;

export type EsitoConversazione = "risolta" | "passata_a_persona" | "fallita" | "insoddisfatto";

export interface Turno {
  ruolo: "assistente" | "cliente";
  testo: string;
  secondo?: number;
}

export interface Conversazione {
  id: string;
  localeId: string;
  /** identificativo del fornitore vocale, per non salvare due volte la stessa chiamata */
  idEsterno: string;
  canale: "telefono" | "whatsapp" | "chat";
  iniziataIl: string;
  durataSecondi: number;
  telefonoChiamante: string | null;
  /** null dopo la scadenza: resta solo l'esito per le statistiche */
  trascrizione: Turno[] | null;
  riassunto: string | null;
  scadeIl: string;
  esito: {
    esito: EsitoConversazione;
    temi: string[];
    domandeSenzaRisposta: string[];
    classificatoDa: "sistema" | "fondatore" | "titolare";
  } | null;
}

export type TipoSegnalazione =
  | "messaggio_titolare"
  | "gruppo_grande"
  | "domanda_senza_risposta"
  | "richiesta_persona"
  | "correzione_staff"
  | "errore";

export interface Segnalazione {
  id: string;
  localeId: string;
  tipo: TipoSegnalazione;
  testo: string;
  urgenza: "bassa" | "normale" | "alta";
  nome: string | null;
  telefono: string | null;
  idConversazione: string | null;
  stato: "aperta" | "gestita";
  creataIl: string;
  gestitaIl: string | null;
}

export type TipoModifica =
  | "faq"
  | "chiusura_aggiungi"
  | "chiusura_rimuovi"
  | "istruzione_assistente"
  | "regola_prenotazione";

export interface ModificaProposta {
  id: string;
  localeId: string;
  /** numero progressivo del locale: il titolare risponde "ok 3" */
  numero: number;
  tipo: TipoModifica;
  descrizione: string;
  dati: Record<string, unknown>;
  motivo: string;
  origine: "analisi_settimanale" | "titolare" | "fondatore";
  stato: "proposta" | "applicata" | "rifiutata" | "annullata";
  /** prezzi, orari e regole di prenotazione: sempre il titolare (Parte 5B.4) */
  richiedeTitolare: boolean;
  /** sezione della configurazione prima della modifica, per tornare indietro */
  statoPrecedente: { sezione: string; valore: unknown } | null;
  creataIl: string;
  decisaIl: string | null;
  decisaDa: string | null;
}

export interface VoceRegistro {
  localeId: string;
  strumento: string;
  ingresso: unknown;
  risposta: unknown;
  ok: boolean;
  idConversazione: string | null;
  creataIl: string;
}

export interface MessaggioInviato {
  a: string;
  tipo: TipoMessaggio;
  testo: string;
  inviatoIl: string;
}

export type TipoMessaggio =
  | "conferma_prenotazione"
  | "modifica_prenotazione"
  | "annullamento_prenotazione"
  | "avviso_titolare"
  | "rapporto_settimanale"
  | "approvazione"
  | "risposta_comando";
