# Attivazione di un cliente in 5 giorni lavorativi (Parte 13.1 e 6.5)

Una copia di questa lista per ogni cliente. Il canone parte solo quando sono spuntate tutte le voci della sezione "Attivazione completata".

**Locale:** ______________ **Pacchetto:** ______ **Firma:** __/__/____ **Attivo entro:** __/__/____

## Giorno 0 — firma

- [ ] Contratto firmato (`legale/contratto-bozza.md` rivisto) e accordo sul trattamento (`legale/accordo-trattamento-dati.md`)
- [ ] Acconto del 50% del setup incassato e fatturato
- [ ] Inviato al titolare l'elenco dei materiali (messaggio 9.9)

## Giorno 1 — materiali

- [ ] Menu completo con prezzi e **allergeni verificati dal titolare**
- [ ] Orari di ogni giorno, chiusure e festivi
- [ ] 3-4 foto con permesso d'uso
- [ ] Regole: coperti, durata media del tavolo, gruppo massimo senza conferma
- [ ] Domande frequenti: parcheggio, animali, accessibilità, pagamenti, asporto, menu fisso
- [ ] Numero da cui inoltrare le chiamate e numero per il trasferimento (**diverso**)
- [ ] Numero WhatsApp del titolare per avvisi e approvazioni
- [ ] Dominio, scheda Google, numeri: aperti o trasferiti **a nome del cliente**
- [ ] `npm run nuovo-locale -- --slug ... --nome "..."` e compilazione di `locali/<slug>.json` con `"demo": false`

## Giorno 2 — configurazione

- [ ] `npm test` verde con il nuovo file (la configurazione viene validata)
- [ ] `DATABASE_URL=... npm run carica-locali -- <slug>`
- [ ] `npm run siti -- <slug> --api ... --url ...` e pubblicazione
- [ ] Scheda Google aggiornata con gli stessi orari del sito
- [ ] (Pro e Premium) `npm run assistente -- <slug> --api ...` e creazione dell'agente; webhook di avvio e fine chiamata; audio disattivato
- [ ] (Pro e Premium) Modelli WhatsApp approvati

## Giorno 3 — collaudo

- [ ] 20 chiamate di prova (`collaudo-20-chiamate.md`): almeno 17 corrette, **nessuna informazione inventata**
- [ ] Il titolare prova di persona l'assistente
- [ ] Prenotazione dal sito da telefono: arriva la conferma, il collegamento di annullamento funziona

## Giorno 4 — formazione (1 ora, Parte 13.2)

- [ ] 10' come funziona la chiamata · 10' leggere conversazioni e rapporto · 10' approvare una correzione da WhatsApp · 10' cambiare chiusure con un messaggio · 20' prove dal vivo
- [ ] Consegnata la scheda di una pagina (`scheda-titolare.md`)
- [ ] Deviazione impostata in modalità "occupato o fuori orario"

## Giorno 5 — messa in funzione

- [ ] Servizio attivo, il titolare conferma l'avvio
- [ ] Saldo del setup fatturato
- [ ] Primo rapporto settimanale in calendario (lunedì)
- [ ] Riga del cliente nella scheda Clienti del foglio (`npm run foglio`)

## Attivazione completata (Parte 6.5)

- [ ] contratto firmato e acconto incassato
- [ ] sito pubblicato e verificato da telefono
- [ ] scheda Google aggiornata
- [ ] menu e informazioni caricati e approvati dal titolare
- [ ] inoltro chiamata configurato e provato
- [ ] 20 chiamate di prova superate
- [ ] titolare formato per un'ora
- [ ] primo rapporto settimanale programmato
- [ ] saldo del setup fatturato

## Dopo l'attivazione (Parte 13.3)

| Quando | Cosa | Fatto |
|---|---|---|
| Giorno 1 | "Come è andata la prima serata?" | [ ] |
| Giorno 7 | Primo rapporto e telefonata di 5 minuti | [ ] |
| Giorno 30 | 15 minuti: cosa funziona, cosa manca, minuti usati | [ ] |
| Giorno 60 | Testimonianza (9.11) e segnalazione (9.12) | [ ] |
| Giorno 90 | Revisione dei numeri e del pacchetto | [ ] |
