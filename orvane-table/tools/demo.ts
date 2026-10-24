// Demo locale a costo zero: siti dei locali fittizi, API, pagina di
// approvazione, rapporto settimanale e un simulatore degli strumenti
// dell'assistente. Tutto in memoria, con dati finti.
//
//   npm run demo            -> http://localhost:8787
//   PORTA=9000 npm run demo

import { ArchivioMemoria } from "../src/adattatori/archivio-memoria.ts";
import { caricaLocali, servi } from "../src/adattatori/node.ts";
import { chiaveStrumenti, collegamentoApprovazione, creaGestore, type Ambiente } from "../src/api/gestore.ts";
import { esc, pagina } from "../src/api/pagine.ts";
import { configurazioneAgente, configurazioniStrumenti } from "../src/assistente/elevenlabs.ts";
import { istruzioniAssistente, primoMessaggio } from "../src/assistente/prompt.ts";
import { DEFINIZIONI } from "../src/assistente/definizioni.ts";
import { eUnoStrumento, eseguiStrumento } from "../src/assistente/strumenti.ts";
import { MessaggeroMemoria } from "../src/core/messaggero.ts";
import { istanteLocale } from "../src/core/tempo.ts";
import { datiSettimana, testoIndicatori, testoRapporto } from "../src/rapporti/rapporto-settimanale.ts";
import { generaSito } from "../src/sito/genera.ts";
import { popolaDemo } from "./dati-demo.ts";

const porta = Number(process.env.PORTA ?? 8787);
const urlBase = `http://localhost:${porta}`;
const locali = caricaLocali(new URL("../locali", import.meta.url).pathname);

const orologio: { adesso: Date | null } = { adesso: null };
const ora = () => orologio.adesso ?? new Date();
const archivio = new ArchivioMemoria(ora);
const messaggero = new MessaggeroMemoria(ora);
const amb: Ambiente = {
  archivio,
  messaggero,
  ora: () => new Date(),
  urlBase,
  segretoStrumenti: "demo-solo-in-locale",
  segretoCollegamenti: "demo-solo-in-locale",
  originiSito: ["*"],
  whatsapp: { tokenVerifica: "demo" },
};
const api = creaGestore(amb);

const siti = new Map<string, Map<string, string>>();
for (const config of locali) {
  await archivio.salvaConfigurazione(config);
  await popolaDemo(archivio, messaggero, config, new Date(), urlBase, orologio);
  siti.set(config.slug, generaSito(config, { apiBase: urlBase, urlSito: `${urlBase}/siti/${config.slug}` }));
}

const TIPI: Record<string, string> = { html: "text/html", css: "text/css", txt: "text/plain", xml: "application/xml" };

async function cruscotto(): Promise<string> {
  const righe = await Promise.all(
    locali.map(async (c) => {
      const approva = await collegamentoApprovazione(amb, c.slug, new Date(Date.now() + 14 * 86_400_000));
      return `<div class="card"><strong>${esc(c.nome)}</strong> <small>(${esc(c.pacchetto)})</small>
<div class="azioni">
  <a class="bottone" href="/siti/${esc(c.slug)}/">Sito</a>
  <a class="bottone" href="/demo/prova/${esc(c.slug)}">Prova gli strumenti</a>
  <a class="bottone" href="/demo/rapporto/${esc(c.slug)}">Rapporto settimanale</a>
  <a class="bottone" href="${esc(approva)}">Approvazioni del titolare</a>
  <a class="bottone" href="/demo/assistente/${esc(c.slug)}">Istruzioni assistente</a>
  <a class="bottone" href="/demo/elevenlabs/${esc(c.slug)}">Configurazione ElevenLabs</a>
</div></div>`;
    }),
  );
  return pagina(
    "Orvane Table - demo",
    `<h1>Orvane Table · demo locale</h1>
<p class="nota">Dati finti, tutto in memoria: si azzera a ogni riavvio. Nessun servizio esterno, nessun costo.</p>
${righe.join("\n")}
<div class="card"><a class="bottone" href="/demo/messaggi">Messaggi WhatsApp inviati (simulati)</a></div>`,
  );
}

async function paginaProva(slug: string, url: URL, req: Request): Promise<Response> {
  const config = locali.find((c) => c.slug === slug);
  if (!config) return new Response("Locale sconosciuto", { status: 404 });
  let esito = "";
  let nome = url.searchParams.get("strumento") ?? "verifica_disponibilita";
  let ingresso = url.searchParams.get("ingresso") ?? '{ "data": "sabato", "ora": "20:30", "persone": 2 }';
  if (req.method === "POST") {
    const f = await req.formData();
    nome = String(f.get("strumento"));
    ingresso = String(f.get("ingresso"));
    if (eUnoStrumento(nome)) {
      let dati: unknown;
      try {
        dati = JSON.parse(ingresso);
      } catch {
        dati = null;
      }
      const r = dati
        ? await eseguiStrumento(nome, { archivio, messaggero, config: (await archivio.configurazione(config.id))!, adesso: new Date(), urlBase, telefonoChiamante: String(f.get("chiamante") || "") || null, idConversazione: "prova", canale: "telefono" }, dati)
        : { ok: false, messaggio: "JSON non valido" };
      esito = `<div class="card"><strong>Risposta</strong><pre style="white-space:pre-wrap">${esc(JSON.stringify(r, null, 2))}</pre></div>`;
    }
  }
  const opzioni = DEFINIZIONI.map((d) => `<option${d.nome === nome ? " selected" : ""}>${d.nome}</option>`).join("");
  const esempi = DEFINIZIONI.map((d) => `<li><code>${d.nome}</code>: ${esc(Object.keys(d.parametri).join(", "))}</li>`).join("");
  return new Response(
    pagina(
      `Prova - ${config.nome}`,
      `<p><a href="/">← cruscotto</a></p><h1>Prova gli strumenti · ${esc(config.nome)}</h1>
<p class="nota">Le stesse funzioni che chiama l'assistente vocale, senza consumare minuti.</p>
<form method="post" class="card">
<p><label>Strumento<br><select name="strumento">${opzioni}</select></label></p>
<p><label>Numero di chi chiama<br><input name="chiamante" value="+393471234567" style="width:100%"></label></p>
<p><label>Parametri (JSON)<br><textarea name="ingresso" rows="5" style="width:100%;font-family:monospace">${esc(ingresso)}</textarea></label></p>
<button type="submit">Esegui</button></form>
${esito}
<div class="card"><strong>Parametri</strong><ul>${esempi}</ul></div>`,
    ),
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

const html = (t: string) => new Response(t, { headers: { "content-type": "text/html; charset=utf-8" } });

servi(porta, async (req) => {
  const url = new URL(req.url);
  const p = url.pathname;
  if (p === "/") return html(await cruscotto());

  let m = /^\/siti\/([a-z0-9-]+)\/(.*)$/.exec(p);
  if (m) {
    const file = siti.get(m[1])?.get(m[2] || "index.html");
    if (!file) return new Response("Non trovato", { status: 404 });
    const est = (m[2] || "index.html").split(".").pop() ?? "html";
    return new Response(file, { headers: { "content-type": `${TIPI[est] ?? "text/plain"}; charset=utf-8` } });
  }
  if (/^\/siti\/[a-z0-9-]+$/.test(p)) return Response.redirect(`${urlBase}${p}/`, 302);

  if (p === "/demo/messaggi") {
    const elenco = [...messaggero.inviati].reverse().map((x) => `<div class="card"><small>${esc(x.inviatoIl)} · a ${esc(x.a)} · ${esc(x.tipo)}</small><p style="white-space:pre-wrap">${esc(x.testo)}</p></div>`);
    return html(pagina("Messaggi", `<p><a href="/">← cruscotto</a></p><h1>Messaggi inviati</h1>${elenco.join("") || "<p>Nessun messaggio.</p>"}`));
  }
  if ((m = /^\/demo\/prova\/([a-z0-9-]+)$/.exec(p))) return paginaProva(m[1], url, req);
  if ((m = /^\/demo\/rapporto\/([a-z0-9-]+)$/.exec(p))) {
    const config = await archivio.configurazionePerSlug(m[1]);
    if (!config) return new Response("Locale sconosciuto", { status: 404 });
    const oggi = istanteLocale(new Date(), config.fusoOrario).data;
    const settimanaScorsa = new Date(Date.parse(`${oggi}T12:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10);
    const d = await datiSettimana(archivio, config, settimanaScorsa);
    return html(
      pagina(
        "Rapporto",
        `<p><a href="/">← cruscotto</a></p><h1>Rapporto della settimana scorsa</h1>
<div class="card"><strong>WhatsApp al titolare</strong><p style="white-space:pre-wrap">${esc(testoRapporto(config, d))}</p></div>
<div class="card"><strong>Indicatori per il fondatore</strong><p style="white-space:pre-wrap">${esc(testoIndicatori(d))}</p></div>`,
      ),
    );
  }
  if ((m = /^\/demo\/assistente\/([a-z0-9-]+)$/.exec(p))) {
    const config = await archivio.configurazionePerSlug(m[1]);
    if (!config) return new Response("Locale sconosciuto", { status: 404 });
    return html(
      pagina(
        "Istruzioni",
        `<p><a href="/">← cruscotto</a></p><h1>Istruzioni dell'assistente</h1>
<div class="card"><strong>Primo messaggio</strong><p>${esc(primoMessaggio(config, "Buonasera"))}</p></div>
<div class="card"><pre style="white-space:pre-wrap;font-size:.85rem">${esc(istruzioniAssistente(config))}</pre></div>`,
      ),
    );
  }
  if ((m = /^\/demo\/elevenlabs\/([a-z0-9-]+)$/.exec(p))) {
    const config = await archivio.configurazionePerSlug(m[1]);
    if (!config) return new Response("Locale sconosciuto", { status: 404 });
    const chiave = await chiaveStrumenti(amb.segretoStrumenti, config.slug);
    const dati = {
      nota: "Per una prova vera serve un indirizzo pubblico (Supabase o un tunnel): vedi docs/DEPLOY.md",
      strumenti: configurazioniStrumenti(config, { urlBase, chiaveInChiaro: chiave }),
      agente: configurazioneAgente(config, { urlBase }),
    };
    return new Response(JSON.stringify(dati, null, 2), { headers: { "content-type": "application/json; charset=utf-8" } });
  }
  return api(req);
});

console.log(`Demo Orvane Table su ${urlBase}`);
for (const c of locali) console.log(`  ${c.nome}: ${urlBase}/siti/${c.slug}/`);
