// L'interfaccia dell'archivio. Due implementazioni: in memoria (demo e test)
// e Postgres/Supabase. Ogni metodo riceve il localeId: nessuna scrittura
// senza un locale verificato (prompt 17.4).

import type { ConfigurazioneLocale } from "./configurazione.ts";
import type {
  Conversazione,
  ModificaProposta,
  NuovaPrenotazione,
  Prenotazione,
  Segnalazione,
  VoceRegistro,
} from "./tipi.ts";

export interface FiltroPeriodo {
  da: string; // istante ISO incluso
  a: string; // istante ISO escluso
}

export interface Archivio {
  configurazione(localeId: string): Promise<ConfigurazioneLocale | null>;
  configurazionePerSlug(slug: string): Promise<ConfigurazioneLocale | null>;
  salvaConfigurazione(config: ConfigurazioneLocale): Promise<void>;

  /** prenotazioni confermate o da confermare del giorno */
  prenotazioniAttive(localeId: string, data: string): Promise<Prenotazione[]>;
  /**
   * Legge le prenotazioni del giorno, chiede a `controllo` se la nuova ci sta e
   * solo allora la salva, il tutto in modo atomico: impedisce l'overbooking
   * quando due clienti prenotano nello stesso momento.
   */
  prenotaSeDisponibile(
    nuova: NuovaPrenotazione,
    controllo: (esistenti: Prenotazione[]) => boolean,
  ): Promise<Prenotazione | null>;
  /** come prenotaSeDisponibile, per spostare una prenotazione esistente */
  aggiornaSeDisponibile(
    localeId: string,
    id: string,
    campi: Partial<Pick<Prenotazione, "data" | "ora" | "persone" | "note" | "stato">>,
    controllo: (esistentiAltre: Prenotazione[]) => boolean,
  ): Promise<Prenotazione | null>;
  prenotazione(localeId: string, id: string): Promise<Prenotazione | null>;
  prenotazionePerCodice(localeId: string, codice: string): Promise<Prenotazione | null>;
  prenotazionePerToken(token: string): Promise<Prenotazione | null>;
  prenotazioniPerTelefono(localeId: string, telefono: string, dallaData: string): Promise<Prenotazione[]>;
  codiciAttivi(localeId: string): Promise<Set<string>>;
  prenotazioniNelPeriodo(localeId: string, periodo: FiltroPeriodo): Promise<Prenotazione[]>;

  creaSegnalazione(s: Omit<Segnalazione, "id" | "creataIl" | "gestitaIl" | "stato">): Promise<Segnalazione>;
  segnalazioni(localeId: string, filtro?: { stato?: Segnalazione["stato"]; periodo?: FiltroPeriodo }): Promise<Segnalazione[]>;
  chiudiSegnalazione(localeId: string, id: string, quando: string): Promise<void>;

  /** salva o aggiorna (stesso idEsterno) una conversazione con il suo esito */
  salvaConversazione(c: Omit<Conversazione, "id">): Promise<Conversazione>;
  conversazioni(localeId: string, periodo: FiltroPeriodo): Promise<Conversazione[]>;

  creaModifica(
    m: Omit<ModificaProposta, "id" | "numero" | "creataIl" | "decisaIl" | "decisaDa" | "stato" | "statoPrecedente">,
  ): Promise<ModificaProposta>;
  modifiche(localeId: string, stato?: ModificaProposta["stato"]): Promise<ModificaProposta[]>;
  modificaPerNumero(localeId: string, numero: number): Promise<ModificaProposta | null>;
  aggiornaModifica(
    localeId: string,
    id: string,
    campi: Pick<ModificaProposta, "stato" | "decisaIl" | "decisaDa" | "statoPrecedente">,
  ): Promise<void>;

  registra(voce: VoceRegistro): Promise<void>;
  /** chiamate agli strumenti fatte durante una conversazione: servono a classificarne l'esito */
  registroConversazione(localeId: string, idConversazione: string): Promise<VoceRegistro[]>;

  /** tutti i dati del locale in un solo oggetto (Parte 6.2, esportazione) */
  esporta(localeId: string): Promise<Record<string, unknown>>;
  /** cancella trascrizioni scadute e note sanitarie passate (Parte 12.4) */
  pulisciScaduti(adesso: string, oggi: string): Promise<{ trascrizioni: number; noteSalute: number; registro: number }>;
}
