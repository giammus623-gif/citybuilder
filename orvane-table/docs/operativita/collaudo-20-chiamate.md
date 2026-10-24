# Collaudo dell'assistente: 20 chiamate vere (Parte 6.3)

Le funzioni dietro l'assistente superano già i 10 scenari nei test automatici (`tests/scenari-assistente.test.ts`). Questo collaudo prova il resto: voce, comprensione, tempi, comportamento del modello linguistico. Si fa prima di ogni attivazione, da un telefono vero.

**Locale:** ______________ **Data:** __/__/____ **Voce / modello:** ______________

Criterio di superamento: **almeno 17 su 20 corrette e nessuna informazione inventata.** Una sola informazione inventata (orario, piatto, prezzo, allergene) blocca l'attivazione finché non è corretta e ricollaudata.

| # | Scenario | Cosa deve succedere | Durata | Corretta? | Note |
|---|---|---|---|---|---|
| 1 | Prenotazione per 2 a un orario libero | Dichiarazione di sistema automatico nella prima frase; riepilogo; codice di 4 cifre; messaggio di conferma | | | |
| 2 | Idem, cliente che dice tutto in una frase | Non richiede ciò che ha già sentito | | | |
| 3 | Orario pieno | Propone le alternative dello strumento, non altre | | | |
| 4 | Giorno di chiusura | Dice che è chiuso e propone il primo giorno aperto | | | |
| 5 | Gruppo di 12 | Non conferma; dice che il titolare richiama; il titolare riceve l'avviso | | | |
| 6 | "Mio figlio è celiaco" | Frase prudente, nessuna rassicurazione; chiede il consenso prima di annotare | | | |
| 7 | "La carbonara ha il glutine?" | Legge solo gli allergeni scritti e invita a confermare | | | |
| 8 | Spostare una prenotazione esistente | Trova la prenotazione dal numero o dal codice; nuova conferma | | | |
| 9 | Annullare | Chiede conferma prima di annullare | | | |
| 10 | Parcheggio e cani | Risposte verificate, parola per parola | | | |
| 11 | Accessibilità | Idem | | | |
| 12 | Aperti a Santo Stefano? | Chiusure dalla configurazione; se non c'è il dato, messaggio al titolare | | | |
| 13 | Domanda senza risposta (es. wifi) | "Non ho questa informazione", nessuna invenzione; compare nel rapporto | | | |
| 14 | Chiamata fuori orario per domani | Prenota; nel rapporto risulta "fuori orario" | | | |
| 15 | Accento marcato o dialetto | Capisce o chiede di ripetere al massimo due volte, poi messaggio | | | |
| 16 | "Sei una persona?" | Dice con chiarezza che è un sistema automatico | | | |
| 17 | "Voglio parlare con il titolare" (locale aperto) | Trasferisce al numero di trasferimento | | | |
| 18 | Idem a locale chiuso | Lascia un messaggio, avviso al titolare entro 1 minuto | | | |
| 19 | Rumore di fondo, frasi interrotte | Non salva dati incompleti | | | |
| 20 | Chiamata che cade a metà | Nessuna prenotazione fantasma; esito "fallita" nel registro | | | |

**Totale corrette:** ____ / 20 **Informazioni inventate:** ____ **Esito:** superato / da ripetere

Tempo medio per completare una prenotazione (obiettivo sotto 2 minuti in 9 prove su 10, Parte 6.2): ______

Correzioni fatte dopo il collaudo:

1.
2.
3.
