// Carica nel database le configurazioni di locali/ (attivazione o aggiornamento).
//   DATABASE_URL=postgres://... npm run carica-locali            tutti i locali
//   DATABASE_URL=postgres://... npm run carica-locali -- da-mario  uno solo

import postgres from "postgres";
import { ArchivioPostgres, sqlDaPostgresJs } from "../src/adattatori/archivio-postgres.ts";
import { caricaLocali } from "../src/adattatori/node.ts";
import { CARTELLA_LOCALI, posizionale } from "./comune.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Serve DATABASE_URL (stringa di connessione del database Supabase)");
const solo = posizionale();
const sql = postgres(url, { prepare: false, max: 1 });
const archivio = new ArchivioPostgres(sqlDaPostgresJs(sql as never));
try {
  for (const config of caricaLocali(CARTELLA_LOCALI).filter((c) => !solo || c.slug === solo)) {
    await archivio.salvaConfigurazione(config);
    console.log(`Caricato ${config.slug} (${config.nome})`);
  }
} finally {
  await sql.end();
}
