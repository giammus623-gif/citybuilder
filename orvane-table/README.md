# Orvane Table

Sito, prenotazioni e assistente telefonico AI per ristoranti indipendenti italiani, costruiti per partire **a investimento zero**: ogni costo vivo arriva dopo un acconto incassato. Il progetto completo è il prompt master in [`docs/PROMPT_MASTER.md`](docs/PROMPT_MASTER.md); le regole per chi ci lavora con l'AI sono in [`CLAUDE.md`](CLAUDE.md).

## Stato (24 ottobre 2026)

Costruite le **fasi 0 e 1 della Parte 6** (demo e base attivabile), quelle che il piano prevede prima del primo incasso. Tutto gira in locale a costo zero e ha 70 test automatici. Niente gestionale Premium né altre funzioni non ancora vendute (perché: [`docs/DECISIONI.md`](docs/DECISIONI.md), S1).

| Parte del prompt | Cosa c'è | Dove |
|---|---|---|
| 5.3-5.4, 17.4 | Le sette funzioni dell'assistente con validazione, niente overbooking anche con richieste contemporanee, registro di ogni chiamata; test dei 10 scenari | `src/assistente/strumenti.ts`, `tests/scenari-assistente.test.ts` |
| 12.3, 17.1 | Istruzioni dell'assistente generate dalla configurazione, dichiarazione di sistema automatico nella prima frase | `src/assistente/prompt.ts` |
| 5.2, 5.9 | Configurazione ElevenLabs Agents (strumenti webhook, trasferimento, fine chiamata), firma HMAC e lettura del webhook di fine chiamata | `src/assistente/elevenlabs.ts`, `npm run assistente` |
| 5.5, 17.3 | Schema Postgres multi-locale con regole di accesso a livello di riga, esportazione e cancellazione dei dati scaduti, provato su Postgres vero (PGlite) | `supabase/migrations/`, `tests/archivio.test.ts` |
| 6.2, 17.2 | Sito statico per locale da un solo file di configurazione: menu in testo con allergeni, dati strutturati, prenotazione online, mappa solo al clic, informativa | `src/sito/`, `npm run siti` |
| 5B | Classificazione delle chiamate, proposte di correzione con "ok N / no N", stato precedente e annullamento, comandi WhatsApp del titolare, pagina di approvazione firmata | `src/rapporti/` |
| 5B.7, 9.10, 17.6 | Rapporto settimanale (≤ 120 parole) e indicatori della Parte 5B.6 | `npm run rapporto` |
| 17.5 | Dati della settimana anonimizzati con il prompt di analisi | `npm run analisi` |
| 6.2, 13.7 | Esportazione di tutti i dati di un locale con un comando | `npm run esporta` |
| 10 | Modello finanziario ricalcolato e confrontato con il PDF: ricavi identici in 13 casi su 13, utile entro 72 euro | `src/modello/`, `npm run modello` |
| 4, 9.6, App. B | Listino unico e proposta in una pagina con sconto cliente fondatore | `src/modello/listino.ts`, `npm run proposta` |
| 8.6, 3.6, 15 | Foglio Excel: contatti con punteggio, settimana, mese, clienti, concorrenti, con soglie in rosso | `docs/fogli/orvane-cruscotto.xlsx`, `npm run foglio` |
| 7.4, 17.10 | Concorrenti con prezzi e fonti | `docs/ricerca/concorrenti.md` |
| 5.9, 17.11 | Valutazione di ai-caller-cosmio: niente licenza, non conforme all'AI Act, da non usare come base | `docs/ricerca/ai-caller-cosmio.md` |
| 12 | Bozze di contratto e accordo sul trattamento dei dati, registro e procedure privacy | `docs/legale/` |
| 6.3, 6.5, 13 | Attivazione in 5 giorni, collaudo delle 20 chiamate, scheda del titolare, incidenti e chiusura | `docs/operativita/` |
| 11 | Piano dei 90 giorni da spuntare, dal 26 ottobre 2026 | `docs/PIANO_90_GIORNI.md` |
| 17 | Libreria di prompt pronta da copiare, con cosa è già automatizzato | `prompt/LIBRERIA.md` |

## Provare subito

```bash
cd orvane-table
npm install
npm run controlla     # tipi e 70 test
npm run demo          # http://localhost:8787
```

La demo mostra due locali fittizi ("Trattoria La Prova", pacchetto Pro, e "Pizzeria Forno di Prova", pacchetto Start, per provare che un secondo locale si attiva con un solo file): i siti con la prenotazione online, il simulatore delle funzioni dell'assistente, il rapporto della settimana scorsa con dati finti, la pagina di approvazione del titolare e i messaggi WhatsApp simulati.

## Struttura

```
CLAUDE.md                 regole per l'AI (dal prompt master)
docs/                     prompt master, decisioni, piano, deploy, legale, operatività, ricerca, fogli
prompt/LIBRERIA.md        prompt 17.0-17.14
locali/                   un file JSON per locale (+ _modello.json)
src/core/                 configurazione, disponibilità, tempo, validazione, interfacce
src/assistente/           funzioni, istruzioni, ElevenLabs, testi dei messaggi
src/sito/                 generatore del sito statico
src/rapporti/             classificazione, ciclo di miglioramento, comandi del titolare, rapporto, analisi
src/api/                  gestore HTTP unico (Node e Deno) e pagine
src/adattatori/           archivio in memoria e Postgres, WhatsApp, utilità Node
src/modello/              listino e modello finanziario
src/gestionale/           Premium: rimandato, con il motivo
supabase/                 migrazioni e funzione edge
tools/                    comandi npm
tests/                    70 test
```

## Prossimo passo

Lunedì 26 ottobre: account gratuiti (Supabase in UE, ElevenLabs, hosting dei siti) con autenticazione a due fattori, poi `docs/DEPLOY.md` passi 1-3. Due ore, nessuna spesa. Prima ancora servono le quattro risposte della Parte 0.5: città e raggio, ore settimanali reali, partita IVA, ristoratori conosciuti di persona.
