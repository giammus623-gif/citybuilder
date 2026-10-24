// Crea la configurazione di un nuovo locale (demo personalizzata, prompt 17.8,
// o attivazione di un cliente) partendo da locali/_modello.json.
//   npm run nuovo-locale -- --slug da-mario --nome "Trattoria Da Mario" --tipo trattoria --pacchetto pro --citta Viterbo
// I campi da confermare con il titolare sono elencati in "_daConfermare".

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { leggiConfigurazione } from "../src/core/configurazione.ts";
import { argomento, CARTELLA_LOCALI } from "./comune.ts";

const slug = argomento("slug");
const nome = argomento("nome");
if (!slug || !nome) {
  console.error('Uso: npm run nuovo-locale -- --slug da-mario --nome "Trattoria Da Mario" [--tipo trattoria] [--pacchetto pro] [--citta Viterbo] [--provincia VT]');
  process.exit(1);
}
const file = `${CARTELLA_LOCALI}/${slug}.json`;
if (existsSync(file)) throw new Error(`${file} esiste già`);

const modello = JSON.parse(readFileSync(`${CARTELLA_LOCALI}/_modello.json`, "utf8"));
modello.id = crypto.randomUUID();
modello.slug = slug;
modello.nome = nome;
modello.tipo = argomento("tipo") ?? modello.tipo;
modello.pacchetto = argomento("pacchetto") ?? modello.pacchetto;
modello.contatti.indirizzo.citta = argomento("citta") ?? modello.contatti.indirizzo.citta;
modello.contatti.indirizzo.provincia = (argomento("provincia") ?? modello.contatti.indirizzo.provincia).toUpperCase();
modello.privacy.ragioneSociale = nome;
leggiConfigurazione(modello); // controlla subito che il file sia valido
writeFileSync(file, `${JSON.stringify(modello, null, 2)}\n`);

const c = leggiConfigurazione(modello);
console.log(`Creato ${file}.`);
console.log("\nDa confermare con il titolare prima di attivare:");
for (const voce of modello._daConfermare) console.log(`  - ${voce}`);
console.log(`\nDieci frasi di prova per la demo (Parte 6.3 e 17.8):
  1. Vorrei prenotare per due persone sabato alle 20:30.
  2. Avete posto venerdì alle 21 per quattro? (se è pieno: quali alternative?)
  3. Siamo in dodici per una cena di compleanno. (gruppo grande: passa al titolare)
  4. Mio figlio è celiaco, cosa può mangiare? (risposta prudente, niente rassicurazioni)
  5. Devo spostare la prenotazione di domani alle 21.
  6. C'è parcheggio? Posso portare il cane?
  7. È accessibile in sedia a rotelle?
  8. Siete aperti a Santo Stefano? (chiusure e festivi)
  9. Posso parlare con il titolare?
 10. Ho prenotato ma non vengo più, annullate per favore.

Messaggio WhatsApp con la demo (Parte 9.5):
"Ecco la prova: chiami [numero di prova] e provi a prenotare un tavolo per 4 persone sabato. Risponde come risponderebbe per ${c.nome}. Se qualcosa non va, mi dica cosa le è sembrato strano: la demo serve anche a questo."

Regola: usare solo informazioni pubbliche del locale e cancellare la demo se il titolare non procede.`);
