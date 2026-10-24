// Parti comuni degli strumenti da riga di comando.

import { ArchivioMemoria } from "../src/adattatori/archivio-memoria.ts";
import { ArchivioPostgres, sqlDaPostgresJs } from "../src/adattatori/archivio-postgres.ts";
import { caricaLocali } from "../src/adattatori/node.ts";
import type { Archivio } from "../src/core/archivio.ts";
import { MessaggeroMemoria } from "../src/core/messaggero.ts";
import { popolaDemo } from "./dati-demo.ts";

export const CARTELLA_LOCALI = new URL("../locali", import.meta.url).pathname;

export function argomento(nome: string): string | undefined {
  const a = process.argv.slice(2);
  const i = a.indexOf(`--${nome}`);
  if (i >= 0) return a[i + 1];
  const uguale = a.find((x) => x.startsWith(`--${nome}=`));
  return uguale?.slice(nome.length + 3);
}

export function bandiera(nome: string): boolean {
  return process.argv.slice(2).includes(`--${nome}`);
}

/** opzioni senza valore: tutte le altre "--nome" si prendono l'argomento che segue */
const BANDIERE = new Set(["crea", "invia", "fondatore", "annuale"]);

export function posizionale(indice = 0): string | undefined {
  const a = process.argv.slice(2);
  const liberi: string[] = [];
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) liberi.push(a[i]);
    else if (!a[i].includes("=") && !BANDIERE.has(a[i].slice(2))) i++;
  }
  return liberi[indice];
}

/**
 * Con DATABASE_URL legge il database vero; senza, una demo in memoria con i
 * locali di locali/ e dati finti, così gli strumenti si provano a costo zero.
 */
export async function apriArchivio(): Promise<{ archivio: Archivio; chiudi: () => Promise<void>; demo: boolean }> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { prepare: false, max: 2 });
    return { archivio: new ArchivioPostgres(sqlDaPostgresJs(sql as never)), chiudi: () => sql.end(), demo: false };
  }
  const orologio: { adesso: Date | null } = { adesso: null };
  const archivio = new ArchivioMemoria(() => orologio.adesso ?? new Date());
  const messaggero = new MessaggeroMemoria();
  for (const config of caricaLocali(CARTELLA_LOCALI)) {
    await archivio.salvaConfigurazione(config);
    await popolaDemo(archivio, messaggero, config, new Date(), "http://localhost:8787", orologio);
  }
  console.error("(DATABASE_URL non impostata: uso i dati finti della demo)\n");
  return { archivio, chiudi: async () => {}, demo: true };
}
