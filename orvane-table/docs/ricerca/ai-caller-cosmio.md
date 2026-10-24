# Valutazione di ai-caller-cosmio (prompt 17.11)

Repository: <https://github.com/Henry12034/ai-caller-cosmio>, ultimo commit letto `fddc9f6` del 23/10/2026 ("Logo nuovo di Cosmio nel README"). Letto il 24/10/2026 con una copia superficiale (solo l'ultimo commit): non ho eseguito il codice né chiamato i servizi. Nessuna riga di quel codice è stata copiata in questo repository.

| Voce | Risultato | Evidenza |
|---|---|---|
| 1. Licenza | **Nessuna licenza.** Non c'è un file LICENSE e `package.json` non ha il campo `license`. Il README dice che il progetto "è gratuito e il codice è qui sotto", ma senza licenza i diritti restano all'autore: il codice non si può riusare in un servizio venduto. | elenco dei file; `package.json`; l'unica voce "MIT" in `package-lock.json` è della dipendenza `ws` |
| 2. Struttura e dipendenze | Node.js ≥ 20.12, una sola dipendenza (`ws`). Server HTTP con webhook Twilio, pannello, ponte verso OpenAI Realtime (versione 1) e registrazione della chiamata su ElevenLabs Agents (versione 2). Script di prova per latenza e voci. | `src/server.mjs`, `src/v1-realtime.mjs`, `src/v2-elevenlabs.mjs`, `GUIDA-TECNICA.md` |
| 3. Avvio della chiamata e dichiarazione AI | Il receptionist si presenta con un nome da persona ("Officina Marchetti, buongiorno! Sono Luca") e le istruzioni dicono "non sei un centralino automatico". Ammette di essere un'AI solo se glielo chiedono. La guida stessa nota che nell'UE va detto subito. **Non conforme all'art. 50 dell'AI Act così com'è.** | `README.md`; `src/persona.mjs` righe 71-72; `GUIDA-TECNICA.md`, sezione Note |
| 4. Prenotazioni e disponibilità | Nessun calendario: gli orari liberi sono tre, fissi, sul "martedì prossimo" calcolato dal codice. Gli appuntamenti finiscono in un file `registrazioni/appuntamenti.jsonl`. Nessun controllo di sovrapposizione. | `src/persona.mjs` (`martediProssimo`, sezione "Cosa sai"); `src/strumenti.mjs` |
| 5. Uso con più ristoranti | Non previsto: un'attività sola, configurata nel codice (`OFFICINA`) e nel file `.env`. Per più clienti servirebbe riscriverlo. | `src/persona.mjs`, `.env.example` |
| 6. Costo per minuto | Il README parla di "pochi centesimi per minuto" senza cifre. Con i listini consultati: ElevenLabs Agents 0,08 $/minuto più modello linguistico e telefonia Twilio (da verificare). La guida segnala che il piano gratuito di ElevenLabs non permette le voci italiane della libreria via API e consente solo uso non commerciale. | `README.md`; `GUIDA-TECNICA.md`, "Cosa serve"; [listino ElevenLabs](https://elevenlabs.io/pricing/api) |
| 7. Sicurezza e privacy | Il segreto sta nell'indirizzo del webhook (avviso se manca); numeri di chi chiama e trascrizioni in file locali in `registrazioni/` senza scadenza; nessun accordo sul trattamento né cancellazione automatica. Il README punta su un italiano "così naturale che è difficile accorgersi che non è una persona", in contrasto con la trasparenza richiesta. | `src/server.mjs` riga 15-16; `src/strumenti.mjs`; `src/twilio-stream.mjs`; `README.md` |

## Cosa ne abbiamo ricavato (senza copiare codice)

- Conferma del formato delle API ElevenLabs già usato qui: `POST /v1/convai/tools` per gli strumenti webhook e `POST /v1/convai/agents/create` con `conversation_config.agent.prompt.tool_ids` e `built_in_tools`. È coerente con `src/assistente/elevenlabs.ts`.
- Misure di latenza riportate dall'autore (da verificare): sulla versione 2 circa 0,25 s per la fine frase, 0,4 s per la prima frase del modello di testo, 0,075 s per la voce.
- Idee da valutare in futuro: parole chiave per il riconoscimento vocale (nomi dei piatti), frasi di riempimento se la risposta tarda.

## Raccomandazione

**Usarlo solo come riferimento di architettura e come concorrente da studiare. Scartarlo come base e come prototipo di laboratorio** finché non c'è una licenza esplicita o un permesso scritto dell'autore (Parte 5.9). Orvane Table ha già, con codice proprio, le parti che lì mancano: disponibilità reale e senza overbooking, più locali, dichiarazione dalla prima frase, scadenza delle trascrizioni.
