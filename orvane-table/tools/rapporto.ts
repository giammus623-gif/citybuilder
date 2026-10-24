// Rapporto settimanale per il titolare (prompt 17.6) e indicatori per il fondatore.
//   npm run rapporto -- demo-trattoria [--settimana 2026-11-02] [--invia]

import { creaMessaggero } from "../src/ambiente.ts";
import { collegamentoApprovazione } from "../src/api/gestore.ts";
import { aggiungiGiorni, istanteLocale } from "../src/core/tempo.ts";
import { datiSettimana, testoIndicatori, testoRapporto } from "../src/rapporti/rapporto-settimanale.ts";
import { apriArchivio, argomento, bandiera, posizionale } from "./comune.ts";

const slug = posizionale() ?? "demo-trattoria";
const { archivio, chiudi, demo } = await apriArchivio();
const config = await archivio.configurazionePerSlug(slug);
if (!config) throw new Error(`Locale ${slug} non trovato`);
const oggi = istanteLocale(new Date(), config.fusoOrario).data;
const dati = await datiSettimana(archivio, config, argomento("settimana") ?? aggiungiGiorni(oggi, -7));
const testo = testoRapporto(config, dati);
console.log(`--- WhatsApp a ${config.titolare.nome} (${config.titolare.telefono}) ---\n${testo}\n`);
console.log(`--- Indicatori per il fondatore ---\n${testoIndicatori(dati)}\n`);
if (process.env.ORVANE_SEGRETO_COLLEGAMENTI && process.env.ORVANE_URL_BASE) {
  const link = await collegamentoApprovazione(
    { urlBase: process.env.ORVANE_URL_BASE.replace(/\/$/, ""), segretoCollegamenti: process.env.ORVANE_SEGRETO_COLLEGAMENTI },
    slug,
    new Date(Date.now() + 14 * 86_400_000),
  );
  console.log(`Pagina di approvazione (14 giorni): ${link}`);
}
if (bandiera("invia")) {
  if (demo) throw new Error("--invia funziona solo con DATABASE_URL e le variabili di produzione");
  const r = await creaMessaggero((n) => process.env[n]).invia({ a: config.titolare.telefono, tipo: "rapporto_settimanale", testo, parametri: [testo] });
  console.log(r.ok ? "Rapporto inviato." : `Invio non riuscito: ${r.errore}`);
}
await chiudi();
