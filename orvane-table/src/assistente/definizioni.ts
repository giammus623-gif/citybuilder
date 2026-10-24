// Descrizione degli strumenti per la piattaforma vocale: cosa fa ciascuno e
// quali parametri deve passare il modello. Una sola fonte, usata dalla
// configurazione ElevenLabs e dalla documentazione.

import { TEMI } from "../core/configurazione.ts";
import type { NomeStrumento } from "./strumenti.ts";

export interface Parametro {
  tipo: "string" | "integer" | "boolean";
  descrizione: string;
  obbligatorio?: boolean;
  valori?: readonly string[];
}

export interface DefinizioneStrumento {
  nome: NomeStrumento;
  descrizione: string;
  parametri: Record<string, Parametro>;
}

const data: Parametro = {
  tipo: "string",
  obbligatorio: true,
  descrizione: 'Giorno come detto dal cliente o in formato AAAA-MM-GG: "domani", "sabato", "7/11", "2026-11-07".',
};
const ora: Parametro = { tipo: "string", obbligatorio: true, descrizione: 'Orario HH:MM, es. "20:30".' };
const persone: Parametro = { tipo: "integer", obbligatorio: true, descrizione: "Numero di persone, bambini compresi." };
const codice: Parametro = { tipo: "string", descrizione: "Codice di quattro cifre della prenotazione, se il cliente lo ha." };
const telefono: Parametro = {
  tipo: "string",
  descrizione: "Numero di telefono detto dal cliente. Lascia vuoto se il cliente chiama dallo stesso numero della prenotazione.",
};

export const DEFINIZIONI: DefinizioneStrumento[] = [
  {
    nome: "verifica_disponibilita",
    descrizione: "Controlla se c'è posto per un giorno, un orario e un numero di persone. Usalo sempre prima di confermare.",
    parametri: { data, ora, persone },
  },
  {
    nome: "crea_prenotazione",
    descrizione:
      "Salva la prenotazione dopo che il cliente ha confermato il riepilogo. Manda il messaggio di conferma. Per i gruppi grandi registra la richiesta per il titolare.",
    parametri: {
      nome: { tipo: "string", obbligatorio: true, descrizione: "Nome e cognome a cui intestare la prenotazione." },
      telefono,
      data,
      ora,
      persone,
      note: { tipo: "string", descrizione: "Esigenze non sanitarie: seggiolone, tavolo all'aperto, compleanno." },
      note_salute: {
        tipo: "string",
        descrizione: "Allergie o intolleranze da annotare. Solo se il cliente ha dato il consenso esplicito.",
      },
      consenso_note_salute: {
        tipo: "boolean",
        descrizione: "true solo se il cliente ha detto sì alla domanda se può annotare allergie o intolleranze.",
      },
    },
  },
  {
    nome: "modifica_prenotazione",
    descrizione: "Cambia giorno, orario o numero di persone di una prenotazione esistente del cliente.",
    parametri: {
      codice,
      telefono,
      data: { tipo: "string", descrizione: "Giorno della prenotazione attuale, se il cliente ne ha più di una." },
      nuova_data: { tipo: "string", descrizione: "Nuovo giorno, se cambia." },
      nuova_ora: { tipo: "string", descrizione: "Nuovo orario HH:MM, se cambia." },
      nuove_persone: { tipo: "integer", descrizione: "Nuovo numero di persone, se cambia." },
      note: { tipo: "string", descrizione: "Nuove note non sanitarie, se cambiano." },
    },
  },
  {
    nome: "annulla_prenotazione",
    descrizione: "Annulla una prenotazione del cliente dopo aver chiesto conferma.",
    parametri: {
      codice,
      telefono,
      data: { tipo: "string", descrizione: "Giorno della prenotazione da annullare, se il cliente ne ha più di una." },
    },
  },
  {
    nome: "leggi_informazioni",
    descrizione: "Legge le informazioni verificate del locale. Usalo per ogni domanda su orari, menu, prezzi, servizi, allergie.",
    parametri: {
      tema: { tipo: "string", obbligatorio: true, valori: TEMI, descrizione: "Argomento della domanda." },
      domanda: { tipo: "string", descrizione: "La domanda del cliente con le sue parole." },
      piatto: { tipo: "string", descrizione: "Nome del piatto, per le domande sugli allergeni di un piatto." },
    },
  },
  {
    nome: "lascia_messaggio_al_titolare",
    descrizione: "Lascia un messaggio al titolare e lo avvisa subito su WhatsApp. Usalo quando non sai rispondere o il cliente lo chiede.",
    parametri: {
      testo: { tipo: "string", obbligatorio: true, descrizione: "Il messaggio, chiaro e completo, con cosa chiede il cliente." },
      nome: { tipo: "string", descrizione: "Nome del cliente." },
      telefono,
      urgenza: { tipo: "string", valori: ["bassa", "normale", "alta"], descrizione: "alta solo se riguarda oggi o un problema." },
      richiesta_persona: { tipo: "boolean", descrizione: "true se il cliente ha chiesto di parlare con una persona." },
    },
  },
  {
    nome: "trasferisci_chiamata",
    descrizione:
      "Controlla se in questo momento si può passare la chiamata a una persona del locale. Se risponde consentito=true usa lo strumento transfer_to_number, altrimenti lascia un messaggio.",
    parametri: { motivo: { tipo: "string", descrizione: "Perché il cliente vuole parlare con una persona." } },
  },
];
