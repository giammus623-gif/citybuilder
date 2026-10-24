# Accordo sul trattamento dei dati (art. 28 GDPR) — bozza

> Bozza da far verificare a un consulente privacy (Parte 12.4 e 16.2: consulenza breve al quinto cliente attivo). Le parti tra parentesi quadre vanno compilate.

**Titolare del trattamento:** [ristorante], di seguito "Titolare".
**Responsabile del trattamento:** [Fornitore], di seguito "Responsabile".

### 1. Oggetto e durata

Il Responsabile tratta per conto del Titolare i dati personali necessari al servizio Orvane Table, per la durata del contratto di servizio e per il tempo necessario alla restituzione e cancellazione dei dati.

### 2. Natura e finalità

Gestione delle prenotazioni (telefono, sito, WhatsApp), risposta alle domande dei clienti del locale, avvisi al Titolare, rapporto settimanale e miglioramento dell'assistente per quel locale.

### 3. Tipi di dati e interessati

| Interessati | Dati | Conservazione |
|---|---|---|
| Clienti del locale che prenotano o chiamano | Nome, numero di telefono, data, ora, numero di persone, note della prenotazione | Per la gestione della prenotazione e gli obblighi di legge [durata: da fissare] |
| Clienti che chiamano l'assistente | Numero di chi chiama, trascrizione della conversazione (nessuna registrazione audio), esito | Trascrizione [60] giorni, poi resta solo l'esito senza dati personali |
| Clienti che indicano allergie o intolleranze | Note relative alla salute (dati particolari, art. 9) | Solo con consenso esplicito; cancellate il giorno dopo la data della prenotazione |
| Titolare e personale | Nome, telefono, messaggi di approvazione e comandi | Per la durata del contratto |

Registro tecnico delle chiamate agli strumenti dell'assistente: 90 giorni [da confermare].

### 4. Obblighi del Responsabile

1. Tratta i dati solo su istruzione documentata del Titolare (questo accordo e il contratto).
2. Garantisce che chi tratta i dati è vincolato alla riservatezza.
3. Adotta misure di sicurezza adeguate (art. 32), almeno: separazione dei dati di ogni locale con regole di accesso a livello di riga; cifratura dei collegamenti; segreti fuori dal codice; autenticazione a due fattori sugli account; cancellazione automatica dei dati scaduti; backup del database dal primo cliente.
4. Non usa i dati di un locale per migliorare il servizio di un altro, salvo domande generiche rese anonime e solo se previsto per iscritto.
5. Assiste il Titolare nel rispondere alle richieste degli interessati (accesso, rettifica, cancellazione, limitazione, opposizione, portabilità) entro 30 giorni.
6. Comunica al Titolare senza ingiustificato ritardo, e comunque entro [24/48] ore dalla scoperta, ogni violazione dei dati personali, con le informazioni dell'art. 33.3.
7. Alla fine del contratto restituisce i dati in un file leggibile e li cancella entro 30 giorni, salvo obblighi di legge.
8. Mette a disposizione le informazioni necessarie a dimostrare il rispetto dell'art. 28 e consente verifiche ragionevoli.

### 5. Sub-responsabili

Il Titolare autorizza in via generale i sub-responsabili sotto. Il Responsabile informa il Titolare di ogni aggiunta o sostituzione con almeno [15] giorni di anticipo; il Titolare può opporsi per motivi ragionevoli.

| Fornitore | Servizio | Dati | Localizzazione e garanzie |
|---|---|---|---|
| Supabase | Database e funzioni | Tutti | Regione UE scelta per il progetto [da verificare: condizioni e sub-fornitori] |
| ElevenLabs | Assistente vocale | Audio in transito, trascrizioni, numero di chi chiama | [da verificare: regioni di trattamento, conservazione, accordo sul trattamento del fornitore] |
| Fornitore del modello linguistico usato dall'agente | Comprensione e risposta | Testo della conversazione | [da verificare] |
| Fornitore di telefonia (es. Twilio o operatore SIP) | Instradamento delle chiamate | Numeri, metadati delle chiamate | [da verificare] |
| Meta (WhatsApp Business Platform) | Messaggi di conferma e avvisi | Numero, testo dei messaggi | [da verificare: trasferimenti fuori UE] |
| Hosting dei siti | Pubblicazione del sito del locale | Nessun dato di prenotazione (il modulo invia all'API) | [da verificare] |
| Modello linguistico per l'analisi settimanale | Raggruppamento dei casi falliti | Trascrizioni anonimizzate (nomi e numeri sostituiti) | [da verificare] |

Per i fornitori che trattano dati fuori dallo Spazio economico europeo vanno indicate le garanzie del trasferimento (decisione di adeguatezza, clausole contrattuali standard): **da verificare per ciascuno.**

### 6. Obblighi del Titolare

Pubblica l'informativa per i propri clienti (modello generato in `privacy.html` del sito), verifica le informazioni sugli allergeni, dà istruzioni lecite, comunica al Responsabile le richieste degli interessati che riceve direttamente.

### 7. Firma

Luogo e data ______________________

Il Titolare ______________________    Il Responsabile ______________________
