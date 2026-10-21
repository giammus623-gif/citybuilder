# Bilanciamento

Report generato con `npm run balance -- 3 3` (layout di riferimento in `src/sim/scenario.ts`, archetipo pizzeria).

```
seed 1 giorno 1: pop 460 lavoro 248/251 edifici 90 felicità 68 domanda R0.05 C-0.36 I0.17 soldi 102582 saldo 47332 (tasse 15220, business 32382) bacino 527
seed 1 giorno 2: pop 496 lavoro 268/271 edifici 97 felicità 67 domanda R0.05 C-0.24 I0.11 soldi 144954 saldo 42372 (tasse 16420, business 26222) bacino 390
seed 1 giorno 3: pop 514 lavoro 278/291 edifici 101 felicità 67 domanda R0.16 C-0.17 I0.01 soldi 190840 saldo 45886 (tasse 17020, business 29136) bacino 442
  tick medio 0.015 ms
seed 2 giorno 1: pop 412 lavoro 215/222 edifici 83 felicità 71 domanda R0.01 C-0.24 I0.15 soldi 96357 saldo 41057 (tasse 13525, business 27802) bacino 452
seed 2 giorno 2: pop 448 lavoro 236/242 edifici 91 felicità 70 domanda R0.01 C-0.09 I0.09 soldi 132685 saldo 36328 (tasse 14740, business 21858) bacino 339
seed 2 giorno 3: pop 514 lavoro 275/292 edifici 105 felicità 68 domanda R0.17 C-0.02 I-0.11 soldi 174179 saldo 41494 (tasse 16975, business 24789) bacino 425
  tick medio 0.014 ms
seed 3 giorno 1: pop 514 lavoro 278/335 edifici 104 felicità 69 domanda R0.68 C-0.75 I-0.07 soldi 100804 saldo 45254 (tasse 17020, business 28504) bacino 586
seed 3 giorno 2: pop 514 lavoro 278/335 edifici 104 felicità 69 domanda R0.68 C-0.75 I0.03 soldi 140512 saldo 39708 (tasse 17020, business 22958) bacino 388
seed 3 giorno 3: pop 514 lavoro 278/335 edifici 104 felicità 69 domanda R0.68 C-0.75 I0.13 soldi 178137 saldo 37625 (tasse 17020, business 20875) bacino 346
  tick medio 0.018 ms
```

## Curva di rientro

Il test `tests/economy.test.ts` controlla che ogni archetipo rientri entro il 25% del bersaglio della sua fascia in due configurazioni di riferimento (bacino di 300 persone senza concorrenti; bacino di 330 con un concorrente). Oggi passano tutti e 14.

## Da tenere d'occhio

- Il business vale più delle tasse di tutta la città: con 500 abitanti il profitto del business è circa il 60% del saldo giornaliero. Va ribilanciato con banca, prestiti e costi d'ingresso (M4).
- La città si ferma quando finiscono le zone: è voluto, ma la domanda di case alta va resa più visibile.
- Il report su 1.000 partite e i limiti di Gini arrivano con M4.
