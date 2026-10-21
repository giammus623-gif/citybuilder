# City Lab

City builder nel browser: parti da un solo business e guarda nascere intorno a lui una città con persone, lavoro, negozi e conti veri. Il progetto completo è descritto in [`docs/PROMPT_MASTER.md`](docs/PROMPT_MASTER.md) e si costruisce per milestone (Parte 12).

## Stato

Prima fetta di **M0 + M1** (vedi [`docs/CHANGELOG.md`](docs/CHANGELOG.md)): simulazione deterministica in un Web Worker, plastico in Three.js con giorno e notte, costruzione di strade e zone, crescita per domanda, scheda del business con la curva di rientro, scheda causale della felicità, salvataggi.

## Avvio

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # test della simulazione (determinismo, crescita, economia, salvataggi)
npm run balance      # partite headless con il layout di riferimento
npm run build        # build di produzione in dist/
npm run build:artifact  # una sola pagina HTML autosufficiente
npm run shots        # screenshot desktop e telefono (serve `npm run preview` attivo)
```

## Comandi

| Azione | Mouse e tastiera | Touch |
|---|---|---|
| Spostare la vista | trascina con lo strumento Guarda, WASD o frecce | due dita |
| Ruotare | tasto destro trascinato, Q / E a scatti di 90° | due dita che ruotano |
| Zoom | rotella | pizzico |
| Strumenti | 1–7 | barra in basso |
| Annulla / ripeti | Ctrl+Z / Ctrl+Y | pulsanti |
| Pausa | Spazio | ⏸ |
| Misure | F3 | Impostazioni |

## Struttura

Vedi [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Le decisioni prese sono in [`docs/DECISIONS.md`](docs/DECISIONS.md), i numeri del bilanciamento in [`docs/BALANCE.md`](docs/BALANCE.md).
