# Piano dei primi 90 giorni (Parte 11), da spuntare

Dal **lunedì 26 ottobre 2026** al **sabato 23 gennaio 2027**, 15-16 ore a settimana. Con meno ore si allunga il calendario, non si saltano i gate (11.6). Accanto a ogni attività c'è cosa offre già questo repository.

**Adattato a Lucca (24/10/2026):** nessun ristoratore conosciuto di persona e 2-3 ore al giorno (`FONDATORE.md`). Cambiano tre giorni, segnati con **[Lucca]**; gli script sono in `vendita/script-senza-rete.md`. La prima settimana coincide con Lucca Comics & Games (28 ottobre - 1° novembre): solo lavoro al computer.

## Settimane 1-2: demo e lista (26 ottobre - 8 novembre)

- [ ] **Lun 26 ott (2 h)** — Account gratuiti: GitHub (già fatto), Supabase (regione UE), ElevenLabs piano gratuito, Cloudflare o Netlify per i siti. Autenticazione a due fattori su tutti (5.7). Nome di lavoro "Orvane Table" e frase di posizionamento (7.5). *Nessuna spesa.*
  - Repository: pronto. Domini liberi annotati in `ricerca/dominio-e-marchio.md` (non comprare ora).
- [ ] **Mar 27 ott (2 h)** — Tabella dei 10 concorrenti.
  - Repository: 12 voci già raccolte con fonti in `ricerca/concorrenti.md`; da aggiungere 2-3 concorrenti locali.
- [ ] **Mer 28 ott (3 h)** — Contare i locali nel raggio di 30-40 minuti e scrivere i primi 50 con punteggio. **[Lucca]** Da Google Maps, senza uscire (Comics): prima Capannori, Porcari, Altopascio, Oltreserchio e prima periferia; Versilia in un elenco a parte per febbraio.
  - Repository: `npm run foglio` crea il file Excel con la scheda Contatti che calcola il punteggio di 10 punti e la prossima azione.
- [ ] **Gio 29 ott (2 h)** — 10 persone della rete che conoscono ristoratori; chiedere 5 colloqui di 20 minuti. **[Lucca]** Rete di secondo grado: il messaggio 1 di `vendita/script-senza-rete.md` a 10 persone qualsiasi (parenti, amici, ex colleghi). Ogni nome ricevuto vale "contatto personale" nel punteggio.
- [ ] **Ven 30 ott (3 h)** — Assistente di prova con menu fittizio e 15 minuti gratuiti.
  - Repository: `npm run assistente -- demo-trattoria` produce istruzioni e configurazione; `docs/DEPLOY.md`, passi 1-5.
- [ ] **Sab 31 ott (4 h)** — Sito modello in linea.
  - Repository: `npm run siti` genera i siti dei due locali fittizi; pubblicazione al passo 6 di `DEPLOY.md`.
- [ ] **Lun 2 nov (3 h)** — Prenotazioni collegate al database con conferma.
  - Repository: fatto nel codice e provato in locale con `npm run demo`; resta la pubblicazione su Supabase.
- [ ] **Mar 3 nov (3 h)** — 5 colloqui di ascolto, solo domande della Parte 9.3. Annotare le cifre parola per parola. **[Lucca]** A freddo, al banco tra le 15:00 e le 17:30, con l'apertura 2 di `vendita/script-senza-rete.md` e la domanda sui Comics; prima i presentati dalla rete di secondo grado, se ce ne sono.
- [ ] **Mer 4 nov (3 h)** — 5 visite ai locali con il punteggio più alto, 15:00-17:30.
- [ ] **Gio 5 nov (3 h)** — Altre 5 visite e telefonate; messaggio di follow-up (9.4).
- [ ] **Ven 6 nov (3 h)** — Rifinire la demo dai colloqui; proposta in una pagina.
  - Repository: `npm run proposta -- --locale "..." --pacchetto pro --fondatore --emerso "..."`.
- [ ] **Sab 7 nov (4 h)** — Collaudo: 20 chiamate sui 10 scenari (6.3).
  - Repository: le funzioni superano già i 10 scenari nei test automatici; la scheda per le chiamate vere è `operativita/collaudo-20-chiamate.md`.
- [ ] **Dom 8 nov** — Riposo.

**Criterio al giorno 14:** demo funzionante, 10 contatti, 5 colloqui, proposta scritta.

## Settimane 3-13: vendita e primo cliente

| ✓ | Settimana | Date | Obiettivo | Indicatore |
|---|---|---|---|---|
| [ ] | 3 | 9-15 nov | 14 contatti, 2 demo personalizzate (`npm run nuovo-locale` per la demo sul suo menu) | 2 demo |
| [ ] | 4 | 16-22 nov | Primo preventivo; correzioni all'assistente dai commenti | 1 proposta |
| [ ] | 5 | 23-29 nov | Proporre il pilota a chi ha visto la demo, accordo scritto | 1 pilota discusso |
| [ ] | 6 | 30 nov - 6 dic | Firma e acconto; **solo ora** partita IVA, commercialista, piani a pagamento (12.9) | 1 contratto, acconto incassato |
| [ ] | 7 | 7-13 dic | Attivazione in 5 giorni (`operativita/attivazione.md`) | Primo cliente attivo |
| [ ] | 8 | 14-20 dic | Secondo cliente, contatti brevi fuori dai servizi di punta | 2 contratti |
| [ ] | 9 | 21-27 dic | Auguri e seguiti; primo rapporto settimanale (`npm run rapporto`) | Primo rapporto |
| [ ] | 10 | 28 dic - 3 gen | Miglioramenti del prodotto chiesti dai clienti | Elenco miglioramenti |
| [ ] | 11 | 4-10 gen | 14 contatti, 3 demo, prima testimonianza (9.11) | 3 demo |
| [ ] | 12 | 11-17 gen | Terzo cliente; programma di segnalazione (4.9) | 3 contratti |
| [ ] | 13 | 18-24 gen | Analisi di conversione, decisione sul Premium | Relazione di una pagina |

## Gate

| ✓ | Giorno | Data | Deve essere vero | Se non è vero |
|---|---|---|---|---|
| [ ] | 30 | 22 nov 2026 | Demo funzionante; ≥ 35 contatti; ≥ 8 conversazioni; ≥ 3 demo | Cambiare messaggio e fascia oraria; **non** aggiungere funzioni |
| [ ] | 60 | 22 dic 2026 | ≥ 1 contratto; 2 proposte aperte; acconto incassato | Pilota a prezzo ridotto; chiedere la causa del no |
| [ ] | 90 | 23 gen 2027 | ≥ 3 contratti; 2 clienti attivi; primo rapporto consegnato; cassa ≥ 500 € | Rivedere pacchetto, prezzo o segmento; valutare di vendere solo sito e prenotazioni |

Riferimento del modello: 3 contratti entro il mese 3 e circa 544 euro di cassa cumulata (`npm run modello`). **[Lucca]** Senza rete il riferimento prudente è la riga "primo contratto con due mesi di ritardo" (10.6): circa 19 clienti e 11.000 euro di utile in dodici mesi. I gate non cambiano: se il giorno 60 non c'è un contratto, pilota a prezzo ridotto e domanda diretta sul perché, non nuove funzioni.

## Mesi 4-12 (se il mese 1 è novembre 2026)

| ✓ | Mese | Contratti cumulati | Obiettivo |
|---|---|---|---|
| [ ] | Feb 2027 | 5 | Attivazione scritta e ripetibile; segnalazioni; ciclo di miglioramento automatico |
| [ ] | Mar 2027 | 7 | Opzione annuale; primi commercialisti e fornitori |
| [ ] | Apr 2027 | 9 | Collaudo Premium con le stampanti di un cliente; decisione di sviluppo (solo con 2 richieste con acconto) |
| [ ] | Mag 2027 | 12 | 25% dei contatti da segnalazioni; secondo Premium |
| [ ] | Giu 2027 | 15 | Carico delle chiamate per l'estate; limiti dei minuti |
| [ ] | Lug 2027 | 18 | Solo stabilità e assistenza |
| [ ] | Ago 2027 | 21 | Attivazione in meno di 2 ore |
| [ ] | Set 2027 | 24 | Valutare società o holding con il commercialista |
| [ ] | Ott 2027 | 27 | Bilancio e modello dell'anno 2 con dati reali |

## Rituale del venerdì (10 minuti)

1. Riempire la riga della settimana nella scheda Settimana del foglio (`npm run foglio` la crea vuota).
2. Guardare la prima cella rossa da sinistra: è l'indicatore più a monte sotto soglia (15.5).
3. Se serve, incollare i numeri nel prompt 17.14 (`prompt/LIBRERIA.md`).
4. Scrivere i tre obiettivi della settimana dopo, ciascuno da 5 ore al massimo (6.6).
