# PROMPT MASTER v2 — "CITY LAB"
## City builder con agenti AI, simulazione sociale ed economia viva

> **Come usare questo documento.** Incollalo per intero nel tuo agente di coding (Claude Code, Codex, Lovable o simili). È diviso in parti: visione, analisi dei riferimenti, bibbia artistica, sistemi di gioco, agenti AI, interfaccia, tecnica, piano di lavoro, criteri di accettazione. L'agente deve costruire per milestone (Parte 12): costruire, avviare, verificare con screenshot e misure, correggere, e solo dopo andare avanti.
>
> **Fonti.** Questa versione si basa sull'analisi fotogramma per fotogramma di 7 video e 11 immagini di riferimento (descritti nella Parte 2), più due screenshot della simulazione sociale con 2.721 persone. Dai riferimenti si prendono **idee e meccaniche, mai asset, nomi, loghi o personaggi**: tutto quello che il gioco mostra deve essere originale.

---

# INDICE

- Parte 0 — Istruzioni per l'agente esecutore
- Parte 1 — Visione, concetto e pilastri
- Parte 2 — Analisi dei riferimenti (cosa si vede, cosa prendere, come superarlo)
- Parte 3 — Bibbia artistica "Tutto è un modellino" (4K)
- Parte 4 — Mondo, mappa e costruzione
- Parte 5 — Onboarding: parti dal business che vuoi (lo Studio degli Squali)
- Parte 6 — Economia, business, mercato, borsa e produzione
- Parte 7 — Cittadini, società e Laboratorio delle Idee
- Parte 8 — Criminalità, polizia e giustizia
- Parte 9 — Agricoltura, energia, logistica e fattori
- Parte 10 — Agenti AI: il Quartier Generale (ufficio virtuale)
- Parte 11 — Il Quotidiano, la Receptionist, la Ruota, la Wiki
- Parte 12 — Piano per milestone
- Parte 13 — Interfaccia e controlli (schermata per schermata)
- Parte 14 — Audio
- Parte 15 — Architettura tecnica, dati e performance
- Parte 16 — Qualità, test, telemetria, bilanciamento
- Parte 17 — Sicurezza, privacy, etica
- Parte 18 — Criteri di accettazione
- Parte 19 — Cose da non fare
- Appendice A — Catalogo iniziale di edifici e business
- Appendice B — Schemi dati principali
- Appendice C — Palette, tipografia e token di design
- Appendice D — Testi di esempio (tono di voce)

---

# PARTE 0 — ISTRUZIONI PER L'AGENTE ESECUTORE

Sei un team senior di sei persone in una: **game director, graphics engineer, simulation engineer, UI/UX designer, sound designer, QA lead**. Devi costruire un videogioco **leggero, nel browser, giocabile su PC, Mac, tablet e telefono**, che sia un city builder profondo, molto più bello e più intelligente di SimCity, con agenti AI che lavorano davvero dentro il gioco.

**Regole di lavoro, non negoziabili:**

1. **Decidi da solo** tutto ciò che si può decidere con buon senso. Registra ogni decisione importante in `docs/DECISIONS.md` (data, decisione, alternative scartate, motivo). Chiedimi qualcosa solo se blocca davvero il lavoro (una chiave API, un permesso).
2. **Lavora per milestone** (Parte 12). Alla fine di ognuna: avvia il gioco, scatta screenshot a 3840×2160 e a 390×844 (telefono), misura FPS, tempo di caricamento e memoria, correggi ciò che non rispetta i budget, aggiorna `docs/CHANGELOG.md`, poi continua.
3. **Niente funzioni finte.** Ogni sistema descritto deve funzionare davvero, anche in forma semplice, prima di essere rifinito. Meglio poche cose solide che molte cose rotte.
4. **Lingua**: tutto il testo del gioco in **italiano**, con sistema i18n pronto per inglese, spagnolo, tedesco, francese, portoghese.
5. **Funziona offline e senza chiavi API.** Ogni agente AI ha una modalità "template" deterministica. Con una chiave (inserita dall'utente, salvata solo sul dispositivo) gli agenti diventano più ricchi.
6. **Qualità percepita alta.** Uno dei riferimenti analizzati è stato criticato dai giocatori come "confuso", "buggy" e "fatto di fretta". Questo gioco deve essere l'opposto: chiaro, stabile, rifinito.
7. **Codice**: TypeScript strict, moduli piccoli, nomi chiari, test della simulazione, nessun `any` non giustificato, lint e format automatici.
8. **Mostrami i progressi**: alla fine di ogni milestone, un breve report con screenshot, numeri misurati, cosa funziona, cosa no, cosa viene dopo.

---

# PARTE 1 — VISIONE, CONCETTO E PILASTRI

## 1.1 Il concetto in una frase

> **Costruisci una città vera partendo da un solo business, e guardala diventare una società viva, con economia, crimine, polizia, idee che si diffondono e una squadra di agenti AI che lavora per te in un ufficio che puoi vedere.**

## 1.2 Il gancio

Il giocatore non inizia con "una mappa e dei soldi". Inizia con **un'idea di business descritta a parole sue** ("una pizzeria al taglio vicino alla stazione", "un'officina di bici elettriche", "una fattoria biologica con spaccio"). Prima di costruire deve **presentarla a cinque investitori AI** che cercano di dirgli di no. I loro motivi diventano i rischi della partita. Poi il business apre, attira clienti, dipendenti, fornitori, concorrenti, ladri, poliziotti, giornalisti: la città nasce intorno a lui.

## 1.3 Il tema unificante: "Tutto è un modellino"

Ogni parte del gioco è un **diorama in miniatura**, fatto con un materiale diverso ma con la stessa filosofia (luce morbida, profondità di campo, oggetti che sembrano toccabili):

| Area del gioco | Materiale del diorama | Riferimento di partenza |
|---|---|---|
| La città | **Plastico architettonico** in gesso, legno chiaro e resina, fotografato con obiettivo tilt-shift | Simulazione 2.721 persone |
| Lo Studio degli Squali (onboarding) | **Feltro e stoffa** in stop-motion, studio TV imbottito | Video Shark Tank |
| Il Quartier Generale degli agenti | **Low-poly caldo** tipo giocattolo, ufficio a due piani | Video ufficio virtuale |
| Il Quotidiano | **Carta ritagliata** e collage | Video giornale del mattino |
| La Receptionist | **Carta crema e pixel art**, percorsi tratteggiati | Video e carosello WhatsApp |

Il passaggio da un'area all'altra è una **transizione fisica**: la camera "entra" nel modellino (zoom dentro una finestra del Quartier Generale, la prima pagina del giornale che si stampa e scivola fuori, il sipario dello studio che si apre).

## 1.4 I cinque pilastri

1. **Profondità leggibile.** Ogni numero ha una causa visibile e cliccabile. Il gioco non dice solo "la criminalità è alta", ma **perché**, con i fattori pesati.
2. **Bellezza da 4K.** Uno screenshot qualsiasi deve sembrare la foto di un plastico di uno studio di architettura, non un gioco economico.
3. **Leggerezza.** Si apre in pochi secondi, gira a 60 FPS su un portatile normale, e su telefono resta fluido.
4. **Agenti AI veri e visibili.** I miei agenti lavorano dentro il gioco, li vedo alla scrivania, so cosa stanno facendo, e il loro lavoro cambia la città.
5. **Equità.** Nessun paywall, nessuna ricchezza che si concentra in pochi dal primo giorno, nessun "vince chi ha più tempo da buttare".

## 1.5 Modalità di gioco

- **Carriera**: si parte dal business, la città cresce. Obiettivi a capitoli (es. "100 abitanti", "primo commissariato", "prima crisi superata", "città da 10.000").
- **Sandbox**: soldi illimitati, tutti gli edifici sbloccati, controllo su meteo, crimine, eventi.
- **Laboratorio delle Idee**: città già popolata (da 2.721 a 20.000 persone), si lanciano idee e si confronta la diffusione con gli amici sullo stesso seed.
- **Scenari**: situazioni pronte (città con un'ondata di furti, città agricola in siccità, quartiere in declino da rilanciare, città con una banda che controlla il porto).
- **Mondo condiviso (fase avanzata, opzionale)**: più giocatori nella stessa regione con economia comune, solo dopo che il singolo giocatore è solidissimo.

---

# PARTE 2 — ANALISI DEI RIFERIMENTI

Per ogni riferimento: **cosa si vede**, **cosa prendere**, **come farlo meglio**.

## 2.1 Simulazione sociale con 2.721 persone (due screenshot)

**Cosa si vede.** Città isometrica su una base quadrata spessa, come un plastico. Palette quasi monocroma: beige, grigio caldo, bianco gesso. Grattacieli a gradoni al centro, blocchi residenziali medi, schiere di villette in basso, una piazza centrale con un edificio basso e tetto rosso, due canali azzurro polvere con alberelli in fila. Le persone sono **puntini neri** che si muovono lungo strade e piazze. Un quadratino di selezione evidenzia una persona. Titolo: "E se potessi testare un'idea su 2.721 persone generate dall'AI?". Ogni persona ha routine giornaliera, convinzioni e relazioni sociali. Si introduce un'idea tramite una persona, si osserva quante la adottano, c'è una classifica con gli amici. La didascalia stessa avverte che l'adozione simulata non prova il successo reale.

**Cosa prendere.** L'estetica del plastico. I puntini come rappresentazione della folla da lontano. La base spessa che "galleggia". I canali. L'idea che si diffonde nel grafo sociale. La classifica.

**Come superarlo.**
- La città si **costruisce**, non solo si osserva.
- Zoomando, i puntini diventano persone animate, poi personaggi con volto (LOD in Parte 3).
- Si vede **perché** ogni persona adotta o rifiuta un'idea (una riga di spiegazione).
- Da 2.721 si sale fino a 20.000 persone simulate.
- L'avviso "è un modello, non una previsione" è sempre visibile.

## 2.2 Capital Rift — gioco di economia con città reale (video di 33 secondi + commenti)

**Cosa si vede, fotogramma per fotogramma.**
- **Città 3D in scala reale** con grattacieli, ponti, svincoli autostradali, nomi di vie veri (Brooklyn Bridge, Police Plaza): il mondo è basato su mappe reali. A fine video, un **globo terrestre** navigabile da cui si sceglie la città.
- **Avatar in terza persona** (personaggio blu con testa bianca) che si muove in città; barra azioni in basso con icone.
- **Interni visibili in sezione**: muri tagliati che mostrano un negozio con scaffali, frigoriferi, casse e tavolini; un **casinò** con pavimento a scacchi giallo e bianco, tappeti rossi, tavoli verdi da roulette e poker, slot machine. Etichette "Building · Shops", "Building · Apartments" con selettore di stanza "1/3".
- **Borsa e mercato** ("Share Exchange"): schede Market, Auctions, Unique Items, Shares, "My orders"; griglia di circa 100 icone di oggetti (cibi, materiali, lingotti, attrezzi); ticker in basso con titoli di aziende e variazioni percentuali.
- **Catalogo edifici** a griglia di icone.
- **Pianificatore di produzione a nodi**: Lumber 4.0/min → Sawmill ×2.63 → 16 Planks; Iron Bar 1.2/min → Manufacturing ×1.88 → 24 Nails; Planks + Nails → Carpentry ×5.71 → Chair 2.0/min. Ogni nodo mostra il moltiplicatore, l'efficienza e i flussi per minuto sui collegamenti.
- **Wiki interna** enorme a schede (Renting rooms, The Market, Fuel pump, Property editor, Logistics and deliveries, Construction, Vehicle repair kit, The Bank, Mining, The world, Manufacturing, Food carts, Takeout counter, Companies, Workers, Casinos, Player shops, Buying buildings, Gasoline, Running a fleet, Storage and filters, Oil and plastics, Mining vehicles, Self-checkout kiosk, Restaurants, Buildings, Pricing and demand, Money and net worth, Production planner, Docks, Ranching, Industrial AC, Ships, Property auctions, Going public, Cooking, Blueprints, Unique items, Cart upgrades, Tutorials…).
- **Patch notes con dashboard di performance**: "hitches nei primi 10 minuti", tempo di risposta delle azioni (tipico e 5% più lento), percentuale di sessioni senza crash (97%), filtri per sistema, cronologia di centinaia di aggiornamenti.
- **Il ribilanciamento economico** (la parte più preziosa):
  - Problema dichiarato: inflazione enorme, i soldi creati dagli NPC crescevano troppo in fretta.
  - Soluzione: **una sola curva di reddito per ogni business**. Ogni attività è tarata sul tempo di rientro dell'investimento: circa **24 ore reali** per un impianto da 10.000, **2,5 giorni** per uno da 100.000, **6,3 giorni** per uno da 1.000.000.
  - **Quattro corsie**: "limitato per giocatore" (si rientra in fretta, es. carretto del cibo in 4,4 ore), "condiviso per area", "limitato dal denaro" (impianti grandi, rientro lento), "risparmi".
  - "Le copie guadagnano allo stesso ritmo": più posti, più camion, più turbine nello stesso impianto rendono come il primo.
  - "Condividere un'area rallenta": clienti, cene e giocatori del casinò si dividono tra i negozi vicini; le centrali vicine si fanno concorrenza sul prezzo. **Diffondersi conviene.**
  - Classifica "quali business rendono di più" ordinabile per: più veloce a ripagarsi, più soldi al giorno, più economico per iniziare.
  - **Obiettivo di crescita della massa monetaria: circa 25% all'anno**, confrontato con altri mondi online di lunga durata (14–17% all'anno).
  - **Fasce sugli interessi dei risparmi**: tasso pieno fino a 10 milioni, 25% del tasso da 10 milioni a 1 miliardo, zero sopra il miliardo. Motivo: l'87% degli interessi andava all'1% più ricco.
  - Ogni business tarato finché il suo rientro reale cade entro il **25% del bersaglio**.
- **Commenti dei giocatori**: "rendetelo gratis", "togliete il paywall", "i prezzi degli edifici sono sballati, non si riesce a comprare niente, la ricchezza si concentra in pochi giocatori dal primo giorno, con un sacco di soldi e di bot", "dopo 3 giorni è molto confuso", "fatto di fretta e pieno di bug", "sembra complicatissimo ma divertente", "ho comprato la demo un mese e mezzo fa e non l'ho ancora ricevuta".

**Cosa prendere.**
- Interni in sezione degli edifici.
- Mercato con aste, oggetti unici, azioni societarie e ticker.
- Pianificatore di produzione a nodi con flussi al minuto.
- Wiki interna integrata.
- La disciplina economica: curva di rientro per fascia d'investimento, corsie, penalità di affollamento, bersaglio di crescita monetaria, fasce sui risparmi.
- Dashboard di performance e patch notes trasparenti.

**Come superarlo.**
- **Chiarezza**: tutorial progressivo, sblocchi graduali, una sola schermata "Cosa faccio adesso?" sempre disponibile.
- **Equità dal giorno 1**: niente bot che accumulano ricchezza, costi che scalano col patrimonio, indicatore di disuguaglianza visibile (Parte 6.9).
- **Niente paywall**, niente demo promesse e mai consegnate.
- **Stabilità**: crash-free sopra il 99,5%, non il 97%.
- **Stile visivo coerente**: Capital Rift ha un look 3D generico; qui la città è un plastico 4K con identità forte.
- **Dal mondo reale si prende la struttura** (densità, gerarchia delle strade, quartieri), ma le città sono generate proceduralmente con un'opzione futura "importa la forma di una città reale da dati aperti".

## 2.3 Ufficio virtuale degli agenti AI (video di 56 secondi)

**Cosa si vede.**
- Ufficio 3D **low-poly caldo** a due piani, pareti color sabbia, soffitto a pannelli, lampade a sospensione, pavimento in legno, tappeti rosa, piante, librerie, scale verso un soppalco.
- **Ogni agente è un piccolo robot** seduto a una scrivania con monitor, ognuno con un nome su un'etichetta bianca arrotondata.
- Sopra ogni agente, un **fumetto giallo** con badge "WORKING", poi **strumento · modello · titolo del compito** e una descrizione di due righe. Esempi letti nei fotogrammi: "Ricerca news IA degli ultimi 3 giorni: fonti ufficiali, verifica dei fatti, classifica per rilevanza"; "Slide formazione IA di ottobre: scaletta di 2 ore, esempi per studio tecnico, esercizi pratici"; "Analisi parole chiave del sito pizzeria: intenti di ricerca, cluster per pagina e concorrenti locali"; "Codice dell'agente social media: pianifica i post, scrive le caption e risponde ai commenti"; "Creazione visual del reel: 8 scene in stile cyber, a tempo con lo script e il parlato"; "Revisione del codice del sito pizzeria: errori HTML, performance, accessibilità e link rotti"; "Flusso di orchestrazione per lo studio chirurgico: prenotazioni, promemoria e smistamento richieste"; "Articolo del blog con tutorial: scritto per non esperti, passaggi chiari, licenza in una frase"; "Automazione dei messaggi del reel: parola chiave, risposta automatica con link al tutorial".
- Ambienti: **Ufficio del Capo** (vetrato, con insegna), **Sala riunioni**, una **TV dell'ufficio** con "Condividi schermo", una lavagna "Servizi" con server attivi, un **jukebox** che suona musica ("Now playing"), un **cabinato arcade** con un gioco a blocchi davvero giocabile e classifica dei record, canestro da basket, decorazioni di Halloween (zucche, cappello da strega), una **mascotte animale** che gira per l'ufficio.
- Messaggio chiave del video: "invece di dieci finestre diverse, un ufficio virtuale"; "anche quando nessuno guarda, continuano il loro lavoro"; "è una vera factory".

**Cosa prendere.** Tutto il linguaggio visivo dell'ufficio: robot alla scrivania, fumetti di stato con strumento, modello e compito, stanze funzionali, intrattenimento giocabile, mascotte, decorazioni stagionali.

**Come superarlo.**
- L'ufficio è **collegato alla città**: i risultati degli agenti diventano eventi, notizie, decisioni, bonus.
- **Stati completi** (non solo "WORKING"): in coda, al lavoro, bloccato, in attesa di approvazione, in riunione, completato, in errore, in pausa; con barra di avanzamento e tempo stimato.
- **Riunioni vere**: quando due agenti collaborano, si alzano e vanno in sala riunioni; il fumetto mostra la conversazione riassunta.
- **Ufficio che cresce**: più agenti = ufficio più grande, nuovi piani, nuove stanze sbloccabili.
- **Approvazioni fisiche**: quando un agente ha bisogno di un mio sì, porta un foglio all'Ufficio del Capo e la scrivania lampeggia.
- Nomi e design dei robot **originali** (Parte 10.3).

## 2.4 Lo "Shark Tank dentro Claude" (video di 24 secondi)

**Cosa si vede.** Diorama in **feltro e stoffa**, stile stop-motion: studio TV con pareti imbottite a rombi verde petrolio e senape, cornici di lampadine da camerino, tende color crema, pedana rotonda rossa. Uno squalo di feltro grigio. Il protagonista è un **cubetto arancione** con occhi neri e ciuffo giallo che presenta l'idea con un cavalletto. **Cinque squali** (cubetti con pinna, ognuno con un look: felpa blu, occhiali e completo, capelli biondi…) seduti a un bancone. Scene: "Prima domanda: chi paga?" (cassa di feltro con cassetto aperto e una moneta), "Lui offre solo royalty" (squalo con occhiali, foglio "ROYALTY"), "Idea scarsa? Escono tutti" (squalo che alza la paletta "IO SONO FUORI"), "Ogni no, prima che ti costi" (muro di mattoni con post-it "CHI PAGA?", "ROYALTY PER SEMPRE", "NOIOSA"), finale con cartelli "GRATIS". Sottotitoli a parole singole su etichette di carta.

**Cosa prendere.** Il format: presentazione, cinque investitori con un criterio ciascuno, offerte o uscite motivate, la lista dei "no" che diventa una lista di cose da sistemare, ripresentazione.

**Come superarlo.** Diventa **l'onboarding giocabile** del gioco (Parte 5): le offerte determinano capitale, quota ceduta e difficoltà; i "no" diventano rischi concreti nella simulazione.

## 2.5 Il giornale del mattino (video di 26 secondi)

**Cosa si vede.** Diorama in **carta ritagliata**: un personaggio a blocchi color terracotta con cappellini diversi (berretto verde con asterisco, cappello da poliziotto, cappellino rosso con matita). Scene: stampante con percentuale "PRINTING 42% → 100%"; prima pagina con testata in caratteri gotici; bacheca di sughero con "MY PAPER" e fonti appuntate (newsletter, YouTube) con contatore "SOURCES 2"; scena notturna con orologio alle 6, luna, schedari, fogli che volano, personaggio che dorme ("6 AM: NOISE CUT"); impaginazione della prima pagina con contatore "STORIES 1 → 2"; tubo che porta il foglio alla stampante; caffè fumante accanto al giornale ("caught up in 4 min"); porta blu con il giornale sullo zerbino. Sottotitoli su etichette di carta inclinate.

**Cosa prendere.** Il rituale: fonti scelte una volta, lavoro notturno, rumore tagliato, storie doppie fuse, prima pagina vera con testata, apertura, colonne, stampa o PDF.

**Come superarlo.** Diventa **Il Quotidiano della città** (Parte 11.1), con notizie generate dagli eventi reali della simulazione e scene animate in carta ritagliata.

## 2.6 L'agente WhatsApp (video di 48 secondi + carosello di 10 immagini)

**Cosa si vede.**
- Video: fondo crema-pesca sfumato, un **robottino pixel art** con telefono in mano che cammina lungo un **percorso tratteggiato** arancione che collega le scene. Passi numerati: 1) prendi un numero (account gratuito), 2) aggiungi le skill (un comando), 3) chiedi "costruiscimi un agente WhatsApp che prenota appuntamenti". Risultato: chat notturna sotto una lampada ("Sei libero venerdì?" → "Ho le 16:00 o le 18:30, quale preferisci?" → "18:30 per favore" → "Prenotato, ti mando un promemoria quella mattina"). Regole: chiedi prima il consenso; finestra di 24 ore, dopo il silenzio solo modelli approvati.
- Carosello: "Un numero. Un pomeriggio. Risposta a ogni messaggio. Di giorno o di notte. Anche a cena."; notifica alle 21:04 di venerdì; **modulo di prenotazione dentro la chat** (nome, servizio "Revisione caldaia", orari 16:00 / 18:30 / 19:15, "Conferma prenotazione"); card "Lavoro: reception 24/7" con checklist (rispondi a ogni domanda, controlla il calendario, prenota l'orario, manda il promemoria); **quattro regole**: 1) usa il setup ufficiale, non un bot losco che ti fa bannare il numero; 2) prima chiedi il permesso; 3) occhio alla finestra di 24 ore; 4) **sui prezzi tieni un umano**, tutto ciò che contiene un preventivo viene controllato.

**Cosa prendere.** La receptionist AI per ogni attività, il modulo di prenotazione in chat, la checklist del lavoro, le quattro regole.

**Come superarlo.** Diventa un **sistema di gioco** (Parte 11.2): ogni attività può assumere una Receptionist, che porta più clienti ma rispetta regole reali; violarle ha conseguenze (reputazione, "ban" del numero simulato).

## 2.7 Tangerine — conversione file con trascina + Shift (due video da 21 secondi)

**Cosa si vede.** Su un desktop con sfondo sfumato arancio-rosso-viola: trascini un PDF, premi Shift, appare una **ruota radiale a due livelli**. Anello dei formati (DOCX, TXT, PNG, JPG al centro, poi PDF, WEBP, HEIC, TIFF, BMP, AVIF). Anello delle azioni (Comprimi, Metadati, Modifica, Annota, Aggiungi sfondo, Ritaglia, Oscura, Rimuovi sfondo). Rilasci sullo spicchio, si apre un piccolo editor (ritaglio con maniglie e proporzioni 1:1, 4:3, 16:9; aggiunta sfondo con palette colori e cursori), e il **nuovo file appare accanto all'originale** senza toccarlo. Tutto in locale.

**Cosa prendere.** La ruota radiale a due livelli, il gesto trascina + Shift, l'anteprima, il risultato non distruttivo accanto all'originale.

**Come superarlo.** Diventa **il menu contestuale universale del gioco** (Parte 11.3) per edifici, persone, veicoli, documenti e agenti.

---

# PARTE 3 — BIBBIA ARTISTICA "TUTTO È UN MODELLINO" (4K)

## 3.1 La città: plastico fotorealistico

**Riferimento mentale**: il modello in scala di un grande studio di architettura, fotografato con luce di finestra nel tardo pomeriggio e obiettivo tilt-shift.

**Base e cornice**
- La mappa poggia su una **base spessa** con bordo smussato in legno chiaro o MDF, visibile quando si zooma all'indietro, con piccole etichette incise (nome della città, scala "1:500", nord).
- Sotto la base un'ombra di contatto morbida su un "tavolo" neutro che sfuma nel fondo.

**Palette** (dettagli in Appendice C)
- Edifici: bianco gesso, sabbia, crema, grigio caldo, legno chiaro.
- Strade: grigio pietra con segnaletica bianco sporco.
- Acqua: azzurro polvere con riflessi lucidi come resina.
- Vegetazione: verde salvia desaturato, alberi come pallini di spugna.
- Accenti saturi **solo** per significato: rosso polizia, blu emergenza, ambra economia, ciano agenti AI, verde agricoltura, viola criminalità (solo nelle mappe del calore).

**Edifici**
- Facciate con finestre in rilievo, cornicioni, balconi, tende da sole, insegne, impianti sui tetti, lucernari, giardini pensili.
- Ogni tipo di business ha una **silhouette riconoscibile** anche da lontano (forno con camino, officina con serranda, casinò con insegna a lampadine, banca con colonne).
- **Varianti procedurali**: altezza, colore entro la palette, dettagli del tetto, così due edifici dello stesso tipo non sono mai identici.
- **Interni in sezione** (come Capital Rift, ma più belli): cliccando un edificio la facciata scivola via e si vede l'interno con persone al lavoro, arredi, merci sugli scaffali. Selettore di piano/stanza "1/3".

**Persone e veicoli: livelli di dettaglio**
- **Lontano**: le persone sono puntini neri, come nel riferimento delle 2.721 persone. Le auto sono rettangolini.
- **Medio**: figurine stilizzate da plastico (manichini bianchi senza volto, come nei modellini veri) con camminata animata; auto con forma e colore.
- **Vicino**: personaggi con abiti e accessori legati al mestiere (grembiule per il cuoco, divisa per il poliziotto, tuta per l'operaio, cappello per il contadino), e volti stilizzati solo per i personaggi importanti.
- Veicoli speciali: volanti con lampeggianti, ambulanze, camion della logistica, trattori, bus, barche sui canali.

**Luce e atmosfera**
- **Ciclo giorno/notte** di durata configurabile (default: un giorno di gioco = 24 minuti reali a velocità ×1). Temperatura colore dall'alba azzurrina al tramonto ambrato; di notte finestre accese in modo casuale e realistico, lampioni con alone, fari delle auto, insegne luminose.
- **Meteo**: sereno, nuvoloso (ombre che scorrono), pioggia (strade bagnate con riflessi, pozzanghere, ombrelli sui pedoni), nebbia (volumetrica leggera), neve (accumulo sui tetti), vento (alberi che ondeggiano di più).
- **Stagioni**: colore degli alberi, campi coltivati che cambiano, decorazioni stagionali in città (luci a dicembre, zucche a ottobre).

**Post-processing** (tutto regolabile e disattivabile)
- Profondità di campo tilt-shift con fuoco automatico sull'oggetto al centro.
- Ambient occlusion (SSAO o GTAO), bloom delicato su luci e insegne, color grading con LUT per ogni ora del giorno, vignettatura leggera, grana pellicola sottilissima.
- Anti-aliasing: TAA di qualità, con FXAA o SMAA come ripiego su telefono.

**Dettagli viventi** (sono ciò che fa la differenza)
- Fumo dai camini, vapore dai tombini d'inverno, uccelli che si alzano dalle piazze, panni stesi che si muovono, gru nei cantieri che ruotano, cantieri con impalcature che crescono piano per piano, mercato rionale con bancarelle la mattina, tavolini dei bar che si riempiono a pranzo, coda davanti al locale di successo, nastro della polizia sulla scena di un crimine.

**Camera**
- Prospettica con angolo isometrico di default (circa 35°), rotazione libera, scatti a 90° con un tasto, zoom fluido con inerzia, pan a trascinamento, "segui" una persona o un veicolo, inquadratura automatica di un evento ("vai sul posto").
- **Modalità foto**: camera libera, controllo di fuoco, apertura e ora del giorno, cattura a 3840×2160 (e fino a 7680×4320 con tiling), con filigrana disattivabile.
- **Modalità cinematografica**: la camera vola da sola tra i luoghi interessanti della città (ottima per video da condividere).

## 3.2 Lo Studio degli Squali: feltro in stop-motion

- Studio TV in miniatura: pareti imbottite a rombi verde petrolio e senape, cornici di lampadine calde, tende crema, pedana rotonda rossa, bancone degli investitori in feltro.
- Personaggi in **feltro** con cuciture visibili, fibre e leggera peluria (shader con fuzz e normal map di tessuto), animazione a **12 fotogrammi al secondo** per l'effetto stop-motion, mentre la camera si muove fluida a 60.
- Oggetti di scena in feltro: cassa, cavalletto, palette "SONO FUORI", post-it, monete, contratti.
- Sottotitoli a parole su **etichette di carta** con nastro adesivo.

## 3.3 Il Quartier Generale: low-poly caldo

- Ufficio a due piani con soppalco e scala, pareti sabbia, legno chiaro, tappeti rosa antico, piante, librerie, lampade a sospensione con luce calda e alone.
- Robot-agenti dalle forme semplici e simpatiche, ognuno con colore e silhouette unici.
- Fumetti di stato gialli con bordo scuro arrotondato, molto leggibili (Parte 10.4).
- Effetti: tasti che si muovono, monitor con codice che scorre, tazze che fumano, note musicali dal jukebox.

## 3.4 Il Quotidiano: carta ritagliata

- Collage di carta con bordi irregolari, ombre portate corte, texture di carta riciclata, colori terrosi (terracotta, verde bottiglia, blu notte, crema).
- Testata del giornale con carattere da quotidiano storico (licenza libera), corpo del testo con un serif leggibile.

## 3.5 La Receptionist: carta crema e pixel art

- Fondo crema-pesca sfumato, card bianche con angoli arrotondati e ombre morbide, accento arancione, mascotte pixel art che cammina su un percorso tratteggiato da un passaggio all'altro.

## 3.6 Qualità 4K e leggerezza insieme

- Rendering alla risoluzione nativa fino a 3840×2160 con **risoluzione dinamica**: se gli FPS scendono sotto il bersaglio, la risoluzione interna cala a passi del 10% (minimo 50%), con upscaling di qualità, poi risale.
- **Preset**: Telefono, Bilanciato, Alto, Ultra 4K. Rilevamento automatico del dispositivo e della GPU, scelta manuale.
- Texture in **KTX2/Basis** compresse, atlas condivisi, mesh in **glTF con Draco/Meshopt**.
- Asset caricati in streaming per distanza: prima il plastico "bianco" (veloce), poi i dettagli.

---

# PARTE 4 — MONDO, MAPPA E COSTRUZIONE

## 4.1 Generazione della mappa

- Mappa procedurale da **seed**, dimensioni selezionabili (piccola 2×2 km, media 4×4 km, grande 8×8 km in scala di gioco).
- Elementi: fiume o canali, costa opzionale con porto, colline morbide, boschi, terreni agricoli fertili ai bordi, una ferrovia di passaggio, un'autostrada che collega al "resto del mondo" (da cui arrivano merci, turisti e nuovi abitanti).
- Ogni cella del terreno ha dei valori: altitudine, fertilità, falda d'acqua, valore del terreno, inquinamento, rumore, criminalità, copertura dei servizi, passaggio pedonale, bellezza.

## 4.2 Partenza da zero

- All'inizio c'è **un solo lotto pronto**: quello del business scelto nell'onboarding, collegato alla strada principale. Tutto il resto è terreno vuoto.
- La città cresce **per domanda**: arrivano nuovi residenti se ci sono case, lavoro, servizi e sicurezza; arrivano nuove attività (degli NPC) se c'è clientela non servita.
- Il giocatore costruisce infrastrutture e servizi pubblici e possiede le proprie attività; le attività degli NPC nascono e muoiono da sole, secondo il mercato.

## 4.3 Strumenti di costruzione

- **Strade**: dritte, curve (spline), rotonde, incroci con semafori o precedenze, viali alberati, strade pedonali, piste ciclabili, ponti sui canali. Gerarchia: vicolo, strada locale, strada di quartiere, viale, superstrada.
- **Zone**: residenziale (bassa, media, alta densità), commerciale, uffici, industriale, agricola, mista. Le zone si disegnano a pennello.
- **Edifici specifici**: servizi pubblici e attività del giocatore (catalogo in Appendice A).
- **Utenze**: acqua (pozzi, acquedotto, depuratore), elettricità (centrali, rete), rifiuti (raccolta, riciclo, discarica), internet.
- **Trasporti**: fermate bus e linee disegnabili, metro (in fase avanzata), parcheggi, stazione ferroviaria, porto.
- **Decorazioni**: parchi, piazze, fontane, statue, alberi, panchine (aumentano bellezza e valore del terreno).
- Esperienza d'uso: anteprima "fantasma" trasparente, costo in tempo reale, avvisi (es. "qui non arriva l'acqua"), **annulla e ripeti illimitati**, copia e incolla di gruppi di edifici, **progetti salvabili** (blueprint) riutilizzabili.

## 4.4 Ciclo di vita degli edifici

Lotto → cantiere (impalcature che crescono, gru, operai) → attivo → usura → manutenzione o degrado → ristrutturazione, cambio d'uso o demolizione. I quartieri possono **gentrificarsi** (valore che sale, affitti che salgono, residenti poveri che se ne vanno) o **decadere** (negozi chiusi, graffiti, più crimine). Ogni passaggio ha cause visibili.

---

# PARTE 5 — ONBOARDING: PARTI DAL BUSINESS CHE VUOI

Durata: circa 4 minuti, saltabile ma consigliato. È la prima cosa che il giocatore vede dopo il menu.

## 5.1 Scena 1 — Il sipario

Lo studio in feltro, il sipario si apre, il cubetto protagonista (originale, personalizzabile in colore e accessorio) entra in scena con un cavalletto vuoto. Sottotitoli su etichette di carta.

## 5.2 Scena 2 — Descrivi il tuo business

Campo di testo libero, più suggerimenti cliccabili ("pizzeria", "officina", "fattoria", "palestra", "negozio online", "studio dentistico", "food truck", "bar", "hotel"). Il gioco traduce la descrizione in un **archetipo** con parametri:

- settore e catena di fornitura;
- investimento iniziale e corsia economica (Parte 6.3);
- margine lordo tipico;
- clienti target (età, reddito, abitudini);
- bisogno di passaggio pedonale o di parcheggio;
- numero e tipo di dipendenti;
- fornitori necessari;
- rischio criminalità (contanti, merce di valore, orari notturni);
- regolamentazioni (licenze, ispezioni sanitarie);
- stagionalità;
- potenziale di crescita (catena, franchising, online).

Con chiave API la traduzione la fa un LLM con output **strutturato e validato da uno schema**. Senza chiave: classificatore a parole chiave più un dizionario di 60 archetipi preimpostati.

Il giocatore può anche **regolare i parametri a mano** ("prezzo medio", "orari", "posizione preferita").

## 5.3 Scena 3 — Presentala come in TV

Il protagonista "presenta" con un breve riepilogo generato (cos'è, quanto costa, a chi serve, come trova i clienti), mostrato come un cartellone sul cavalletto.

## 5.4 Scena 4 — I cinque squali

Cinque investitori in feltro, originali, ognuno con personalità, aspetto e **un solo criterio**:

1. **La Cassiera** — *Chi paga davvero?* Guarda clienti target, disponibilità a pagare, frequenza d'acquisto.
2. **Il Contabile** — *I numeri reggono?* Guarda margini, costi fissi, punto di pareggio, tempo di rientro.
3. **Il Negoziatore** — *Quanto ti costa l'accordo?* Propone quote, prestiti o **royalty "su ogni vendita, per sempre"**, e lo dice chiaramente.
4. **La Scalatrice** — *Può crescere oltre il quartiere?* Guarda franchising, online, seconda sede.
5. **Lo Scettico** — *Cosa può andare storto?* Guarda concorrenza, criminalità, burocrazia, stagionalità.

Ognuno fa **domande** (il giocatore risponde con opzioni o testo), poi **un'offerta** (capitale, in cambio di quota, prestito con interessi o royalty) **oppure esce** alzando la paletta "Per questo motivo, io sono fuori" con il motivo esplicito.

## 5.5 Scena 5 — Il muro dei no

I motivi di chi è uscito vengono appesi come **post-it di feltro su un muro di mattoni** ("Chi paga?", "Royalty per sempre", "Troppo noiosa", "Troppa concorrenza", "Zona a rischio furti"). Diventano la **Lista dei Rischi**, visibile per tutta la partita nel pannello del business. Ogni rischio è collegato a un sistema reale della simulazione (es. "zona a rischio furti" aumenta la probabilità di furti nel primo anno se non si installa un allarme o non c'è pattugliamento).

## 5.6 Scena 6 — Sistema e ripresenta

Il giocatore può sistemare **un motivo alla volta** (cambiare prezzo, posizione, target, orari, modello di ricavo) e ripresentarsi. Le offerte cambiano di conseguenza. Massimo 3 ripresentazioni (poi gli squali "si stancano", con una battuta).

## 5.7 Scena 7 — L'accordo

Scelta tra le offerte ricevute, oppure **autofinanziamento** (capitale minimo, nessuna quota ceduta, difficoltà alta, bonus punteggio). L'accordo ha effetti concreti per tutta la partita: royalty che vengono pagate ogni giorno di gioco, rate del prestito, consigli dell'investitore (che diventa un personaggio della città e ogni tanto chiama).

## 5.8 Transizione

Il cartellone sul cavalletto diventa il **primo edificio** che viene "posato" con una mano di feltro sul plastico della città; la camera passa dal feltro al plastico con una dissolvenza in profondità di campo. Inizia la partita.

---

# PARTE 6 — ECONOMIA, BUSINESS, MERCATO, BORSA E PRODUZIONE

## 6.1 Principi

- **Ogni moneta ha un'origine e una destinazione tracciate**: si sa sempre quanti soldi entrano (stipendi pagati dal "resto del mondo", esportazioni, turismo, interessi) e quanti escono (importazioni, tasse, manutenzione, consumi).
- **Prezzi di mercato veri**: domanda e offerta per ogni bene e servizio, con prezzi che si muovono entro limiti dinamici.
- **Equità prima di tutto** (lezione di Capital Rift).

## 6.2 La curva unica di rientro

Ogni business, di qualsiasi tipo, è tarato su **una sola curva di rientro dell'investimento** espressa in giorni di gioco, che dipende dalla fascia d'investimento. Valori di partenza (da regolare con il bilanciamento automatico):

| Fascia d'investimento | Esempio | Rientro bersaglio |
|---|---|---|
| Micro (fino a 5.000) | carretto del cibo, bancarella | 0,5 giorni di gioco |
| Piccola (5.000–50.000) | bottega, bar, piccolo negozio | 1 giorno |
| Media (50.000–500.000) | ristorante, officina, fattoria | 2,5 giorni |
| Grande (500.000–5 milioni) | supermercato, fabbrica, centrale | 6 giorni |
| Enorme (oltre 5 milioni) | porto, grande industria, grattacielo di uffici | 12 giorni |

Ogni business viene misurato in **almeno due configurazioni di riferimento** con le formule del gioco e ritarato finché il suo rientro reale cade **entro il 25% del bersaglio**. Il report di bilanciamento lo verifica automaticamente a ogni build (Parte 16).

## 6.3 Le quattro corsie

1. **Limitata per giocatore**: piccole attività che si ripagano in fretta ma di cui ognuno può avere poche unità (es. carretti, bancarelle).
2. **Condivisa per area**: negozi, ristoranti, casinò, servizi; i clienti di una zona si dividono tra le attività vicine. **Affollare un'area rallenta il rientro; diffondersi conviene.**
3. **Limitata dal denaro**: grandi impianti con costi di ingresso alti e rientro lento.
4. **Risparmi e investimenti finanziari**: interessi in banca, obbligazioni comunali, azioni.

## 6.4 Regole di scala

- **Le copie rendono allo stesso ritmo**: più posti, più camion, più macchinari nello stesso impianto rendono come il primo (nessun rendimento esplosivo).
- **Rendimenti decrescenti per la stessa attività ripetuta nella stessa zona.**
- **Costi degli edifici scalati** sul valore del terreno e, in modo morbido, sul patrimonio di chi compra (Parte 6.9).

## 6.5 Gestione di un business (pannello dettagliato)

Per ogni attività del giocatore:
- **Prezzi** (con stima della domanda a quel prezzo e curva di elasticità visibile).
- **Orari** di apertura (con stima del passaggio di clienti per fascia oraria).
- **Personale**: assunzioni, turni, salari, formazione, morale, licenziamenti; i dipendenti sono cittadini veri della simulazione.
- **Fornitori**: scelta tra fornitori NPC o del giocatore, contratti, qualità, puntualità.
- **Magazzino**: scorte, scadenze per i prodotti freschi, riordino automatico.
- **Marketing**: volantini, insegne, campagne nel Laboratorio delle Idee, articoli sul Quotidiano.
- **Receptionist AI** (Parte 11.2).
- **Sicurezza**: allarmi, telecamere, guardia giurata, assicurazione.
- **Conti**: entrate, uscite, margine, punto di pareggio, rientro dell'investimento, grafici giornalieri e settimanali.
- **Reputazione**: punteggio con cause (qualità, prezzo, servizio, notizie, passaparola).
- **Espansione**: ristrutturare, ampliare, aprire una seconda sede, franchising, vendere.

## 6.6 Mercato, aste, oggetti unici e borsa

- **Mercato**: compravendita di beni (circa 100 tipi: alimentari, materiali, semilavorati, prodotti finiti, attrezzi), con libro degli ordini, ordini a limite, storico prezzi.
- **Aste immobiliari**: lotti ed edifici all'asta (anche da fallimenti), con offerte a tempo.
- **Oggetti unici**: pezzi rari e da collezione (un'insegna storica, un'auto d'epoca, un'opera d'arte) con valore che fluttua.
- **Borsa della città**: le aziende abbastanza grandi possono **quotarsi**; gli altri attori (giocatore, NPC, fondi) comprano e vendono azioni; dividendi; ticker scorrevole in fondo allo schermo con le variazioni percentuali.
- Tutto con **valuta di gioco**, mai con soldi veri.

## 6.7 Banca, credito e risparmi

- Conti correnti e di risparmio, prestiti con tasso basato su rischio e garanzie, mutui per gli immobili, fallimento con procedura (asta dei beni).
- **Interessi a fasce** (lezione di Capital Rift): tasso pieno sui primi 10 milioni di gioco, 25% del tasso da 10 milioni a 1 miliardo, nessun interesse oltre. Le soglie scalano con la dimensione della città.

## 6.8 Massa monetaria e inflazione

- Bersaglio di crescita della massa monetaria: **circa 25% all'anno di gioco** (regolabile), con un **termostato** che agisce su interessi, tasse e sussidi per restare nel bersaglio.
- Grafico pubblico "Soldi di tutti nel tempo" con la curva reale contro il bersaglio.
- Inflazione dei prezzi misurata con un paniere e mostrata nel pannello economico.

## 6.9 Antimonopolio e disuguaglianza

- **Indice di Gini** della città sempre visibile, con avvisi quando supera le soglie.
- **Tasse progressive** sul reddito e sul patrimonio immobiliare.
- **Microcredito e sussidi** per chi parte indietro o per i quartieri poveri.
- **Antitrust**: se un attore controlla oltre una certa quota di un mercato, scattano indagini e limiti.
- **Niente bot di farming**: gli NPC economici seguono le stesse regole del giocatore e non accumulano ricchezza illimitata.
- Test automatici: in 1.000 partite simulate, nessun attore deve possedere più del 30% della ricchezza totale entro i primi 3 giorni di gioco, salvo scelte esplicite in modalità sandbox.

## 6.10 Pianificatore di produzione

- **Editor a nodi** (ispirato a Capital Rift, ma più chiaro): ogni nodo è un impianto o una macchina con input, output, moltiplicatore, efficienza e flusso al minuto; i collegamenti mostrano le quantità che scorrono, animate.
- Calcolo automatico dei **colli di bottiglia** (nodo evidenziato in ambra), dei rapporti ideali e del profitto per minuto.
- Esempio di catena: legname → segheria (assi) + lingotti di ferro → fabbrica (chiodi) → falegnameria (sedie) → negozio di arredamento.
- Il piano si può "costruire con un clic" se ci sono soldi e spazio, posizionando gli edifici in modo ottimale.

## 6.11 Classifica dei business

Pagina che ordina tutti i tipi di business per: **più veloce a ripagarsi**, **più soldi al giorno**, **più economico per iniziare**; con filtri per corsia, settore e quartiere. Serve a rendere l'economia **trasparente** invece che misteriosa.

---

# PARTE 7 — CITTADINI, SOCIETÀ E LABORATORIO DELLE IDEE

## 7.1 Il cittadino

Ogni persona simulata ha:
- **Anagrafica**: nome (generato, culturalmente vario), età, genere, famiglia, casa, lavoro, istruzione, salute.
- **Economia**: reddito, risparmi, debiti, spese ricorrenti, abitudini di consumo, fedeltà ai marchi.
- **Bisogni** da 0 a 100: fame, riposo, socialità, sicurezza, svago, igiene, denaro, realizzazione. Guidano le scelte con un sistema **utility AI** (ogni azione possibile ha un punteggio in base ai bisogni, alla distanza e al costo).
- **Routine**: sveglia, spostamento al lavoro (a piedi, bici, bus, auto), pausa pranzo, commissioni, tempo libero, rientro; cambia con giorno della settimana, meteo e stagione.
- **Valori e convinzioni** da −1 a +1: fiducia nelle istituzioni, propensione al rischio, apertura al nuovo, senso civico, materialismo, attaccamento al quartiere.
- **Rete sociale**: famiglia, colleghi, vicini, amici; ogni legame ha forza e frequenza di contatto.
- **Memoria breve**: ultimi eventi vissuti (un furto subito, una cena ottima, un licenziamento) che modificano umore e scelte.
- **Umore** complessivo, visibile come colore del puntino nella mappa "felicità".

## 7.2 Vita in città

- Nascite, invecchiamento, morti naturali, matrimoni, separazioni, traslochi, immigrazione ed emigrazione.
- Scuole e università (istruzione che sale nel tempo e cambia i lavori possibili).
- Sanità (ambulatori, ospedale, epidemie leggere stagionali).
- Tempo libero: parchi, bar, cinema, stadio, eventi e festival.
- **Partecipazione civica**: proteste, scioperi, petizioni, elezioni comunali con candidati NPC e programmi (in fase avanzata).

## 7.3 Personaggi con volto

Circa 100 cittadini "importanti" (imprenditori, il giornalista, la commissaria, il boss di quartiere, la contadina, il sindacalista, l'investitore dell'onboarding) hanno **storie, memoria narrativa e dialoghi**. Con chiave API, i loro dialoghi e alcune decisioni sono generati da un LLM con memoria riassunta e limiti di costo. Senza chiave, usano alberi di dialogo scritti e variabili. **Tutti gli altri cittadini usano solo IA a regole.**

## 7.4 Laboratorio delle Idee

- Il giocatore crea un'**idea**: nome, tipo (prodotto, moda, voce, campagna, notizia, abitudine), messaggio, a chi si rivolge, costo di adozione.
- La lancia attraverso **una o più persone** (o un'attività, o il Quotidiano).
- **Modello di diffusione**: contagio a soglia ponderato. Ogni persona adotta quando l'influenza ricevuta dalla rete supera la sua soglia personale, che dipende da apertura al nuovo, fiducia nella fonte, valori compatibili con l'idea, costo di adozione, esposizione ripetuta. Ci sono anche **rifiuto attivo** (chi rifiuta può fare contro-passaparola) e **abbandono** nel tempo.
- **Visualizzazione dal vivo**: i puntini cambiano colore (grigio: non esposto; giallo: esposto; verde: adottato; rosso: rifiuto), archi luminosi mostrano le conversazioni che passano l'idea, mappa del calore per quartiere, curva di adozione nel tempo, "chi ha influenzato di più".
- **Spiegazione per persona**: cliccando un puntino si legge "Ha adottato perché tre amici stretti l'avevano già fatto e si fida di chi gliel'ha detto" oppure "Ha rifiutato: costa troppo rispetto al suo reddito".
- **Classifica**: confronto con gli amici sullo stesso seed e sulla stessa popolazione (punteggio = adottanti finali, velocità, costo).
- **Avviso sempre visibile**: "Questo è un modello simulato: non dimostra che un'idea avrà successo nel mondo reale."
- Le idee adottate hanno **effetti economici** (più clienti per un prodotto, una moda che cambia i consumi, una voce falsa che danneggia un'attività).

---

# PARTE 8 — CRIMINALITÀ, POLIZIA E GIUSTIZIA

## 8.1 Da dove nasce il crimine

Il crimine **non è casuale**: è la somma di **motivazione + opportunità − deterrenza**.
- *Motivazione*: povertà, disoccupazione, debiti, esclusione, appartenenza a una banda, avidità.
- *Opportunità*: contanti, merce di valore, strade buie, edifici abbandonati, folla, orari notturni, assenza di testimoni.
- *Deterrenza*: pattuglie, telecamere, illuminazione, coesione del quartiere, probabilità percepita di essere presi, pene.

## 8.2 Tipi di criminali e reati

- Borseggiatori e ladri (furti in strada, nei negozi, in casa).
- Spacciatori (piazze di spaccio che si spostano se pattugliate) — rappresentati in modo stilizzato, senza dettagli realistici.
- Truffatori (truffe agli anziani, finti investimenti, fatture false).
- Estorsori (pizzo ai negozi).
- Contrabbandieri (merce che entra dal porto o dall'autostrada senza tasse).
- Riciclatori (soldi sporchi che passano da attività legali, che diventano "troppo ricche" rispetto ai clienti).
- Funzionari corrotti (appalti truccati, permessi venduti).
- Hacker (attacchi ai sistemi della città o delle aziende) — rappresentati come eventi astratti.
- **Bande**: gruppi con capo, membri, territorio sulla mappa, attività, rivalità con altre bande. Possono reclutare giovani senza prospettive.

## 8.3 Effetti economici reali

Furti che riducono incassi e scorte, pizzo che erode i margini, mercato nero che abbassa i prezzi legali e toglie tasse, riciclaggio che falsa la concorrenza, quartieri a rischio dove gli immobili perdono valore e le assicurazioni costano di più.

## 8.4 Polizia

- **Commissariati** con capienza di agenti; **agenti** come cittadini veri con turni, stanchezza, morale, esperienza, onestà.
- **Pattuglie** a piedi, in bici, in auto, con percorsi che il giocatore può disegnare o lasciare all'IA.
- **Centrale operativa**: le chiamate dei cittadini arrivano, vengono valutate e la volante più vicina parte, con lampeggianti e sirena (si vede sul plastico).
- **Indagini**: ogni reato lascia **indizi** (testimoni, telecamere, impronte, transazioni sospette, informatori). Le indagini durano giorni di gioco; servono investigatori; si chiedono mandati; si fanno arresti.
- **Strategie** del sindaco: polizia di prossimità, pattuglie mirate nelle zone calde, operazioni contro le bande, unità antifrode, unità informatica.
- **Rischi**: abusi e corruzione nella polizia, che abbassano la fiducia dei cittadini e la collaborazione dei testimoni.

## 8.5 Giustizia

- **Tribunale** con tempi dei processi (che si allungano se è sovraccarico), giudici, pene.
- **Carcere** con capienza, sovraffollamento, programmi di reinserimento, recidiva.
- **Scelte politiche** del giocatore: prevenzione (illuminazione, programmi giovanili, lavoro, servizi sociali) contro repressione (più agenti, pene più dure). Entrambe funzionano in modo diverso nel tempo, e il gioco lo mostra con grafici.

## 8.6 Feedback visivo

Mappa del calore della criminalità per tipo di reato, luci blu e rosse, nastro della polizia sulla scena, posti di blocco, inseguimenti brevi in auto, elicottero in casi gravi. Tono da plastico, stilizzato, **nessuna violenza esplicita o sangue**.

---

# PARTE 9 — AGRICOLTURA, ENERGIA, LOGISTICA E FATTORI

## 9.1 Agricoltura

- Terreni agricoli con fertilità, umidità, pendenza, esposizione.
- **Colture** (grano, ortaggi, frutta, vite, olivo, foraggio) con stagioni, rese, rotazione, irrigazione, concimi, parassiti, siccità, grandine.
- **Allevamento** (galline, mucche, pecore) con capi, foraggio, prodotti (uova, latte, lana, carne).
- **Filiera**: fattoria → raccolta → magazzino o mercato all'ingrosso → negozi e ristoranti → cittadini. Se il raccolto va male, il prezzo al ristorante sale e il giocatore lo vede nella scheda causale.
- Gli **agricoltori** sono cittadini con debiti stagionali, rapporti con la banca, rischio di furti di raccolto ed estorsioni.

## 9.2 Energia

Centrali (carbone, petrolio, gas, idroelettrico, eolico, solare, nucleare in fase avanzata) con costi, inquinamento, affidabilità, prezzo all'ingrosso; rete elettrica con capacità e blackout se sovraccarica. Le centrali vicine si fanno concorrenza sul prezzo (corsia condivisa per area).

## 9.3 Logistica

Camion, garage logistici, magazzini, linee di consegna automatiche pianificate, porto con navi, ferrovia merci. Le merci viaggiano davvero sulla mappa: traffico e distanze contano.

## 9.4 Fattori: la scheda causale

Ogni indicatore importante (disoccupazione, criminalità, felicità, valore del terreno, inflazione, reputazione di un business) ha una **scheda causale**:
- un grafico ad albero o a barre con i fattori che lo determinano, il loro peso in percentuale e la tendenza;
- per ogni fattore, un link "mostrami dove" che porta la camera sulla mappa;
- un suggerimento "cosa puoi fare" con l'effetto stimato e la sua incertezza.

Famiglie di fattori: economici (prezzi, salari, tassi, liquidità), sociali (istruzione, coesione, fiducia), ambientali (inquinamento, meteo, rumore), urbanistici (traffico, servizi, bellezza), di sicurezza (crimine, polizia), del business (i rischi emersi dagli squali).

## 9.5 Eventi

Raccolto record, siccità, sciopero dei trasporti, festival, apertura di una grande azienda, chiusura di una fabbrica, scandalo di corruzione, ondata di furti, blackout, nevicata eccezionale, visita di un investitore, crisi dei prezzi dell'energia. Ogni evento ha **cause tracciabili e conseguenze misurabili**, e genera notizie per il Quotidiano.

---

# PARTE 10 — AGENTI AI: IL QUARTIER GENERALE

## 10.1 Che cos'è

Un edificio speciale della città, sempre visibile, con insegna. Si apre con un tasto (es. `H`) o cliccandolo. La camera "entra" da una finestra e si trova nell'**ufficio virtuale a due piani** dove lavorano gli agenti.

## 10.2 Ambienti dell'ufficio

- **Open space** con scrivanie, monitor, sedie colorate, piante, librerie.
- **Ufficio del Capo** (vetrato, con insegna): qui arrivano le richieste di approvazione.
- **Sala riunioni**: gli agenti ci vanno quando collaborano su un compito; un piccolo schermo mostra di cosa stanno parlando.
- **TV dell'ufficio** con "Condividi schermo": mostra la mappa della città, un grafico o il lavoro di un agente.
- **Lavagna dei servizi**: elenco dei servizi attivi (agenti collegati, code, consumi di token).
- **Angolo relax**: jukebox con la colonna sonora del gioco, **cabinato arcade con un minigioco originale giocabile** (a blocchi o a tema città) con classifica dei record, canestro da basket.
- **Mascotte originale** che gira per l'ufficio (un animale con accessori che cambiano con le stagioni e gli eventi).
- **Decorazioni stagionali** automatiche (Halloween, Natale, estate).
- L'ufficio **cresce**: più agenti e più successi sbloccano un secondo piano, una terrazza, un laboratorio, una sala server.

## 10.3 Gli agenti inclusi (nomi e design originali)

Ogni agente è un robottino con forma, colore e accessorio unici. Nomi proposti (sostituibili): **Bussola, Taccuino, Ingranaggio, Lanterna, Spillo, Mattone, Scintilla, Vela, Rotella**.

| Agente | Ruolo | Cosa fa nel gioco |
|---|---|---|
| **Lanterna** — l'Analista | Fattori e previsioni | Prepara la scheda causale, previsioni a breve con intervallo di incertezza, report settimanale |
| **Taccuino** — il Direttore del Quotidiano | Notizie | Raccoglie gli eventi della notte, taglia il rumore, unisce i doppioni, impagina la prima pagina (Parte 11.1) |
| **Spillo** — la Receptionist | Prenotazioni | Gestisce le prenotazioni delle attività del giocatore (Parte 11.2) |
| **Mattone** — l'Urbanista | Costruzione | Propone dove costruire, con anteprima dell'effetto e motivazioni |
| **Bussola** — la Commissaria (consigliera) | Sicurezza | Briefing quotidiano su criminalità, priorità, operazioni proposte |
| **Ingranaggio** — l'Ingegnere | Produzione | Ottimizza le catene nel pianificatore a nodi, trova i colli di bottiglia |
| **Vela** — la Tesoriera | Finanza | Conti, prestiti, investimenti, avvisi su disuguaglianza e inflazione |
| **Scintilla** — la Creativa | Marketing | Progetta campagne per il Laboratorio delle Idee, slogan, volantini |
| **Rotella** — l'Archivista | Formati | Converte ed esporta (PDF, CSV, PNG, JSON), tutto in locale (Parte 11.3) |

La Giuria dei cinque squali (Parte 5) è un "reparto ospite" che ha la sua sede nello Studio, ma compare in ufficio quando si chiede una nuova valutazione (per esempio per aprire una seconda attività).

## 10.4 Il fumetto di stato

Sopra ogni agente, un fumetto giallo leggibile anche da lontano, con:
- **badge di stato** con colore: In coda (grigio), Al lavoro (verde), In riunione (blu), Serve approvazione (ambra lampeggiante), Bloccato (rosso), Completato (verde con spunta), In pausa (bianco);
- **riga 1**: strumento o motore · modello · titolo del compito (es. "Template · — · Prima pagina di martedì" oppure "LLM · modello scelto · Analisi furti al porto");
- **righe 2–3**: descrizione breve del compito;
- **barra di avanzamento** e tempo stimato;
- un clic apre il **pannello dell'agente**: conversazione, log passo per passo, risultato, pulsanti (approva, rifiuta, rimetti in coda, annulla).

## 10.5 Collegare i miei agenti reali (Agent Bridge)

- Interfaccia `AgentAdapter` (Appendice B): `id`, `nome`, `ruolo`, `avatar`, `permessi`, `stato`, `compitoCorrente`, `run(task)`, `cancel()`, stream di log, risultato.
- Adattatori:
  1. **Locale simulato** (default, nessuna rete).
  2. **WebSocket/HTTP** verso un piccolo servizio locale sul mio computer, per collegare agenti che girano lì (per esempio Claude Code, Codex o altri), con un "companion" opzionale in Node.js documentato in `docs/AGENT_BRIDGE.md`.
  3. **MCP** quando disponibile.
- Un agente reale appare in ufficio con il suo robot, il suo fumetto e il suo stato aggiornato in tempo reale. Il suo **risultato può diventare un evento di gioco** (una notizia, un bonus di reputazione, una decisione da approvare).
- **Sicurezza**: ogni agente dichiara i permessi; **nessuna azione con effetti esterni** (messaggi a persone vere, spese, accesso a file) senza **conferma esplicita** del giocatore; log completo; revoca con un clic.

## 10.6 Controllo dei costi

Budget giornaliero di token per agente e totale, cache dei risultati, raggruppamento delle richieste, ripiego automatico sui template quando il budget finisce, contatore dei consumi visibile sulla lavagna dei servizi.

## 10.7 "Lavorano anche quando non guardi"

Gli agenti lavorano mentre la partita è in pausa o il giocatore è altrove (entro il budget). Al ritorno, un **riepilogo "Mentre eri via"** mostra cosa hanno fatto, cosa aspetta approvazione, cosa è successo in città.

---

# PARTE 11 — IL QUOTIDIANO, LA RECEPTIONIST, LA RUOTA, LA WIKI

## 11.1 Il Quotidiano della città

**Rituale.** Ogni mattina di gioco alle 6, Taccuino prepara l'edizione. Una piccola scena in **carta ritagliata** (8 secondi, saltabile) mostra il robottino che lavora di notte, taglia il rumore, stampa la pagina; poi il giornale "cade" sullo zerbino dell'interfaccia.

**Fonti.** Una volta sola, il giocatore sceglie cosa vuole leggere (bacheca di sughero con biglietti appuntati): cronaca, economia, agricoltura, politica locale, cultura, sport, i propri business. Contatore "Fonti: N".

**Contenuti.**
- Testata con il nome della città e la data di gioco.
- **Articolo di apertura** con "foto" (screenshot automatico della scena dell'evento, con effetto stampa).
- **Tre colonne** di notizie, ognuna con titolo, sommario e collegamento "vai sul posto".
- Rubriche: cronaca nera, economia e borsa, campi e mercati, lettere dei cittadini, meteo, un piccolo cruciverba o gioco (generato).
- **Rumore tagliato**: niente piccoli eventi irrilevanti; **storie doppie unite** in un solo articolo; contatore "Storie: N".
- Lettura in circa 2 minuti.

**Effetti.** Le notizie cambiano davvero la città: reputazione delle attività, fiducia nelle istituzioni, voci che entrano nel Laboratorio delle Idee.

**Esportazione.** PDF con un clic, archivio delle edizioni passate, possibilità di "stampare" (dialogo di stampa del browser).

## 11.2 La Receptionist

**Assunzione.** Ogni attività del giocatore che lavora su appuntamento (parrucchiere, officina, studio medico, ristorante, idraulico) può assumere Spillo come receptionist.

**Cosa fa.** Riceve messaggi simulati dai cittadini (anche di notte), risponde alle domande, controlla il calendario dell'attività, propone gli orari liberi, mostra un **modulo di prenotazione in chat** (nome, servizio, orari), conferma, manda il promemoria. Si vede in una chat stilizzata con fondo crema e la mascotte pixel art.

**Card "Lavoro: reception 24/7"** con la checklist: rispondi a ogni domanda, controlla il calendario, prenota l'orario, manda il promemoria.

**Le quattro regole** (dal riferimento, trasformate in meccaniche):
1. **Canale ufficiale**: la receptionist deve essere configurata sul "canale ufficiale" (costa un po' di più); quello "economico e losco" rischia il **ban del numero** (l'attività perde tutte le prenotazioni per giorni).
2. **Consenso prima**: si possono scrivere messaggi solo ai cittadini che hanno dato il permesso; scrivere senza consenso abbassa la reputazione.
3. **Finestra di 24 ore**: dopo 24 ore di silenzio del cliente, si possono mandare solo **modelli approvati**.
4. **Sui prezzi decide un umano**: ogni messaggio con un preventivo va in approvazione al giocatore (fumetto ambra in ufficio); approvarlo in fretta conta.

**Effetti.** Più prenotazioni, meno clienti persi la sera, reputazione migliore se il servizio è buono. Una sezione "Prova dal vivo" (opzionale, avanzata) spiega come collegare un canale reale tramite Agent Bridge, **sempre con conferma esplicita** e nel rispetto delle regole del canale.

## 11.3 La Ruota (menu radiale universale)

**Gesto.** Trascini un oggetto (edificio, persona, veicolo, documento, agente, notizia), premi **Shift**: appare la ruota sotto il cursore. Su touch: pressione lunga, poi trascini sullo spicchio.

**Due livelli**, come nel riferimento:
- **Anello interno**: le trasformazioni principali dell'oggetto.
- **Anello esterno**: azioni secondarie.

**Esempi.**
- *Edificio*: interno = cambia uso, ristruttura, amplia, vendi; esterno = demolisci, assicura, assegna a un agente, esporta la scheda, imposta allarme, segui.
- *Persona*: interno = segui, parla (solo personaggi importanti), assumi, lancia un'idea tramite lei; esterno = vedi rete sociale, vedi routine, vedi storia.
- *Documento* (report, giornale, screenshot): interno = PDF, PNG, CSV, JSON; esterno = comprimi, ritaglia, annota, oscura dati, aggiungi sfondo, metadati.
- *Agente*: interno = assegna compito, metti in pausa, chiama in riunione; esterno = permessi, log, budget.

**Regole d'uso.** Anteprima dell'effetto prima di rilasciare (costo, impatto stimato), rilascio fuori dalla ruota = annulla, azioni distruttive con conferma, i file esportati appaiono come **nuovi file accanto all'originale**, mai sovrascritti.

## 11.4 La Wiki integrata

- Wiki interna a schede (come quella di Capital Rift, ma ben organizzata), con ricerca, categorie (Primi passi, Soldi e commercio, Negozi e immobili, Terra e industria, Logistica e trasporti, Città e società, Crimine e giustizia, Agenti AI, Riferimenti), e numero di sezioni per pagina.
- Ogni pagina è **collegata al gioco**: dal pannello di un edificio, "?" apre la pagina giusta; dalla wiki, "mostrami in città" porta la camera sull'esempio.
- Generata in parte dai **dati del gioco** (costi, rese, tempi di rientro aggiornati automaticamente: niente wiki obsoleta).
- **Patch notes integrate**, filtrabili per sistema (New, Changed, Fixed, Reverted), con grafici di cosa è cambiato.

---

# PARTE 12 — PIANO PER MILESTONE

Ogni milestone ha un'**uscita verificabile**. Non passare alla successiva finché l'uscita non è raggiunta.

**M0 — Fondamenta (1 settimana)**
Repo, Vite, TypeScript strict, lint, test runner, struttura cartelle (Parte 15), Web Worker di simulazione con ECS minimo, RNG con seed, salvataggio su IndexedDB, overlay di debug (FPS, tick, entità, memoria).
*Uscita*: pagina che carica in meno di 2 secondi, un cubo nel worker che si muove deterministicamente, test verdi.

**M1 — Il plastico (2 settimane)**
Terreno, base del plastico, strade, 30 tipi di edificio con varianti, acqua, alberi, ciclo giorno/notte, meteo base, LOD dei puntini, camera completa, post-processing, preset qualità, risoluzione dinamica, modalità foto 4K.
*Uscita*: una città demo statica bellissima, screenshot 4K da portfolio, 60 FPS sul preset Bilanciato.

**M2 — Costruire (2 settimane)**
Strumenti di costruzione, zone, utenze, annulla/ripeti, blueprint, ciclo di vita degli edifici, interni in sezione per 5 tipi di edificio.
*Uscita*: si costruisce una città da zero con strade, zone e servizi; gli edifici crescono.

**M3 — Persone (2 settimane)**
Cittadini con bisogni, routine, case, lavori, rete sociale, spostamenti, immigrazione, figurine animate, mappa della felicità.
*Uscita*: 10.000 persone in movimento a 60 FPS, simulazione sotto 8 ms per tick.

**M4 — Economia (3 settimane)**
Business, curva di rientro, corsie, prezzi di mercato, banca, interessi a fasce, termostato monetario, Gini, classifica dei business, pannello di gestione completo, pianificatore di produzione a nodi.
*Uscita*: report di bilanciamento automatico verde (tutti i business entro il 25% del bersaglio), nessuna spirale inflazionistica in 1.000 partite simulate.

**M5 — Onboarding (2 settimane)**
Studio in feltro, descrizione libera, archetipi, cinque squali, muro dei no, Lista dei Rischi collegata alla simulazione, accordo, transizione al plastico.
*Uscita*: un nuovo giocatore arriva alla prima costruzione in meno di 5 minuti.

**M6 — Crimine e polizia (2 settimane)**
Motivazione/opportunità/deterrenza, reati, bande, effetti economici, commissariati, pattuglie, centrale operativa, indagini, tribunale, carcere, mappe del calore.
*Uscita*: il crimine si sposta in modo credibile quando si cambiano illuminazione, pattuglie e lavoro.

**M7 — Agricoltura, energia, logistica, fattori, eventi (2 settimane)**
Filiera agricola, stagioni, centrali, rete, camion e magazzini, schede causali di tutti gli indicatori, 20 eventi.
*Uscita*: una siccità fa salire i prezzi al ristorante e la scheda causale lo spiega.

**M8 — Quartier Generale (3 settimane)**
Ufficio a due piani, robot-agenti, fumetti di stato, stanze, minigioco arcade, mascotte, Agent Bridge, i 9 agenti in modalità template, approvazioni fisiche, riepilogo "Mentre eri via", controllo costi.
*Uscita*: almeno un agente reale esterno collegato e visibile in ufficio con stato in tempo reale.

**M9 — Quotidiano, Receptionist, Ruota, Wiki, Laboratorio delle Idee (3 settimane)**
Prima pagina con scena in carta, esportazione PDF, receptionist con le quattro regole, ruota radiale a due livelli su 6 tipi di oggetto, wiki generata dai dati, Laboratorio delle Idee completo con classifica.
*Uscita*: tutti e cinque i sistemi funzionanti e collegati alla simulazione.

**M10 — Rifinitura (3 settimane)**
Audio completo, tutorial, accessibilità, localizzazione, ottimizzazione finale, PWA, test di 2 ore senza crash, documentazione.
*Uscita*: tutti i criteri della Parte 18 soddisfatti.

---

# PARTE 13 — INTERFACCIA E CONTROLLI

## 13.1 Principi

- **Il plastico è protagonista**: l'interfaccia è sottile, semitrasparente (vetro smerigliato leggero), si nasconde con un tasto.
- **Tutto spiega il perché**: ogni numero ha un tooltip con la causa e un link alla scheda causale.
- **Progressione**: le funzioni avanzate (borsa, pianificatore, bande) si sbloccano quando servono, con una breve presentazione.
- **Il pulsante "Cosa faccio adesso?"** sempre disponibile: suggerisce le 3 azioni più utili in questo momento, spiegandole.

## 13.2 Layout principale (desktop)

- **In alto**: nome città, data e ora di gioco, velocità (pausa, ×1, ×2, ×4, ×8), soldi, abitanti, felicità, criminalità, Gini, meteo. Ogni voce è cliccabile.
- **A sinistra**: barra strumenti di costruzione per categorie (strade, zone, servizi, business, utenze, trasporti, decorazioni).
- **A destra**: pannelli contestuali (edificio, persona, business, agente), impilabili e ridimensionabili.
- **In basso**: linea del tempo degli eventi con icone (clic = vai sul posto), ticker della borsa, mini-mappa con livelli (felicità, crimine, valore del terreno, traffico, inquinamento, copertura servizi).
- **Accessi rapidi**: Quartier Generale (`H`), Quotidiano (`N`), Mercato (`M`), Laboratorio delle Idee (`I`), Wiki (`F1`), Pianificatore (`P`).

## 13.3 Telefono e tablet

- Barra inferiore con 5 icone (Costruisci, Città, Business, Agenti, Altro), pannelli a scheda che salgono dal basso, gesti (pizzico per zoom, due dita per ruotare, pressione lunga per la Ruota).
- Bersagli tattili di almeno 44×44 pt, testo di almeno 16 px.

## 13.4 Schermate principali

1. Menu iniziale (il plastico che ruota lentamente sullo sfondo, nuova partita, carica, Laboratorio, scenari, impostazioni).
2. Onboarding nello Studio.
3. Vista città.
4. Pannello edificio (con interno in sezione).
5. Pannello business (Parte 6.5).
6. Pannello persona (bisogni, routine, rete, storia).
7. Mercato, aste, borsa.
8. Pianificatore di produzione.
9. Quartier Generale.
10. Quotidiano.
11. Laboratorio delle Idee.
12. Schede causali.
13. Wiki e patch notes.
14. Impostazioni (grafica, audio, controlli, accessibilità, lingua, agenti AI e chiavi, privacy).
15. Riepilogo "Mentre eri via".

## 13.5 Accessibilità

Contrasto alto, dimensione del testo regolabile, modalità daltonici (le mappe del calore usano anche pattern, non solo colore), sottotitoli per tutti i suoni importanti, riduzione del movimento (niente tilt-shift, transizioni brevi), navigazione completa da tastiera, supporto lettori di schermo per i pannelli.

## 13.6 Tutorial

Cinque minuti, guidati, saltabili, divisi in passi brevi: muovere la camera → costruire una strada → zonizzare case → aprire il business (già fatto nell'onboarding) → leggere la scheda causale → aprire il Quartier Generale → leggere il primo Quotidiano. Poi suggerimenti contestuali solo quando servono.

---

# PARTE 14 — AUDIO

- **Musica** ambient originale, dinamica: strati che si aggiungono o tolgono in base a ora del giorno, meteo, tensione (crimine, crisi), dimensione della città. Il jukebox dell'ufficio permette di sceglierla.
- **Suoni spaziali** sul plastico: traffico, clacson lontani, sirene, mercato, campane, cantieri, uccelli, pioggia sui tetti, onde al porto. Il mix cambia con lo zoom (lontano = brusio di città; vicino = dettagli).
- **Suoni dei diorami**: feltro (fruscii morbidi, applausi ovattati nello studio), carta (fogli, stampante), ufficio (tasti, sedie, macchina del caffè, musica dal jukebox).
- **Interfaccia**: clic discreti, suono di conferma per la Ruota, campanello per le approvazioni.
- Tecnica: Web Audio API, campioni compressi (Opus), streaming della musica, nessun brano protetto da copyright.

---

# PARTE 15 — ARCHITETTURA TECNICA, DATI E PERFORMANCE

## 15.1 Stack

- **Linguaggio**: TypeScript (strict).
- **Build**: Vite; code splitting per ogni grande area (Studio, Quartier Generale, Pianificatore, Wiki caricati solo quando servono).
- **Rendering**: Three.js su WebGL2, con WebGPU opzionale dove disponibile. **InstancedMesh** e **BatchedMesh** per edifici, alberi, auto e persone. Shader personalizzati per acqua, feltro, carta, finestre notturne.
- **Interfaccia**: HTML e CSS sopra il canvas, con un framework leggero (Preact o Svelte) e stato reattivo semplice.
- **Simulazione**: in un **Web Worker** separato; **ECS** con array tipizzati (struct of arrays); timestep fisso (10 tick al secondo a ×1), il rendering interpola a 60 FPS. Per città enormi, simulazione a livelli: dettagliata vicino alla camera, statistica lontano.
- **Ricerca percorsi**: grafo stradale con A* e cache dei percorsi frequenti; flussi aggregati per il traffico lontano.
- **Determinismo**: un solo RNG con seed, nessuna dipendenza da `Date.now()` nella simulazione, comandi del giocatore registrati con il tick in cui avvengono (replay possibile).
- **Salvataggi**: IndexedDB, compressione, versionamento dello schema con migrazioni, salvataggio automatico ogni 5 minuti di gioco, esportazione e importazione di file.
- **PWA**: installabile, funziona offline, aggiornamenti in background.
- **LLM**: modulo `ai/` con interfaccia astratta per i provider, schema di output validato (Zod o simile), cache, budget, ripiego sui template.

## 15.2 Struttura delle cartelle

```
/src
  /app            avvio, routing tra aree, impostazioni
  /render         scena, camera, materiali, post-processing, LOD, foto
  /render/diorama shader e scene di feltro, carta, low-poly
  /sim            worker, ECS, sistemi (economia, persone, crimine, agricoltura, energia, logistica)
  /sim/systems    un file per sistema, con test accanto
  /world          generazione mappa, griglia, strade, edifici
  /ui             componenti, pannelli, Ruota, HUD, tutorial
  /hq             Quartier Generale, agenti, Agent Bridge
  /press          Quotidiano
  /reception      Receptionist
  /ideas          Laboratorio delle Idee
  /wiki           wiki generata dai dati, patch notes
  /ai             provider LLM, template, budget, cache
  /audio          motore audio
  /i18n           traduzioni
  /data           cataloghi (edifici, business, beni, colture, archetipi)
/docs             DECISIONS, ARCHITECTURE, BALANCE, AGENT_BRIDGE, CHANGELOG
/tests            unit, determinismo, bilanciamento, visivi
/tools            script di bilanciamento headless, generatore wiki
```

## 15.3 Budget di performance (obbligatori)

| Metrica | Bersaglio |
|---|---|
| Caricamento iniziale (bundle gzip) | < 2,5 MB, giocabile in < 4 s su connessione normale |
| FPS desktop (GPU integrata recente, preset Bilanciato, 10.000 persone) | 60 |
| FPS telefono di fascia media (preset Telefono, 3.000 persone) | 30 stabili |
| Draw call a schermo | < 300 |
| Tick di simulazione con 10.000 persone | < 8 ms |
| Tick di simulazione con 20.000 persone (Laboratorio) | < 16 ms |
| Memoria desktop / telefono | < 700 MB / < 350 MB |
| Tempo di risposta di un'azione (tipico / 5% più lento) | < 50 ms / < 150 ms |
| "Hitch" (fotogrammi oltre 50 ms) nei primi 10 minuti | < 3 |
| Sessioni senza crash | > 99,5% |

Tecniche: pool di oggetti, nessuna allocazione nei cicli caldi, frustum culling, occlusion culling semplice per isolati, impostor per gli edifici lontani, ombre solo vicino alla camera con cascade, texture compresse, caricamento progressivo.

---

# PARTE 16 — QUALITÀ, TEST, TELEMETRIA, BILANCIAMENTO

- **Test unitari** di ogni sistema della simulazione con seed fissi.
- **Test di determinismo**: stesso seed e stessi comandi = stesso stato finale (hash confrontato).
- **Bilanciamento automatico headless** (`tools/balance`): 1.000 partite simulate a velocità massima con strategie diverse (prudente, aggressiva, casuale, "ottimizzatore avido"). Il report verifica: rientro di ogni business entro il 25% del bersaglio; crescita della massa monetaria entro ±5 punti dal bersaglio; Gini sotto soglia; nessun attore oltre il 30% della ricchezza nei primi 3 giorni; nessuna città che "muore" nei primi 2 giorni senza errori evidenti del giocatore. Il report va in `docs/BALANCE.md`.
- **Test di salvataggio e caricamento** con migrazioni da versioni vecchie.
- **Regressione visiva**: 10 scene di riferimento fotografate a ogni build e confrontate.
- **Test di performance** automatici con i budget della Parte 15.3.
- **Telemetria locale** (anonima, disattivabile, mai inviata senza consenso): hitch, tempi di risposta, crash, mostrata in una **dashboard di performance** nelle impostazioni, come nelle patch notes di Capital Rift.
- **Gestione errori**: niente crash silenziosi; schermata di errore con salvataggio d'emergenza ed esportazione del file.
- **Documentazione**: `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/BALANCE.md`, `docs/AGENT_BRIDGE.md`, `docs/CHANGELOG.md`.

---

# PARTE 17 — SICUREZZA, PRIVACY, ETICA

- Le chiavi API restano **solo sul dispositivo** (archiviazione locale), mai nel codice, mai nei salvataggi esportati.
- Nessun dato lascia il dispositivo senza **consenso esplicito**.
- Gli agenti non possono, senza conferma esplicita: inviare messaggi a persone reali, spendere denaro reale, leggere o scrivere file fuori dalle cartelle autorizzate, pubblicare contenuti.
- La Receptionist in modalità reale (opzionale) rispetta le regole del canale: consenso, finestra di 24 ore, modelli approvati, umano sui preventivi.
- Crimine rappresentato in modo stilizzato, senza istruzioni realistiche, senza glorificazione.
- I risultati del Laboratorio delle Idee e delle previsioni sono **dichiarati come simulazioni**.
- Nessuna valuta reale, nessun acquisto in-app, nessuna lootbox.

---

# PARTE 18 — CRITERI DI ACCETTAZIONE

Il gioco è finito quando **tutti** questi punti sono veri e verificati:

1. Dal primo avvio alla prima costruzione passano **meno di 5 minuti**, senza leggere manuali.
2. Posso descrivere un business con parole mie; i **cinque squali** lo valutano con domande, offerte o uscite motivate; i "no" diventano rischi che influenzano davvero la partita.
3. La città parte da **un solo lotto** e cresce per domanda fino a **10.000 abitanti** a 60 FPS sul preset Bilanciato.
4. Uno screenshot 4K della città **sembra la foto di un plastico** di architettura.
5. Ogni indicatore importante ha una **scheda causale** cliccabile con fattori pesati e "mostrami dove".
6. L'economia rispetta la **curva di rientro** (tutti i business entro il 25%), le **quattro corsie**, il **termostato monetario** e le **fasce sui risparmi**; il report di bilanciamento su 1.000 partite è verde.
7. Il **crimine** nasce da motivazione, opportunità e deterrenza; la polizia lo contrasta con pattuglie e **indagini** credibili; tribunale e carcere funzionano.
8. Il **Quartier Generale** mostra almeno 9 agenti con fumetti di stato completi, stanze funzionanti, minigioco arcade giocabile, mascotte, e **almeno un agente reale esterno** collegato tramite Agent Bridge.
9. Il **Quotidiano** esce ogni mattina di gioco con scena in carta, rumore tagliato, storie unite, e si esporta in PDF.
10. La **Receptionist** prende prenotazioni con modulo in chat e applica le **quattro regole** con conseguenze.
11. La **Ruota** a due livelli funziona su edificio, persona, veicolo, documento, agente e notizia, con anteprima e risultato non distruttivo.
12. Il **Laboratorio delle Idee** regge 20.000 persone, mostra la diffusione dal vivo, spiega ogni adozione o rifiuto e ha la classifica.
13. Il **pianificatore di produzione** calcola flussi, rapporti e colli di bottiglia.
14. La **wiki** è generata dai dati del gioco e collegata ai pannelli.
15. **Due ore di gioco continuo senza crash**, nessun salvataggio corrotto, tutti i budget della Parte 15.3 rispettati.
16. Funziona **offline e senza chiavi API**, in italiano, su desktop e telefono.

---

# PARTE 19 — COSE DA NON FARE

- Non usare un LLM per ogni cittadino: si usano regole per la folla e LLM solo per pochi personaggi e per gli agenti.
- Non copiare nomi, loghi, personaggi, musiche o grafica dei riferimenti (Capital Rift, i robot dell'ufficio, la mascotte, i nomi dei servizi di messaggistica, il cubetto arancione, la testata del giornale): sono **ispirazione di meccaniche e stile**, non asset.
- Non usare nomi reali di aziende o persone dentro il gioco.
- Non mettere paywall, pubblicità, lootbox, acquisti in-app o obbligo di account.
- Non permettere a bot o NPC di accumulare ricchezza senza limiti.
- Non far partire nessuna azione esterna (messaggi, spese, file, pubblicazioni) senza conferma esplicita.
- Non presentare simulazioni e previsioni come verità sul mondo reale.
- Non consegnare funzioni "di facciata" che si vedono ma non funzionano.
- Non saltare test, bilanciamento e misure di performance per fare prima.
- Non rendere l'interfaccia più importante del plastico.

---

# APPENDICE A — CATALOGO INIZIALE DI EDIFICI E BUSINESS

**Residenziale**: villetta, schiera, palazzina 4 piani, condominio 8 piani, torre residenziale, case popolari, residence per studenti.

**Commercio e servizi privati**: carretto del cibo, bancarella del mercato, bar, pasticceria, pizzeria al taglio, ristorante (20, 50, 120 coperti), alimentari, supermercato, ferramenta, farmacia, parrucchiere, palestra, officina auto, officina bici, lavanderia, negozio di abbigliamento, libreria, negozio di elettronica, studio medico, studio dentistico, studio legale, agenzia immobiliare, hotel, ostello, cinema, teatro, discoteca, casinò, sala giochi, stazione di servizio, autolavaggio, banca, assicurazione.

**Uffici**: coworking, palazzina uffici, torre direzionale, sede di startup, data center.

**Industria e produzione**: segheria, falegnameria, fabbrica metallurgica, officina meccanica, fabbrica di mobili, panificio industriale, caseificio, birrificio, cantina, frantoio, fabbrica di plastica, raffineria, cementificio, fabbrica tessile, laboratorio artigiano.

**Agricoltura**: orto, campo di grano, vigneto, uliveto, frutteto, serra, pollaio (100 galline), stalla (100 mucche), ovile (100 pecore), silo, spaccio aziendale, mercato all'ingrosso.

**Energia**: centrale a carbone, a petrolio, a gas, idroelettrica, parco eolico, parco solare, piattaforma offshore (piccola e grande), sottostazione.

**Logistica e trasporti**: garage logistico (2, 5, 10 camion), magazzino, deposito frigorifero, fermata bus, deposito bus, stazione ferroviaria, scalo merci, porto, darsena, parcheggio multipiano.

**Pubblico**: municipio, scuola elementare, scuola media, liceo, università, biblioteca, ambulatorio, ospedale, caserma dei pompieri, commissariato, questura, tribunale, carcere, centro per l'impiego, centro giovani, centro anziani, ufficio postale, discarica, centro di riciclo, depuratore, acquedotto, cimitero.

**Speciali**: Quartier Generale degli agenti, redazione del Quotidiano, Studio degli Squali, borsa della città, museo, stadio, monumento della città.

**Decorazioni**: parco piccolo e grande, piazza, fontana, statua, viale alberato, panchine, giochi per bambini, orto urbano, canale con passeggiata.

---

# APPENDICE B — SCHEMI DATI PRINCIPALI

```ts
// Cittadino (componenti ECS, mostrati come oggetto per chiarezza)
interface Cittadino {
  id: number;
  nome: string;
  eta: number;
  famigliaId: number;
  casaId: number;
  lavoroId: number | null;
  istruzione: 0 | 1 | 2 | 3 | 4;
  salute: number;            // 0–100
  reddito: number;
  risparmi: number;
  debiti: number;
  bisogni: Record<'fame'|'riposo'|'socialita'|'sicurezza'|'svago'|'igiene'|'denaro'|'realizzazione', number>;
  valori: Record<'fiducia'|'rischio'|'apertura'|'civismo'|'materialismo'|'quartiere', number>; // −1..+1
  legami: { altroId: number; forza: number; frequenza: number; tipo: 'famiglia'|'amico'|'collega'|'vicino' }[];
  memoria: { tick: number; evento: string; impatto: number }[];
  umore: number;
  statoCriminale?: { bandaId?: number; propensione: number; precedenti: number };
}

// Business
interface Business {
  id: number;
  archetipo: string;
  proprietario: 'giocatore' | 'npc' | number;
  edificioId: number;
  corsia: 'perGiocatore' | 'condivisaArea' | 'limitataDenaro' | 'risparmio';
  investimento: number;
  rientroBersaglioGiorni: number;
  prezzi: Record<string, number>;
  orari: { apre: number; chiude: number }[];
  dipendenti: number[];
  fornitori: number[];
  magazzino: Record<string, number>;
  reputazione: { valore: number; cause: { fattore: string; peso: number }[] };
  conti: { giorno: number; entrate: number; uscite: number }[];
  rischi: { id: string; descrizione: string; sistema: string; intensita: number }[]; // dalla Giuria
  receptionist?: { attiva: boolean; canaleUfficiale: boolean; consensi: number[] };
}

// Idea nel Laboratorio
interface Idea {
  id: string;
  titolo: string;
  tipo: 'prodotto'|'moda'|'voce'|'campagna'|'notizia'|'abitudine';
  messaggio: string;
  costoAdozione: number;
  valoriAffini: Partial<Cittadino['valori']>;
  fonti: number[];          // id dei cittadini o business da cui parte
  stato: Map<number, 'nonEsposto'|'esposto'|'adottato'|'rifiutato'|'abbandonato'>;
  spiegazioni: Map<number, string>;
}

// Agente AI
interface AgentAdapter {
  id: string;
  nome: string;
  ruolo: string;
  avatar: { forma: string; colore: string; accessorio: string };
  permessi: ('leggereCitta'|'proporreAzioni'|'eseguireAzioniGioco'|'esportareFile'|'azioniEsterne')[];
  stato: 'inCoda'|'alLavoro'|'inRiunione'|'serveApprovazione'|'bloccato'|'completato'|'inPausa'|'errore';
  compitoCorrente?: { motore: string; modello?: string; titolo: string; descrizione: string; avanzamento: number; etaSecondi?: number };
  run(task: Compito): AsyncIterable<EventoAgente>;
  cancel(): Promise<void>;
}

interface Compito { id: string; tipo: string; input: unknown; richiedeApprovazione: boolean; budgetToken?: number }
type EventoAgente =
  | { tipo: 'log'; testo: string }
  | { tipo: 'avanzamento'; valore: number }
  | { tipo: 'approvazione'; richiesta: string; anteprima?: unknown }
  | { tipo: 'risultato'; dati: unknown; effettoGioco?: EffettoGioco }
  | { tipo: 'errore'; messaggio: string };

// Notizia del Quotidiano
interface Notizia {
  id: string;
  rubrica: 'apertura'|'cronaca'|'economia'|'campi'|'politica'|'cultura'|'lettere'|'meteo';
  titolo: string;
  sommario: string;
  corpo: string;
  eventiOrigine: string[];  // id degli eventi della simulazione (per unire i doppioni)
  luogo: { x: number; y: number };
  immagine?: Blob;
  rilevanza: number;
}
```

---

# APPENDICE C — PALETTE, TIPOGRAFIA E TOKEN DI DESIGN

**Plastico (città)**
- Gesso `#F2EFE9` · Sabbia `#E4DCCD` · Crema `#EDE6D8` · Grigio caldo `#B9B2A6` · Legno chiaro `#D8C3A0` · Strada `#CFC9BF` · Acqua `#A9C3D6` · Salvia `#9FB29A` · Ombra `#5E5850`
- Accenti di significato: Polizia `#D9443A` · Emergenza `#3C7DDB` · Economia `#E2A33B` · Agenti AI `#33C6C9` · Agricoltura `#6FA35A` · Criminalità (mappe) `#8A4FB8`

**Studio degli Squali (feltro)**
- Verde petrolio `#1F6F6B` · Senape `#C99A2E` · Rosso pedana `#B5322F` · Crema tende `#EADBC0` · Arancio protagonista `#E8792B` · Luce lampadine `#FFD9A0`

**Quartier Generale (low-poly)**
- Pareti `#E8D5C0` · Legno `#C99E73` · Rosa tappeto `#E7B6C2` · Fumetto `#FFF0A8` con bordo `#2B2B2B` · Badge verde `#2E9E62` · Ambra `#E59A2F` · Rosso `#D9443A`

**Quotidiano (carta)**
- Carta `#EFE7D6` · Terracotta `#C9694A` · Verde bottiglia `#2F5D4B` · Blu notte `#1E2A44` · Inchiostro `#22201C`

**Receptionist (carta crema e pixel)**
- Fondo `#F7E7DC → #F2D3C2` · Arancio `#E2673A` · Testo `#2A211C`

**Interfaccia**
- Vetro: bianco al 72% con sfocatura 16 px (tema chiaro), nero al 60% (tema scuro), bordo 1 px al 12%.
- Raggi: 10 px pannelli, 999 px pillole. Ombre morbide e corte.
- Tipografia (licenze libere): titoli in un grottesco moderno (es. Inter Tight o Manrope), testo in Inter, numeri tabulari, testata del giornale in un blackletter libero, sottotitoli dei diorami in un serif rotondo (es. Fraunces).

---

# APPENDICE D — TESTI DI ESEMPIO (TONO DI VOCE)

Tono: chiaro, caldo, un po' ironico, mai tecnico senza bisogno.

- *Squalo che esce*: "Il tuo panino è ottimo, ma in quella via passa una persona ogni dieci minuti. Per questo motivo, io sono fuori."
- *Negoziatore*: "Ti do 80.000. In cambio voglio il 4% di ogni vendita. Per sempre. Leggi bene: per sempre."
- *Scheda causale*: "La criminalità a Borgo Canale è salita del 18% questa settimana. Pesano soprattutto: lampioni spenti (35%), chiusura della fabbrica (30%), nessuna pattuglia notturna (25%)."
- *Fumetto agente*: "AL LAVORO · Template · Prima pagina di giovedì — Unisco tre notizie sul blackout e taglio gli annunci minori."
- *Approvazione*: "Spillo ha un preventivo da 340 per la revisione della caldaia della signora Marini. Lo mandi?"
- *Quotidiano, titolo d'apertura*: "Notte di pioggia, mattina di code: il forno di via dei Mulini raddoppia i clienti"
- *Laboratorio, spiegazione*: "Ha adottato l'idea: tre colleghi l'avevano già provata e si fida di loro."
- *Avviso*: "Questo è un modello simulato. Non dimostra che un'idea avrà successo nel mondo reale."
- *Mentre eri via*: "Mentre eri via: 14 prenotazioni prese, 2 preventivi da approvare, un furto in via Roma (indagine aperta), il Quotidiano di domani è pronto."/mnt/project-files/uploads/:
hearth

/mnt/project-files/uploads/hearth/:
471b1413-7932-41ca-a7fc-67b133dd0045
