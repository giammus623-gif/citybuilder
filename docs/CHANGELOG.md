# Changelog

## 0.1.0 — 2026-10-21 · M0 e prima fetta di M1

**Fatto**
- Vite + TypeScript strict, ESLint, Prettier, Vitest (29 test verdi).
- Simulazione in un Web Worker, deterministica, con RNG a seed, salvataggio su IndexedDB, esportazione e importazione.
- Mappa procedurale: canale, boschi, campi fertili ai bordi, autostrada verso il resto del mondo, un solo lotto pronto.
- Costruzione: strade (ponti sull'acqua), case, negozi, industria, parchi, demolizione, annulla/ripeti, anteprima con costo.
- Città che cresce per domanda: cantieri, abitanti che arrivano dall'autostrada, lavoro, spesa, routine giornaliera, salita di livello.
- Business del giocatore con 14 archetipi, curva unica di rientro, bacino, passaggio davanti, concorrenza nella stessa area.
- Schede: business, felicità con i fattori pesati e un consiglio, conti della città, edifici, "Cosa faccio adesso?".
- Plastico: base in legno smussata, tavolo, finestre procedurali accese di notte, ciclo giorno/notte, lampioni, tilt-shift, GTAO opzionale, grading, preset di qualità, risoluzione dinamica, foto 3840×2160.
- Interfaccia in italiano (inglese parziale), layout desktop e telefono, tema chiaro e scuro, riduzione del movimento, overlay di misure (F3).

**Misure** (Chromium headless con rendering software SwiftShader, quindi FPS non rappresentativi della GPU)
- Bundle: 182 KB gzip (bersaglio < 2,5 MB).
- Caricamento fino alla schermata iniziale: 1,1–3,3 s in locale.
- Tick di simulazione con ~500 abitanti: 0,013 ms (bersaglio < 8 ms con 10.000).
- Draw call: 23 (bersaglio < 300).
- Heap JS: 8–9 MB.

**Non ancora**
- Meteo, stagioni, veicoli, interni in sezione, LOD a figurine.
- Taglie di mappa, curve, rotonde, blueprint.
- Tutto da M2 in poi: Studio degli Squali, mercato, banca, crimine, Quartier Generale, Quotidiano, Ruota, Wiki, audio.

## Screenshot

| Desktop 1440×900 | Telefono 390×844 |
|---|---|
| ![](screenshots/m1/desktop-2-city.png) | ![](screenshots/m1/phone-2-city.png) |
| ![](screenshots/m1/desktop-4-night.png) | ![](screenshots/m1/phone-3-panel.png) |
