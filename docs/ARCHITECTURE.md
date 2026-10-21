# Architettura

```
src/
  app/game.ts        collega worker, renderer e interfaccia; input; pannelli; salvataggi
  sim/               simulazione pura, senza DOM, eseguita in un Web Worker
    world.ts         stato del mondo e sistemi (costruzione, crescita, cittadini, felicità, economia)
    stores.ts        edifici e cittadini come struct-of-arrays (array tipizzati)
    pathfinding.ts   grafo stradale: componenti connesse e BFS con cache
    economy.ts       curva unica di rientro per fascia d'investimento, affollamento
    rules.ts         costo e validità di ogni strumento (condiviso con l'anteprima)
    rng.ts           un solo RNG con seed (mulberry32)
    worker.ts        loop a passo fisso (10 tick/s a ×1), snapshot con backpressure
    protocol.ts      messaggi tra worker e pagina
    scenario.ts      layout di riferimento per test, bilanciamento e screenshot
  world/mapgen.ts    mappa procedurale da seed: canale, boschi, campi, autostrada, primo lotto
  render/            Three.js: plastico, camera, materiali, post-processing
  ui/                stile (token dell'Appendice C), icone, helper DOM
  i18n/              italiano completo, inglese parziale, fallback all'italiano
  save/idb.ts        salvataggi su IndexedDB, esportazione e importazione JSON
  data/archetypes.ts 14 archetipi di business e classificatore a parole chiave
tests/               unit, determinismo, crescita, economia, salvataggi
tools/               bilanciamento headless, screenshot, build a pagina singola
```

## Flusso

1. La pagina manda comandi al worker (`paint`, `undo`, `redo`, `speed`, `save`, `inspect`).
2. Il worker applica i comandi tra un tick e l'altro e avanza la simulazione a passo fisso.
3. Dopo ogni gruppo di tick manda uno snapshot: posizioni delle persone (sempre), griglia (solo se cambiata), edifici (solo se cambiati), eventi.
4. Il worker non manda lo snapshot successivo finché la pagina non lo ha disegnato (`ack`), così a velocità alte la coda non cresce.
5. Il renderer interpola le posizioni delle persone a 60 FPS tra due tick.

## Determinismo

Tutta la simulazione usa un solo `Rng` con seed e nessuna lettura dell'orologio. `World.hash()` riassume lo stato: lo stesso seed con gli stessi comandi dà lo stesso hash (test in `tests/world.test.ts`).

## Rendering

- Un `InstancedMesh` per tipo di pezzo (corpi con finestre, volumi lisci, tetti, cilindri, impalcature, alberi, persone, strade, zone): circa 20–25 draw call.
- Finestre procedurali nello shader dei corpi: scure di giorno, accese a caso di notte.
- Post-processing: GTAO opzionale, tilt-shift separabile, grading per ora del giorno, vignettatura, grana.
- Risoluzione dinamica: −10% sotto il bersaglio di FPS, fino al 50%, poi risale.
