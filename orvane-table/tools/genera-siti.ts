// Genera i siti statici dei locali in dist/siti/<slug>/.
//   npm run siti                          tutti i locali, senza modulo online
//   npm run siti -- demo-trattoria --api https://.../orvane-api --url https://trattoria.it

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { caricaLocali } from "../src/adattatori/node.ts";
import { generaSito } from "../src/sito/genera.ts";
import { argomento, CARTELLA_LOCALI, posizionale } from "./comune.ts";

const solo = posizionale();
const locali = caricaLocali(CARTELLA_LOCALI).filter((c) => !solo || c.slug === solo);
if (!locali.length) throw new Error(`Nessun locale "${solo}" in ${CARTELLA_LOCALI}`);

for (const config of locali) {
  const cartella = new URL(`../dist/siti/${config.slug}`, import.meta.url).pathname;
  rmSync(cartella, { recursive: true, force: true });
  mkdirSync(cartella, { recursive: true });
  const file = generaSito(config, {
    apiBase: argomento("api") ?? config.sito.apiBase,
    urlSito: argomento("url") ?? (config.sito.dominio ? `https://${config.sito.dominio}` : undefined),
  });
  let byte = 0;
  for (const [nome, contenuto] of file) {
    writeFileSync(join(cartella, nome), contenuto);
    byte += Buffer.byteLength(contenuto);
  }
  console.log(`${config.nome}: ${file.size} file, ${(byte / 1024).toFixed(1)} KB in ${cartella}`);
  if (!config.demo) console.log("  Ricorda: l'informativa privacy va rivista con un consulente prima della pubblicazione.");
}
