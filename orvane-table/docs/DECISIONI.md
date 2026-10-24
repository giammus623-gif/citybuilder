# Decisioni e segnalazioni

Registro delle scelte prese costruendo il repository e delle cose che il prompt master non dice o dice in modo incoerente. La Parte 2.8 chiede di segnalare al fondatore ogni proposta che viola un vincolo, anche se richiesta da lui: le prime righe sono proprio queste.

## Segnalazioni al fondatore

| # | Cosa | Perché conta | Cosa ho fatto |
|---|---|---|---|
| S1 | **"Elaborare al massimo" non può voler dire costruire tutto.** La Parte 0.2 (regola 4) e la Parte 6 vietano di sviluppare funzioni non ancora vendute: il gestionale Premium, la stampa in cucina, i pagamenti, l'app nativa restano fuori. | Ogni ora su una funzione non venduta è un'ora tolta alle 14 visite a settimana. | Costruite solo le fasi 0 e 1 della Parte 6 (demo e base attivabile), che il piano prevede prima del primo incasso, più gli strumenti di vendita. `src/gestionale/` contiene solo il perché del rinvio. |
| S2 | **Fonio vende 1.000 minuti a 119 €/mese** (99 € con l'annuale), il Pro ne include 250 a 129 €. | È il caso della Parte 7.6: se un concorrente offre un servizio simile vicino a 100 €, il Pro va venduto come servizio completo, non come minuti. | Segnalato in `ricerca/concorrenti.md`. Il prezzo non l'ho toccato: si valida nelle prime dieci conversazioni (Parte 4.6). |
| S3 | **La conferma su WhatsApp dopo una telefonata non è un messaggio "di servizio".** Il cliente ha telefonato, non ha scritto: per WhatsApp è un messaggio iniziato dall'azienda, che richiede un modello approvato da Meta ed è a pagamento. Lo stesso vale per gli avvisi al titolare se non ha scritto nelle ultime 24 ore. | Il costo è piccolo ma non è zero, e serve l'approvazione dei modelli prima di attivare un cliente. Prezzi da verificare sulla documentazione Meta. | `src/adattatori/whatsapp-cloud.ts` usa un modello per ciascun tipo di messaggio (variabile `WHATSAPP_MODELLI`). In alternativa SMS: l'interfaccia `Messaggero` permette di aggiungerlo. |
| S4 | **Il trasferimento di chiamata non deve tornare al numero che inoltra all'assistente.** Se il locale devia le chiamate "occupato o non risponde" verso l'assistente e l'assistente le ritrasferisce allo stesso numero, si crea un giro a vuoto. | Cliente al telefono senza risposta: il peggior caso possibile. | `numeroTrasferimento` è un campo separato (es. il cellulare del titolare) e il trasferimento si fa solo a locale aperto. Scritto anche in `locali/_modello.json`. |
| S5 | **Il pacchetto Start non comprende l'assistente**, ma un sito generato in modo ingenuo direbbe "risponde il nostro assistente virtuale". | Promessa falsa al cliente finale (Parte 2.4). | Il generatore del sito e le pagine nominano l'assistente solo per Pro e Premium; c'è un test. |
| S6 | **Google Fonts remoti e mappe incorporate trasferiscono l'IP del visitatore** a terzi senza consenso. | Rischio GDPR sui siti dei clienti. | Il sito usa caratteri di sistema e carica la mappa OpenStreetMap solo al clic; nessun cookie. |
| S7 | **Il commento "servizio e coperto compresi"** non va mai scritto senza saperlo. | Sarebbe un'informazione inventata sul menu. | Tolto: il sito non dice nulla sul coperto finché il titolare non lo indica. |
| S8 | **Il fondatore non conosce ristoratori di persona** (24/10/2026). Il piano assume i primi due clienti dalla rete personale (Parte 8.1, canale 1) e un primo pilota conosciuto (1.4). | Il canale che doveva portare i primi incassi non c'è: il primo contratto arriverà probabilmente più tardi. | Riferimento prudente: riga "due mesi di ritardo" della Parte 10.6 (circa 19 clienti, 11.000 euro di utile). Rete di secondo grado e colloqui di ascolto a freddo: `vendita/script-senza-rete.md`, `PIANO_90_GIORNI.md` [Lucca], `FONDATORE.md`. |
| S9 | **Lucca Comics & Games dal 28 ottobre al 1° novembre 2026**, nella prima settimana del piano. | Titolari introvabili e città congestionata. | Prima settimana solo al computer; la domanda "quante chiamate avete perso durante i Comics?" entra nei colloqui di novembre. |

## Numeri del modello finanziario

Il modello è ricalcolato in `src/modello/modello-finanziario.ts` (`npm run modello`) e confrontato con le tabelle del PDF in `tests/modello-finanziario.test.ts`.

- **Ricavi: coincidono esattamente** in tutti i 13 casi del PDF (tre scenari e dieci righe di sensibilità). Anche le distribuzioni non scritte nel PDF ("metà dei contratti" e "due mesi di ritardo") sono state ricostruite: i ricavi tornano al centesimo.
- **Utile: differenze tra -72 e +44 euro** (al massimo lo 0,9%). La causa principale è la soglia dei costi fissi: il testo dice "125 euro da 10 clienti, 185 da 20", ma la tabella 10.5 mette 125 euro al mese 11 con 21,5 clienti. Nessuna regola unica riproduce tutte le righe: il codice applica quella scritta nel testo. Con il PDF letterale l'utile realistico è 15.964 euro, con la regola scritta 15.909.
- **Costo variabile medio: 24,40 o 24,45?** Dal listino (3/30/65 euro con mix 40/45/15) viene 24,45; il PDF usa 24,40. Il codice usa 24,40 per restare confrontabile; con `costoVariabileMedio: null` usa il valore del listino.
- **"Costo di voce raddoppiato"** nel PDF raddoppia i costi variabili di Pro e Premium, non di Start: il codice fa lo stesso (`fattoreCostoVoce`).

## Scelte tecniche

| Scelta | Alternativa scartata | Motivo |
|---|---|---|
| TypeScript con import `.ts` espliciti, un gestore `Request → Response` | Framework web | Lo stesso codice gira in Node (demo, test) e in Deno (funzione Supabase) senza modifiche. |
| Supabase: Postgres con regole di accesso a livello di riga, funzione edge nella regione UE | Database separati per locale | Un solo progetto per tutti i locali (Parte 5); le regole RLS sono provate davvero in `tests/archivio.test.ts` con PGlite. |
| Configurazione del locale in JSON validato (zod), salvata nelle tabelle | Codice per ogni locale | Un nuovo cliente si attiva compilando un file (Parte 5.1). |
| ElevenLabs Agents con strumenti webhook | ai-caller-cosmio o voce in proprio | Parte 5.9 e valutazione in `ricerca/ai-caller-cosmio.md`: niente licenza, non conforme all'AI Act, un solo locale. |
| Chiave degli strumenti derivata da un segreto con HMAC per ogni locale | Chiave salvata nel database | Nessun segreto in tabella; si ruota cambiando una variabile. |
| Firma HMAC dei webhook di fine chiamata (`elevenlabs-signature: t=…,v0=…`) | Nessuna verifica | Formato dell'esempio ufficiale; la documentazione consultata il 24/10/2026 non riporta più il dettaglio, quindi è da ricontrollare alla prima attivazione. Il locale demo accetta webhook senza firma, un cliente vero no. |
| Esito delle chiamate dal registro degli strumenti chiamati | Esito dato dalla piattaforma vocale | Indipendente dal fornitore; l'esito della piattaforma resta un'informazione in più. |
| Rapporto settimanale scritto dai numeri | Rapporto scritto da un modello linguistico | Costo zero e nessuna invenzione; il modello linguistico serve solo per l'analisi dei casi falliti (17.5). |
| Comandi WhatsApp del titolare rigidi (`OK 3`, `CHIUSO 10/11`) | Interpretazione libera dei messaggi | Una frase ambigua non deve mai cambiare orari o regole (Parte 5B.4). Ogni modifica passa da una proposta da confermare. |
| Modifiche con stato precedente e annullamento solo dell'ultima per sezione | Annullamento libero | Si torna indietro senza cancellare modifiche successive per sbaglio. |
| Codice di prenotazione di 4 cifre + numero di telefono | Solo codice | Quattro cifre si dicono bene al telefono ma si indovinano: serve anche il numero. |
| Trascrizioni: scadenza in tabella, dopo la scadenza restano solo esito e temi | Cancellazione della riga | Le statistiche del ciclo di miglioramento restano; i dati personali no. |
| Note sanitarie in un campo separato, solo con consenso (vincolo anche nel database) e cancellate dopo la data | Note libere | Dati particolari (art. 9 GDPR), Parte 12.4. |

## Da verificare (con fonte o professionista)

- Formato attuale dei webhook ElevenLabs (firma, campi) e disponibilità delle variabili `system__caller_id` e `system__conversation_id`.
- Numeri italiani per l'assistente: come portare la chiamata su ElevenLabs (Twilio o SIP) e costi per minuto della telefonia.
- Modelli WhatsApp: categorie (utilità), prezzi in Italia, tempi di approvazione.
- Assistente "su WhatsApp" (testo) del pacchetto Pro: il repository gestisce oggi solo i comandi del titolare su WhatsApp; la chat con i clienti va verificata (ElevenLabs o altro) prima di venderla come pronta.
- Hosting dei siti dei clienti con uso commerciale ammesso nel piano gratuito (Cloudflare Pages, Netlify, GitHub Pages: leggere i termini).
- Durata di conservazione delle trascrizioni (oggi 60 giorni per locale) e del registro degli strumenti (90 giorni): da fissare con un consulente privacy.
- Testo dell'informativa del sito, del contratto e dell'accordo sul trattamento: bozze, non consulenza.
