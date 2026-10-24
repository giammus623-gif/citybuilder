# Libreria di prompt operativi (Parte 17)

Si incollano uno alla volta in un assistente AI, sempre dopo il contesto breve (17.0). Le parti tra parentesi quadre vanno sostituite. Gli accenti persi nel PDF sono stati ripristinati.

Accanto a ogni prompt c'è cosa fa già questo repository: dove c'è un comando, il prompt serve solo per rivedere o estendere il risultato.

| Prompt | Già nel repository | Comando o file |
|---|---|---|
| 17.1 Istruzioni dell'assistente | Sì, generate dalla configurazione del locale | `npm run assistente -- <slug>` · `src/assistente/prompt.ts` |
| 17.2 Sito del locale | Sì, generatore statico da un file di configurazione | `npm run siti` · `src/sito/` |
| 17.3 Schema del database | Sì, con regole di accesso e test su Postgres | `supabase/migrations/` |
| 17.4 Funzioni dell'assistente | Sì, con test dei dieci scenari | `src/assistente/strumenti.ts` · `tests/scenari-assistente.test.ts` |
| 17.5 Analisi settimanale | Preparazione dei dati anonimizzati; l'analisi la fa l'AI | `npm run analisi -- <slug>` |
| 17.6 Rapporto settimanale | Sì, scritto dai numeri senza modello linguistico | `npm run rapporto -- <slug>` |
| 17.7 Lista e punteggio | Foglio con il calcolo del punteggio | `npm run foglio` → scheda Contatti |
| 17.8 Demo personalizzata | Modello di configurazione, frasi di prova e messaggio | `npm run nuovo-locale -- ...` |
| 17.9 Proposta in una pagina | Sì, con prezzi dal listino | `npm run proposta -- ...` |
| 17.10 Concorrenti | Prima ricerca con fonti | `docs/ricerca/concorrenti.md` |
| 17.11 ai-caller-cosmio | Valutazione fatta il 24/10/2026 | `docs/ricerca/ai-caller-cosmio.md` |
| 17.12 Contratto | Bozza da portare all'avvocato | `docs/legale/contratto-bozza.md` |
| 17.13 Stampa comande | No: Premium, si fa solo dopo due richieste con acconto | — |
| 17.14 Coach settimanale | Foglio con le soglie; il prompt resta da usare ogni venerdì | `npm run foglio` → scheda Settimana |

---

## 17.0 Contesto breve da incollare prima di ogni prompt

```text
Contesto: sono un fondatore unico che costruisce Project Orvane Table, un pacchetto digitale per ristoranti indipendenti italiani: sito con prenotazioni (Start), assistente AI per telefono e WhatsApp con ciclo di miglioramento (Pro), gestionale comande (Premium). Prezzi: setup 290/790/1.490 euro, canone 49/129/219 euro al mese. Vincoli: investimento iniziale zero, ogni costo coperto da un acconto incassato, un solo fondatore, 15 ore a settimana, fattibile in 6-12 mesi, conformità italiana (AI Act art. 50, GDPR, prodotto non fiscale). Rispondi in italiano. Distingui sempre dati verificati, ipotesi e opinioni; quando manca un dato scrivi «da verificare». Chiudi ogni risposta con la prossima azione da fare nelle prossime 24 ore.
```

## 17.1 Istruzioni di sistema dell'assistente vocale del ristorante

Obiettivo: istruzioni per la piattaforma vocale. Dati da fornire: nome del locale, orari, chiusure, menu, regole di prenotazione, numero massimo di persone prenotabili senza passare al titolare, politica su animali, parcheggio e accessibilità.

```text
RUOLO
Sei l'assistente virtuale del ristorante [NOME LOCALE]. Rispondi alle telefonate e ai messaggi per conto del locale, in italiano, con tono cordiale, semplice e breve.

DICHIARAZIONE OBBLIGATORIA
La prima frase di ogni conversazione, senza eccezioni, è:
«[Buongiorno/Buonasera], sono l'assistente virtuale del ristorante [NOME LOCALE]. Posso aiutarla con prenotazioni e informazioni.» Subito dopo, una frase: «I suoi dati servono solo per la prenotazione; l'informativa completa è sul sito del locale.» Non usare un nome da persona. Se ti chiedono se sei una persona, rispondi con chiarezza che sei un sistema automatico e offri di far richiamare dal titolare.

COSA PUOI FARE
- Prendere, modificare e annullare prenotazioni usando solo le funzioni del sistema.
- Rispondere a domande usando solo le informazioni del locale fornite qui sotto.
- Lasciare un messaggio per il titolare e avvisarlo.

COSA NON PUOI FARE
- Non inventare orari, piatti, prezzi, ingredienti o disponibilità. Se non hai l'informazione, dillo e offri un messaggio per il titolare.
- Non dare indicazioni su allergie o intolleranze oltre a quanto scritto nella sezione ALLERGIE.
- Non accettare pagamenti, caparre o sconti.
- Non rispondere su argomenti estranei al locale.

REGOLE DI CONVERSAZIONE
- Una domanda alla volta. Frasi brevi. Linguaggio semplice.
- Ripeti sempre i dati importanti per conferma: giorno, ora, numero di persone, nome, telefono.
- Se non capisci dopo due tentativi, offri di lasciare un messaggio al titolare.
- Se il cliente è arrabbiato o chiede una persona, passa la chiamata o registra il messaggio senza discutere.

PRENOTAZIONI
- Dati da raccogliere: nome, numero di telefono, data, ora, numero di persone, eventuali esigenze.
- Verifica sempre la disponibilità con la funzione verifica_disponibilita prima di confermare.
- Per gruppi oltre [N] persone non confermare: registra la richiesta e avvisa il titolare.
- Dopo la conferma crea la prenotazione con crea_prenotazione e invia il messaggio di conferma.

ALLERGIE E INTOLLERANZE
Non dare mai rassicurazioni. Rispondi: «Per allergie e intolleranze la cosa migliore è confermare con il personale; posso annotare la sua richiesta sulla prenotazione.» Annota solo se il cliente accetta e per la sola prenotazione.

INFORMAZIONI DEL LOCALE
[orari, chiusure, indirizzo, parcheggio, animali, accessibilità, menu fisso, regole di prenotazione]

CHIUSURA
Riepiloga in una frase, conferma che arriverà un messaggio, saluta con cortesia.
```

## 17.2 Generazione del sito del locale

Obiettivo: sito multipagina riutilizzabile, veloce da telefono. Dati: nome, indirizzo, orari, menu, foto, colori, testi.

```text
Costruisci un sito statico multipagina in italiano per il ristorante [NOME] con queste pagine: home, menu, il locale, prenotazioni, contatti. Requisiti: caricamento sotto 3 secondi da telefono, design semplice e leggibile, menu in testo (non PDF), orari e telefono sempre visibili, pulsante di prenotazione in ogni pagina, mappa, metadati per la ricerca locale, dati strutturati per ristorante, informativa privacy in fondo. Tutti i contenuti devono stare in un unico file di configurazione (nome, orari, menu, testi, colori) così da poter creare un nuovo locale cambiando solo quel file. Non usare servizi a pagamento. Consegna: struttura delle cartelle, codice, file di configurazione di esempio, istruzioni di pubblicazione su un hosting che ammetta l'uso commerciale.
```

## 17.3 Schema del database a più locali

```text
Progetta lo schema di un database Postgres per più ristoranti (multi-tenant). Tabelle: locali, utenti, orari_e_chiusure, voci_menu, allergeni, domande_frequenti, clienti, prenotazioni, conversazioni, esiti, segnalazioni, modifiche_proposte. Ogni tabella ha il campo locale_id. Scrivi: 1) gli script di creazione, 2) le regole di accesso a livello di riga per cui un utente vede solo i dati del proprio locale, 3) gli indici essenziali, 4) uno script di esportazione di tutti i dati di un locale in un solo file, 5) cinque dati di esempio per un locale fittizio. Regole: nessun dato non necessario, campo di scadenza per le trascrizioni (cancellazione automatica dopo [N] giorni), campo per il consenso sulle note sanitarie.
```

## 17.4 Funzioni dell'assistente vocale

```text
Scrivi le funzioni server che l'assistente vocale può chiamare, con validazione rigorosa dei dati: verifica_disponibilita(data, ora, persone), crea_prenotazione(nome, telefono, data, ora, persone, note), modifica_prenotazione(id, campi), annulla_prenotazione(id), leggi_informazioni(tema), lascia_messaggio_al_titolare(testo, urgenza), trasferisci_chiamata(). Regole: data futura, orario dentro l'apertura, numero di persone tra 1 e [N], rifiuto di dati incoerenti con messaggio d'errore comprensibile, registro di ogni chiamata, nessuna scrittura senza locale_id verificato. Includi test automatici per i dieci scenari: prenotazione semplice, orario non disponibile, gruppo grande, allergie, modifica, annullamento, domanda sul parcheggio, richiesta fuori orario, richiesta di una persona, chiamata interrotta.
```

## 17.5 Analisi settimanale dei casi falliti (ciclo di miglioramento)

Obiettivo: trasformare le conversazioni non riuscite in proposte di correzione da approvare (Parte 5B). Dati: elenco in formato strutturato delle conversazioni della settimana con esito, trascrizione, domanda non risolta. Il file con i dati già anonimizzati lo prepara `npm run analisi -- <slug>`.

```text
Ti do le conversazioni della settimana del ristorante [NOME] con esito e trascrizione. Compito: 1) raggruppa i casi falliti o passati a una persona per causa (informazione mancante, frase non capita, regola non prevista, errore dell'assistente); 2) per ogni gruppo scrivi massimo tre esempi, la proposta di correzione (nuova risposta, nuova regola o nuova informazione) e il rischio che la correzione peggiori altri casi; 3) indica quali conversazioni già risolte bene vanno usate per ritestare la correzione; 4) proponi al massimo cinque modifiche in ordine di impatto. Vietato: proporre cambi di prezzo, orari o regole di prenotazione senza segnalarlo come «da approvare dal titolare»; usare dati personali dei clienti nelle proposte (sostituisci nomi e numeri con segnaposto). Output: tabella con gruppo, causa, esempi, proposta, rischio, test da fare, e un messaggio WhatsApp di massimo 600 caratteri per il titolare con due modifiche da approvare.
```

## 17.6 Rapporto settimanale per il titolare

```text
Scrivi il rapporto settimanale per il titolare del ristorante [NOME] in massimo 120 parole, tono diretto e cordiale, senza termini tecnici. Dati: chiamate gestite [N], prenotazioni prese [N] di cui fuori orario [N], richieste passate al titolare [N], domande senza risposta [elenco], correzioni già applicate [elenco], correzioni da approvare [elenco con risposta ok 1, ok 2]. Struttura: una frase di sintesi, i numeri, cosa è stato imparato, cosa serve da lui. Non promettere risultati economici e non dare giudizi sul locale.
```

## 17.7 Lista di locali e punteggio di qualificazione

```text
Aiutami a costruire una lista di 50 ristoranti e pizzerie indipendenti nel raggio di [N] minuti da [CITTÀ]. Non usare programmi di raccolta automatica né violare i termini dei servizi: ti incollo io i nomi presi a mano da mappe e siti pubblici. Per ogni locale assegna il punteggio di 10 punti della scheda di qualificazione (titolare decisore, almeno 30 coperti, prenotazioni per telefono, chiamate perse, sito o scheda trascurati, uso di WhatsApp, almeno 20 coperti a sera, tavoli per gruppi, attività da più di tre anni, contatto personale) basandoti solo su ciò che ti dico, e segna «da verificare» per ogni punto non noto. Output: tabella ordinata per punteggio con orario migliore per la visita e prima domanda da fare.
```

## 17.8 Demo personalizzata sul menu del locale

```text
Prepara la demo dell'assistente per il ristorante [NOME]. Ti incollo menu, orari e informazioni pubbliche prese dal suo sito. Compito: 1) compila la configurazione del locale (orari, chiusure, menu, domande frequenti probabili) segnando «da confermare» tutto ciò che non è scritto esplicitamente; 2) scrivi 10 frasi di prova che un cliente potrebbe dire, di cui 3 difficili (allergie, gruppo grande, richiesta fuori orario); 3) scrivi il messaggio WhatsApp da inviare al titolare con il numero di prova. Regola: usa solo informazioni pubbliche; non inventare piatti o prezzi.
```

Per la configurazione: parti da `locali/_modello.json` (o da `npm run nuovo-locale`) e chiedi all'AI di restituire un JSON nello stesso formato; poi `npm test` e `npm run siti` controllano che sia valido.

## 17.9 Proposta in una pagina

```text
Scrivi la proposta di una pagina per [NOME LOCALE]. Dati della conversazione, parola per parola: [chiamate perse a sera, orari critici, problemi nominati dal titolare]. Struttura: titolo con il nome del locale; tre cose emerse dalla conversazione con le sue cifre; pacchetto consigliato [Start/Pro/Premium] con setup e canone; cosa è incluso in cinque righe; tempi di attivazione (5 giorni lavorativi); recesso con 30 giorni di preavviso dopo i primi tre mesi; data limite di risposta. Vietato: promettere aumenti di incassi, percentuali di risoluzione o risparmi non detti dal titolare. Output: testo pronto da incollare in un documento e messaggio di accompagnamento di tre righe.
```

## 17.10 Ricerca e confronto dei concorrenti

```text
Cerca almeno dieci concorrenti reali in Italia per la ricezione automatica delle prenotazioni telefoniche e il sito per ristoranti (gestionali, piattaforme di prenotazione, servizi di segreteria, assistenti vocali AI, agenzie locali). Per ognuno: nome, cosa offre, prezzo pubblicato o «non pubblicato», durata del contratto, punto debole verificabile, fonte con collegamento. Regole: usa solo dati che trovi in pagine consultate; scrivi «non verificato» per tutto il resto; non citare più di una frase da una stessa fonte. Chiudi con tre differenze che Project Orvane Table può sfruttare e tre punti in cui i concorrenti sono migliori.
```

## 17.11 Valutazione tecnica del repository ai-caller-cosmio

```text
Analizza il repository https://github.com/Henry12034/ai-caller-cosmio per capire se serve a Project Orvane Table. Verifica: 1) licenza presente nel repository (se manca, dillo e non suggerire di copiare il codice); 2) struttura e dipendenze; 3) come gestisce l'avvio della chiamata e se dichiara di essere un'AI dal primo contatto; 4) come gestisce prenotazioni e disponibilità; 5) cosa serve per usarlo con più ristoranti; 6) costo per minuto stimato dai servizi che usa, con le fonti dei listini; 7) rischi di sicurezza e privacy. Output: tabella con voce, risultato, evidenza (file o riga), e una raccomandazione: usarlo come riferimento, come prototipo di laboratorio o scartarlo.
```

## 17.12 Bozza di contratto da portare all'avvocato

```text
Scrivi una bozza di contratto di servizio in italiano tra [FORNITORE] e un ristorante, per i pacchetti Start, Pro e Premium. Clausole: oggetto, corrispettivi (setup pagato 50% alla firma e 50% alla messa in funzione, canone anticipato, minuti extra), durata e recesso (tre mesi iniziali poi 30 giorni di preavviso), livelli di assistenza, limitazione di responsabilità, proprietà e portabilità dei dati, accordo sul trattamento dei dati con elenco dei fornitori, dichiarazione dell'assistente come sistema di intelligenza artificiale, esclusione di funzioni fiscali. Segna con «da verificare con un avvocato» ogni punto che richiede una valutazione legale. Non è una consulenza legale: il testo serve solo come base di discussione.
```

## 17.13 Stampa delle comande in cucina (Premium)

Da usare solo quando almeno due clienti hanno chiesto il Premium o hanno firmato con acconto (Parte 6.1).

```text
Progetta la stampa delle comande per postazioni (cucina, pizzeria, bar) di un gestionale web usato da tablet. Opzione A: stampanti di rete che scaricano i lavori dal server tramite un protocollo di stampa da server. Opzione B: un piccolo programma locale su un dispositivo sempre acceso che riceve i lavori e li invia alla stampante. Per ciascuna scrivi: architettura, formato del biglietto (tavolo, ora, piatti, note, postazione), gestione degli errori (carta finita, stampante spenta, rete assente, comanda duplicata), ristampa e annullamento, e un piano di collaudo di un'ora con le stampanti del cliente. Elenca i modelli di stampante compatibili da verificare sui siti dei produttori. Il documento stampato per il conto è non fiscale e deve riportare la dicitura «documento non fiscale».
```

## 17.14 Revisione settimanale con coach

```text
Fai da coach di vendita per il fondatore di Project Orvane Table. Ti do i numeri della settimana: contatti [N], conversazioni [N], demo [N], proposte [N], contratti [N], ore dedicate [N], cassa [N], note [testo]. Confrontali con gli obiettivi (14 contatti, 4 conversazioni, 2 demo, 1 proposta, da 2 a 3 contratti al mese). Output: 1) l'indicatore più a monte sotto soglia; 2) la causa più probabile e come verificarla; 3) un solo esperimento per la settimana prossima con criterio di successo; 4) cosa NON fare questa settimana. Se due settimane consecutive sono sotto soglia, dillo chiaramente e proponi di rivedere messaggio, fascia oraria o segmento prima di aumentare il volume.
```

## 17.15 Come usare la libreria

Settimane 1-2: 17.1, 17.2, 17.3, 17.4, 17.7, 17.10. Settimane 3-6: 17.8, 17.9, 17.14. Dal primo cliente: 17.5 e 17.6. Prima del Premium: 17.13. Dopo il primo incasso: 17.12. Ogni risposta dell'AI va verificata su tre punti: i dati sono esatti, le promesse rispettano la Parte 2, le norme sono state controllate con un professionista. Il 17.11 si usa una sola volta, all'inizio.
