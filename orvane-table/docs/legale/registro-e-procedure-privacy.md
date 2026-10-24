# Registro dei trattamenti e procedure privacy

Una pagina per cliente (Parte 12.4). Il Fornitore, come responsabile del trattamento, tiene il registro delle attività svolte per conto di ciascun titolare (art. 30.2 GDPR). Modello da verificare con un consulente privacy.

## Registro del responsabile — una scheda per locale

| Voce | Valore |
|---|---|
| Titolare del trattamento | [ristorante, indirizzo, email privacy] |
| Responsabile | [Fornitore, indirizzo, PEC] |
| Categorie di trattamento | Gestione prenotazioni; risposta alle chiamate con assistente virtuale; messaggi di conferma e avvisi; rapporto settimanale e miglioramento dell'assistente |
| Categorie di interessati | Clienti del locale; titolare e personale |
| Categorie di dati | Identificativi e contatto; dati della prenotazione; trascrizioni; note sanitarie solo con consenso |
| Sub-responsabili | Elenco dell'accordo sul trattamento, sezione 5 |
| Trasferimenti fuori SEE | [per fornitore, con garanzia] |
| Misure di sicurezza | Regole di accesso per locale; segreti nelle variabili d'ambiente; 2FA; cancellazione automatica (`pulisci_dati_scaduti`); backup giornaliero dal primo cliente |
| Conservazione | Trascrizioni [60] giorni; note sanitarie fino al giorno dopo la prenotazione; registro strumenti 90 giorni |
| Data di inizio | [data di attivazione] |

## Procedura: richieste degli interessati (entro 30 giorni)

1. La richiesta arriva al ristorante (titolare) o al Fornitore. Se arriva al Fornitore, la si gira al titolare in giornata.
2. Verificare l'identità: un numero di telefono che corrisponde a quello della prenotazione, o un altro riscontro ragionevole.
3. **Accesso o portabilità:** `npm run esporta -- <slug>` e estrarre solo le righe di quell'interessato (prenotazioni con quel telefono, conversazioni con quel numero).
4. **Cancellazione:** cancellare le prenotazioni future su richiesta, togliere nome e telefono dalle passate se non servono a obblighi di legge, azzerare trascrizioni e numero nelle conversazioni.
5. Rispondere per iscritto e annotare qui data, richiesta, esito.

| Data | Locale | Richiesta | Esito | Chiusa il |
|---|---|---|---|---|
| | | | | |

## Procedura: violazione dei dati

1. Contenere subito: ruotare i segreti (`ORVANE_SEGRETO_*`, token WhatsApp, chiavi ElevenLabs e Supabase), disattivare la funzione se serve.
2. Entro [24/48] ore avvisare il titolare con: cosa è successo, quali dati, quanti interessati, conseguenze probabili, misure prese (art. 33.3).
3. Il titolare decide la notifica al Garante entro 72 ore e l'eventuale comunicazione agli interessati.
4. Scrivere tre righe nel registro degli incidenti (`operativita/incidenti-e-chiusura.md`) e aggiornare la procedura.

## Controlli trimestrali (Parte 12.9)

- [ ] Listini e condizioni di ElevenLabs, Supabase, Meta, telefonia.
- [ ] Norme: AI Act (art. 50), indicazioni del Garante, regole su WhatsApp e Registro delle opposizioni.
- [ ] Prova di cancellazione: `select public.pulisci_dati_scaduti();` restituisce numeri coerenti.
- [ ] Prova di ripristino di un backup.
