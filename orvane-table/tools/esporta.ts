// Esporta tutti i dati di un locale in un solo file JSON (Parte 6.2 e 13.7).
//   npm run esporta -- demo-trattoria

import { mkdirSync, writeFileSync } from "node:fs";
import { apriArchivio, posizionale } from "./comune.ts";

const slug = posizionale() ?? "demo-trattoria";
const { archivio, chiudi } = await apriArchivio();
const config = await archivio.configurazionePerSlug(slug);
if (!config) throw new Error(`Locale ${slug} non trovato`);
const dati = await archivio.esporta(config.id);
const cartella = new URL("../esportazioni", import.meta.url).pathname;
mkdirSync(cartella, { recursive: true });
const file = `${cartella}/${slug}-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(file, JSON.stringify(dati, null, 2));
console.log(`Scritto ${file}. Contiene dati personali: consegnarlo solo al titolare e non committarlo.`);
await chiudi();
