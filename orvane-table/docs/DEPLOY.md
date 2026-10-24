# Messa online a costo zero, poi con il primo acconto

Passi per portare la demo su servizi veri. Fino al primo acconto si usano solo piani gratuiti (Parte 2.1). I nomi dei menu dei pannelli cambiano spesso: dove un passo non torna, vale la documentazione ufficiale del servizio.

## 0. Prima di tutto, in locale

```bash
cd orvane-table
npm install
npm test            # 70 test: scenari dell'assistente, API, schema SQL con RLS, sito, modello
npm run demo        # http://localhost:8787: siti, prova degli strumenti, rapporto, approvazioni
```

## 1. Database su Supabase (gratuito per la demo)

1. Crea un progetto Supabase **nella regione dell'Unione europea** (Parte 12.4). Piano gratuito: va in pausa dopo 7 giorni senza attività e non ha backup automatici, quindi solo per la demo.
2. Installa la CLI di Supabase e collega il progetto (`supabase link`).
3. Applica lo schema: `supabase db push` (usa `supabase/migrations/`).
4. Pianifica la pulizia dei dati scaduti (estensione pg_cron, se disponibile nel piano):
   ```sql
   select cron.schedule('pulizia-orvane', '15 3 * * *', 'select public.pulisci_dati_scaduti()');
   ```
5. Carica i locali con la stringa di connessione del database (Impostazioni del progetto → Database):
   ```bash
   DATABASE_URL=postgres://... npm run carica-locali            # tutti i file di locali/
   DATABASE_URL=postgres://... npm run carica-locali -- da-mario  # uno solo
   ```

## 2. API come funzione Supabase

1. Genera i segreti (stringhe casuali lunghe), per esempio con `openssl rand -hex 32`, e impostali come segreti della funzione (`supabase secrets set NOME=valore`). L'elenco completo con le spiegazioni è in `src/ambiente.ts`:
   - `ORVANE_URL_BASE` = `https://<progetto>.supabase.co/functions/v1/orvane-api`
   - `ORVANE_SEGRETO_STRUMENTI`, `ORVANE_SEGRETO_COLLEGAMENTI`
   - `ORVANE_SEGRETO_WEBHOOK_VOCE` (lo dà ElevenLabs al passo 4)
   - `ORVANE_ORIGINI_SITO` = indirizzi dei siti, separati da virgola
2. `npm run prepara-funzione` copia `src/` dentro `supabase/functions/_shared/` (la CLI pubblica solo ciò che sta sotto `functions/`).
3. `supabase functions deploy orvane-api`. In `supabase/config.toml` la verifica del JWT è disattivata: le chiamate arrivano da ElevenLabs, Meta e dai siti, e l'API controlla chiave e firme da sé.
4. Prova: `curl https://<progetto>.supabase.co/functions/v1/orvane-api/salute`.

## 3. Assistente su ElevenLabs Agents

1. `ORVANE_SEGRETO_STRUMENTI=... npm run assistente -- demo-trattoria --api <ORVANE_URL_BASE>` scrive in `dist/assistente/demo-trattoria/` le istruzioni, il primo messaggio, i quattro webhook e la chiave degli strumenti.
2. Salva la chiave nel deposito dei segreti di ElevenLabs e rilancia con `ELEVENLABS_ID_SEGRETO=<id>`, così non resta scritta nella configurazione.
3. Controlla `strumenti.json` e `agente.json`, poi crea tutto con `ELEVENLABS_API_KEY=... npm run assistente -- demo-trattoria --api <url> --crea`, oppure a mano dal pannello. Formati verificati sull'API il 24/10/2026: ricontrollarli.
4. Nel pannello dell'agente:
   - webhook di fine chiamata → `<ORVANE_URL_BASE>/api/demo-trattoria/fine-chiamata`, con firma HMAC; **disattiva l'invio dell'audio** (non si conservano registrazioni, Parte 5B.4);
   - webhook di avvio chiamata (saluto e data di oggi) → `<ORVANE_URL_BASE>/api/demo-trattoria/avvio-chiamata`, con l'intestazione `x-orvane-chiave`;
   - criterio di valutazione `cliente_soddisfatto` (facoltativo): se fallisce, la conversazione è classificata "insoddisfatto".
5. Prova dal pannello con i 15 minuti gratuiti: le 10 frasi di `npm run nuovo-locale` sono un buon copione. Nelle prove dal browser non c'è un numero di chi chiama: la variabile `system__caller_id` può restare vuota e l'assistente deve chiedere il telefono (comportamento da verificare alla prima prova).

**Licenza commerciale:** il piano gratuito di ElevenLabs serve solo per provare. Per un cliente vero serve un piano a pagamento, da attivare con il suo acconto (5.2).

## 4. Numero di telefono (dal primo cliente con assistente)

Il ristorante tiene il suo numero e imposta la deviazione "se occupato o non risponde" verso il numero dell'assistente. Come collegare un numero italiano a ElevenLabs (importazione da Twilio o trunk SIP), costi e regole per i numeri italiani: **da verificare** con i fornitori prima della prima firma. Il numero del trasferimento (`numeroTrasferimento`) deve essere diverso da quello che devia le chiamate.

## 5. WhatsApp (dal primo cliente)

1. Account WhatsApp Business Platform (Cloud API) e numero dedicato.
2. Modelli da far approvare a Meta, categoria utilità (testi in `src/assistente/testi.ts` e nei comandi del titolare): conferma, modifica e annullamento della prenotazione, avviso al titolare, rapporto settimanale.
3. Variabili: `WHATSAPP_TOKEN`, `WHATSAPP_ID_NUMERO`, `WHATSAPP_VERSIONE_API`, `WHATSAPP_MODELLI`, `WHATSAPP_TOKEN_VERIFICA`, `WHATSAPP_SEGRETO_APP`.
4. Webhook dei messaggi in arrivo → `<ORVANE_URL_BASE>/api/<slug>/whatsapp`: solo il numero del titolare può dare comandi.

Senza WhatsApp configurato, i messaggi finiscono nei log della funzione: va bene per la demo, non per un cliente.

## 6. Siti dei locali

1. `npm run siti -- <slug> --api <ORVANE_URL_BASE> --url https://<dominio del locale>` genera `dist/siti/<slug>/`.
2. Pubblica la cartella su un hosting statico che **ammetta l'uso commerciale nel piano gratuito**: leggere i termini di Cloudflare Pages, Netlify o simili prima di scegliere (il piano gratuito di Vercel lo vieta, Parte 5.2).
3. Prima di pubblicare un cliente vero: informativa privacy rivista da un consulente, dominio intestato al ristorante, scheda Google aggiornata con lo stesso orario.

## 7. Quando si paga (e con quale incasso)

| Voce | Quando | Pagata da |
|---|---|---|
| Supabase Pro (backup, nessuna pausa) | Primo cliente | Acconto del primo cliente |
| Piano ElevenLabs con licenza commerciale | Primo cliente Pro | Acconto |
| Numero e telefonia dell'assistente | Primo cliente Pro | Acconto, intestato dove possibile al cliente |
| Messaggi WhatsApp a pagamento | Dal primo cliente | Canone (costo variabile) |
| Dominio del locale | Attivazione | Acconto del cliente, intestato a lui |
| Dominio del prodotto | Dopo il primo incasso, se serve | Incasso |

## Controlli dopo ogni attivazione

- `npm test` verde, `npm run rapporto -- <slug>` con `DATABASE_URL` mostra i numeri giusti.
- 20 chiamate di prova (`operativita/collaudo-20-chiamate.md`), almeno 17 corrette e nessuna informazione inventata.
- `npm run esporta -- <slug>` produce il file con tutti i dati (Parte 6.2).
