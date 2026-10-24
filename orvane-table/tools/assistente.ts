// Prepara l'assistente vocale di un locale per ElevenLabs Agents.
//   npm run assistente -- demo-trattoria --api https://<progetto>.supabase.co/functions/v1/orvane-api
// Scrive in dist/assistente/<slug>/ istruzioni, primo messaggio e i corpi JSON
// per l'API di ElevenLabs. Con --crea li invia davvero (serve ELEVENLABS_API_KEY):
// prima di farlo controlla i file e la documentazione aggiornata.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { caricaLocale } from "../src/adattatori/node.ts";
import { chiaveStrumenti } from "../src/api/gestore.ts";
import { configurazioneAgente, configurazioniStrumenti } from "../src/assistente/elevenlabs.ts";
import { istruzioniAssistente, primoMessaggio } from "../src/assistente/prompt.ts";
import { argomento, bandiera, CARTELLA_LOCALI, posizionale } from "./comune.ts";

const slug = posizionale() ?? "demo-trattoria";
const config = caricaLocale(CARTELLA_LOCALI, slug);
const urlBase = (argomento("api") ?? "https://INDIRIZZO-API").replace(/\/$/, "");
const segreto = process.env.ORVANE_SEGRETO_STRUMENTI;
const chiave = segreto ? await chiaveStrumenti(segreto, slug) : undefined;
const opzioni = { urlBase, idSegretoChiave: process.env.ELEVENLABS_ID_SEGRETO, chiaveInChiaro: chiave };

const cartella = new URL(`../dist/assistente/${slug}`, import.meta.url).pathname;
mkdirSync(cartella, { recursive: true });
const strumenti = configurazioniStrumenti(config, opzioni);
writeFileSync(join(cartella, "istruzioni.txt"), istruzioniAssistente(config));
writeFileSync(join(cartella, "primo-messaggio.txt"), primoMessaggio(config));
writeFileSync(join(cartella, "strumenti.json"), JSON.stringify(strumenti, null, 2));
writeFileSync(join(cartella, "agente.json"), JSON.stringify(configurazioneAgente(config, opzioni), null, 2));
console.log(`File in ${cartella}`);
console.log(`Webhook di avvio chiamata: ${urlBase}/api/${slug}/avvio-chiamata`);
console.log(`Webhook di fine chiamata:  ${urlBase}/api/${slug}/fine-chiamata`);
if (!segreto) console.log("ORVANE_SEGRETO_STRUMENTI non impostata: la chiave degli strumenti resta da inserire.");
else if (!opzioni.idSegretoChiave) console.log("Consiglio: salva la chiave nel deposito segreti di ElevenLabs e passa ELEVENLABS_ID_SEGRETO.");

if (bandiera("crea")) {
  const api = process.env.ELEVENLABS_API_KEY;
  if (!api) throw new Error("Serve ELEVENLABS_API_KEY");
  const invia = async (percorso: string, corpo: unknown) => {
    const r = await fetch(`https://api.elevenlabs.io${percorso}`, {
      method: "POST",
      headers: { "xi-api-key": api, "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const testo = await r.text();
    if (!r.ok) throw new Error(`${percorso}: ${r.status} ${testo}`);
    return JSON.parse(testo);
  };
  const ids: string[] = [];
  for (const s of strumenti) ids.push((await invia("/v1/convai/tools", s)).id);
  const agente = await invia("/v1/convai/agents/create", configurazioneAgente(config, opzioni, ids));
  console.log(`Agente creato: ${agente.agent_id}. Collega ora il numero di telefono e i webhook dal pannello.`);
}
