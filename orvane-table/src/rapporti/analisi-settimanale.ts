// Prepara il materiale per l'analisi settimanale dei casi falliti
// (Parte 5B.2, prompt 17.5): conversazioni non riuscite, anonimizzate, e il
// prompt pronto da incollare in un assistente AI. Il fondatore controlla le
// proposte prima di inviarle al titolare.

import type { Archivio } from "../core/archivio.ts";
import type { ConfigurazioneLocale } from "../core/configurazione.ts";
import { anonimizza } from "../core/validazione.ts";
import { datiSettimana, periodoSettimana } from "./rapporto-settimanale.ts";

export const PROMPT_ANALISI = `Ti do le conversazioni della settimana del ristorante [NOME] con esito e trascrizione. Compito: 1) raggruppa i casi falliti o passati a una persona per causa (informazione mancante, frase non capita, regola non prevista, errore dell'assistente); 2) per ogni gruppo scrivi massimo tre esempi, la proposta di correzione (nuova risposta, nuova regola o nuova informazione) e il rischio che la correzione peggiori altri casi; 3) indica quali conversazioni già risolte bene vanno usate per ritestare la correzione; 4) proponi al massimo cinque modifiche in ordine di impatto. Vietato: proporre cambi di prezzo, orari o regole di prenotazione senza segnalarlo come «da approvare dal titolare»; usare dati personali dei clienti nelle proposte (sostituisci nomi e numeri con segnaposto). Output: tabella con gruppo, causa, esempi, proposta, rischio, test da fare, e un messaggio WhatsApp di massimo 600 caratteri per il titolare con due modifiche da approvare.

Per ogni modifica proposta aggiungi anche una riga JSON nel formato:
{"tipo": "faq" | "istruzione_assistente" | "chiusura_aggiungi" | "regola_prenotazione", "descrizione": "...", "dati": {...}, "motivo": "..."}
dove per "faq" dati = {"tema", "domanda", "risposta"} e per "istruzione_assistente" dati = {"testo"}.`;

export async function preparaAnalisi(archivio: Archivio, config: ConfigurazioneLocale, unGiorno: string): Promise<string> {
  const dati = await datiSettimana(archivio, config, unGiorno);
  const periodo = periodoSettimana(dati.dal, config.fusoOrario);
  const conversazioni = await archivio.conversazioni(config.id, periodo);
  const prenotazioni = await archivio.prenotazioniNelPeriodo(config.id, periodo);
  const nomi = [...new Set(prenotazioni.map((p) => p.nome).flatMap((n) => [n, ...n.split(" ")]))];

  const pulisci = (t: string) => anonimizza(t, nomi);
  const problematiche = conversazioni.filter((c) => c.esito && c.esito.esito !== "risolta");
  const riuscite = conversazioni.filter((c) => c.esito?.esito === "risolta").slice(0, 10);
  const blocco = (c: (typeof conversazioni)[number]) => ({
    id: c.id.slice(0, 8),
    esito: c.esito?.esito,
    temi: c.esito?.temi,
    domande_senza_risposta: c.esito?.domandeSenzaRisposta.map(pulisci),
    trascrizione: c.trascrizione?.map((t) => `${t.ruolo}: ${pulisci(t.testo)}`) ?? "(scaduta)",
  });

  return [
    `# Analisi settimanale - ${config.nome} - settimana dal ${dati.dal}`,
    "",
    "Contesto: incolla prima il contesto breve del progetto (prompt/LIBRERIA.md, sezione 17.0).",
    "",
    "## Prompt",
    "",
    PROMPT_ANALISI.replace("[NOME]", config.nome),
    "",
    `## Conversazioni non risolte (${problematiche.length})`,
    "",
    "```json",
    JSON.stringify(problematiche.map(blocco), null, 2),
    "```",
    "",
    `## Conversazioni risolte bene, per ritestare le correzioni (${riuscite.length})`,
    "",
    "```json",
    JSON.stringify(riuscite.map(blocco), null, 2),
    "```",
    "",
    "## Domande senza risposta segnalate",
    "",
    ...(dati.domandeSenzaRisposta.length ? dati.domandeSenzaRisposta.map((d) => `- ${pulisci(d)}`) : ["- nessuna"]),
    "",
  ].join("\n");
}
