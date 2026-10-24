// Prepara il file per l'analisi settimanale dei casi falliti (prompt 17.5).
//   npm run analisi -- demo-trattoria [--settimana 2026-11-02]
// Il file va incollato in un assistente AI; le proposte che ne escono si
// inseriscono come modifiche e le approva il titolare.

import { mkdirSync, writeFileSync } from "node:fs";
import { aggiungiGiorni, istanteLocale } from "../src/core/tempo.ts";
import { preparaAnalisi } from "../src/rapporti/analisi-settimanale.ts";
import { apriArchivio, argomento, posizionale } from "./comune.ts";

const slug = posizionale() ?? "demo-trattoria";
const { archivio, chiudi } = await apriArchivio();
const config = await archivio.configurazionePerSlug(slug);
if (!config) throw new Error(`Locale ${slug} non trovato`);
const giorno = argomento("settimana") ?? aggiungiGiorni(istanteLocale(new Date(), config.fusoOrario).data, -7);
const testo = await preparaAnalisi(archivio, config, giorno);
const cartella = new URL("../esportazioni", import.meta.url).pathname;
mkdirSync(cartella, { recursive: true });
const file = `${cartella}/analisi-${slug}-${giorno}.md`;
writeFileSync(file, testo);
console.log(`Scritto ${file} (nomi e numeri sostituiti da segnaposto). Non committare: contiene trascrizioni.`);
await chiudi();
