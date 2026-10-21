# Decisioni

| Data | Decisione | Alternative scartate | Motivo |
|---|---|---|---|
| 2026-10-21 | Repository `citybuilder`, progetto chiamato City Lab | — | Nome scelto dall'utente per la repo; il gioco mantiene il titolo del prompt. |
| 2026-10-21 | Interfaccia in DOM puro con un helper `h()` | Preact, Svelte | Meno dipendenze per la prima fetta; si passa a Preact quando i pannelli crescono (M4). |
| 2026-10-21 | Mappa 64×64 caselle, una casella ≈ 20 m | 2×2 km reali con griglia fine | Basta per la prima fetta e tiene il tick sotto 0,1 ms; le taglie media e grande arrivano con M2. |
| 2026-10-21 | Un giorno di gioco = 14.400 tick (24 minuti a ×1) | — | Come chiede la Parte 3.1. |
| 2026-10-21 | Edifici di una casella, che crescono di livello (1–3) | Lotti multi-casella | Semplice e leggibile; i lotti grandi arrivano con M2. |
| 2026-10-21 | Il 55% degli abitanti lavora | Tutti lavorano | Senza bambini e pensionati la crescita si fermava: ogni posto di lavoro porta circa 1,8 abitanti. |
| 2026-10-21 | Domanda di industria con una quota di esportazioni che cresce col tempo | Industria solo per la domanda interna | Senza una spinta esterna la città raggiunge un equilibrio piccolo e si ferma. |
| 2026-10-21 | Annulla ripristina terreno e zone ma non ricostruisce edifici demoliti | Undo completo degli edifici | Un edificio demolito ha perso abitanti e lavoratori; ricostruirli finti romperebbe il modello. |
| 2026-10-21 | Clienti del business = clienti di riferimento della fascia × domanda del bacino × affollamento | Simulare ogni scontrino | Garantisce la curva unica di rientro (Parte 6.2) e resta spiegabile in una frase. |
| 2026-10-21 | Onboarding ridotto: descrizione → archetipo → scheda | Studio degli Squali completo | Lo Studio è M5; intanto il giocatore parte già dal proprio business. |
| 2026-10-21 | Snapshot con backpressure (`ack`) | Snapshot a ogni intervallo | A velocità alte la coda di messaggi ritardava l'interfaccia di secondi. |
| 2026-10-21 | Valuta di gioco con il simbolo ₵ | € | Il prompt vieta valuta reale (Parte 17). |
