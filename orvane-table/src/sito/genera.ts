// Generatore del sito del locale (prompt 17.2): pagine statiche, veloci da
// telefono, con tutti i contenuti presi dalla configurazione. Un nuovo locale
// si pubblica cambiando solo il suo file in locali/.

import { esc } from "../api/pagine.ts";
import { ALLERGENI, type Allergene, type ConfigurazioneLocale } from "../core/configurazione.ts";
import { GIORNI } from "../core/tempo.ts";
import { scriptPrenotazione } from "./prenota.ts";
import { foglioDiStile } from "./stile.ts";

const NOMI_GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const SCHEMA_GIORNI = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const NUMERO_ALLERGENE = Object.fromEntries(Object.keys(ALLERGENI).map((a, i) => [a, i + 1])) as Record<Allergene, number>;

interface Pagina {
  file: string;
  titolo: string;
  voceMenu: string;
  descrizione: string;
  corpo: string;
}

export interface OpzioniSito {
  /** indirizzo pubblico del sito, per canonical, sitemap e dati strutturati */
  urlSito?: string;
  /** indirizzo dell'API per il modulo; se manca il modulo rimanda al telefono */
  apiBase?: string;
}

/** Il pacchetto Start non comprende l'assistente: il sito non deve dire il contrario. */
export function haAssistente(config: ConfigurazioneLocale): boolean {
  return config.pacchetto !== "start";
}

function prezzo(euro: number): string {
  return `${euro.toFixed(2).replace(".", ",")} €`;
}

const telefonoLeggibile = (t: string) => t.replace(/^\+39/, "").replace(/(\d{2,3})(?=(\d{3,4})+$)/g, "$1 ").trim();

function indirizzo(config: ConfigurazioneLocale): string {
  const i = config.contatti.indirizzo;
  return `${i.via}, ${i.cap} ${i.citta} (${i.provincia})`;
}

function tabellaOrari(config: ConfigurazioneLocale): string {
  const righe = GIORNI.map((g, i) => {
    const fasce = config.orari[g];
    const testo = fasce.length ? fasce.map((f) => `<span class="fascia">${f.dalle}–${f.alle}</span>`).join(" ") : `<span class="chiuso">chiuso</span>`;
    return `<tr data-giorno="${i}"><th scope="row">${NOMI_GIORNI[i]}</th><td>${testo}</td></tr>`;
  }).join("");
  return `<table class="orari"><caption class="salta">Orari di apertura</caption><tbody>${righe}</tbody></table>`;
}

function datiStrutturati(config: ConfigurazioneLocale, opzioni: OpzioniSito): string {
  const i = config.contatti.indirizzo;
  const base = opzioni.urlSito?.replace(/\/$/, "");
  const orari = GIORNI.flatMap((g, n) =>
    config.orari[g].map((f) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: SCHEMA_GIORNI[n], opens: f.dalle, closes: f.alle })),
  );
  const dati = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: config.nome,
    description: config.sito.descrizione || undefined,
    telephone: config.contatti.telefono,
    email: config.contatti.email,
    address: { "@type": "PostalAddress", streetAddress: i.via, postalCode: i.cap, addressLocality: i.citta, addressRegion: i.provincia, addressCountry: "IT" },
    geo: config.contatti.coordinate ? { "@type": "GeoCoordinates", latitude: config.contatti.coordinate.lat, longitude: config.contatti.coordinate.lon } : undefined,
    servesCuisine: config.sito.cucina.length ? config.sito.cucina : undefined,
    priceRange: config.sito.fasciaPrezzo,
    acceptsReservations: base ? `${base}/prenota.html` : "True",
    hasMenu: base ? `${base}/menu.html` : undefined,
    url: base,
    openingHoursSpecification: orari,
    sameAs: [config.sito.social.instagram, config.sito.social.facebook].filter(Boolean),
  };
  // "<" non deve mai comparire dentro lo script
  return JSON.stringify(dati).replaceAll("<", "\\u003c");
}

function cornice(config: ConfigurazioneLocale, opzioni: OpzioniSito, p: Pagina, pagine: Pagina[]): string {
  const base = opzioni.urlSito?.replace(/\/$/, "");
  const tel = config.contatti.telefono;
  const nav = pagine
    .filter((x) => x.voceMenu)
    .map((x) => `<a href="${x.file === "index.html" ? "./" : x.file}"${x.file === p.file ? ' aria-current="page"' : ""}>${esc(x.voceMenu)}</a>`)
    .join("");
  const titolo = p.file === "index.html" ? `${config.nome} · ${config.contatti.indirizzo.citta}` : `${p.titolo} · ${config.nome}`;
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(p.descrizione)}">
<meta name="theme-color" content="${esc(config.sito.colori.primario)}">
${base ? `<link rel="canonical" href="${esc(`${base}/${p.file === "index.html" ? "" : p.file}`)}">` : ""}
<meta property="og:type" content="restaurant">
<meta property="og:title" content="${esc(titolo)}">
<meta property="og:description" content="${esc(p.descrizione)}">
<meta property="og:locale" content="it_IT">
${config.demo ? '<meta name="robots" content="noindex">' : ""}
<link rel="stylesheet" href="stile.css">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${config.sito.colori.primario}"/><text x="16" y="22" font-family="Georgia,serif" font-size="17" text-anchor="middle" fill="#fff">${config.nome.replace(/^(Trattoria|Pizzeria|Ristorante|Osteria|Agriturismo|Bistrot)\s+/i, "").charAt(0).toUpperCase()}</text></svg>`)}">
${p.file === "index.html" ? `<script type="application/ld+json">${datiStrutturati(config, opzioni)}</script>` : ""}
</head>
<body>
<a class="salta" href="#contenuto">Vai al contenuto</a>
<header class="testata"><div class="contenitore">
  <a class="marchio" href="./">${esc(config.nome)}</a>
  <nav class="nav" aria-label="Pagine">${nav}</nav>
  <a class="telefono-testata" href="tel:${esc(tel)}">${esc(telefonoLeggibile(tel))}</a>
</div></header>
<main id="contenuto">
${p.corpo}
</main>
<footer class="piede"><div class="contenitore griglia">
  <div><strong>${esc(config.nome)}</strong><br>${esc(indirizzo(config))}<br><a href="tel:${esc(tel)}">${esc(telefonoLeggibile(tel))}</a>${config.contatti.email ? ` · <a href="mailto:${esc(config.contatti.email)}">${esc(config.contatti.email)}</a>` : ""}</div>
  <div><strong>Orari</strong>${tabellaOrari(config)}</div>
  <div><a href="privacy.html">Informativa privacy</a><br>${esc(config.privacy.ragioneSociale)}${config.privacy.partitaIva ? `<br>P. IVA ${esc(config.privacy.partitaIva)}` : ""}<br><small>Sito senza cookie di profilazione.</small></div>
</div></footer>
<nav class="barra" aria-label="Azioni rapide">
  <a class="bottone secondario" href="tel:${esc(tel)}">Chiama</a>
  <a class="bottone" href="prenota.html">Prenota</a>
</nav>
<script>
// evidenzia il giorno di oggi negli orari (0 = lunedì)
(function(){var g=(new Date().getDay()+6)%7;document.querySelectorAll('.orari tr[data-giorno="'+g+'"]').forEach(function(r){r.className="oggi"});})();
</script>
</body>
</html>
`;
}

function sezioneMappa(config: ConfigurazioneLocale): string {
  const q = encodeURIComponent(`${config.nome}, ${indirizzo(config)}`);
  const c = config.contatti.coordinate;
  const embed = c
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${c.lon - 0.006}%2C${c.lat - 0.004}%2C${c.lon + 0.006}%2C${c.lat + 0.004}&layer=mapnik&marker=${c.lat}%2C${c.lon}`
    : "";
  return `<div class="mappa" id="mappa">
  <div><p><strong>${esc(indirizzo(config))}</strong></p>
  <p class="azioni" style="justify-content:center">
    ${embed ? `<button class="bottone secondario" type="button" data-mappa="${esc(embed)}">Mostra la mappa</button>` : ""}
    <a class="bottone" href="https://www.google.com/maps/search/?api=1&query=${q}" rel="noopener">Apri in Maps</a>
  </p>
  <p class="tenue"><small>La mappa si carica solo se la apri: nessun dato inviato prima.</small></p></div>
</div>
<script>
document.querySelectorAll("[data-mappa]").forEach(function(b){b.addEventListener("click",function(){var f=document.createElement("iframe");f.src=b.getAttribute("data-mappa");f.title="Mappa";f.loading="lazy";var m=document.getElementById("mappa");m.innerHTML="";m.appendChild(f);});});
</script>`;
}

function paginaHome(config: ConfigurazioneLocale): string {
  const piatti = config.menu.flatMap((c) => c.voci.slice(0, 1).map((v) => ({ ...v, categoria: c.categoria }))).slice(0, 3);
  const info = config.domandeFrequenti.filter((f) => f.verificata && ["parcheggio", "animali", "accessibilita"].includes(f.tema)).slice(0, 3);
  const titoliInfo: Record<string, string> = { parcheggio: "Parcheggio", animali: "Animali", accessibilita: "Accessibilità" };
  return `<section class="apertura"><div class="contenitore">
  <p class="occhiello">${esc(config.tipo)} · ${esc(config.contatti.indirizzo.citta)}</p>
  <h1>${esc(config.nome)}</h1>
  ${config.sito.slogan ? `<p class="sottotitolo">${esc(config.sito.slogan)}</p>` : ""}
  <div class="azioni">
    <a class="bottone" href="prenota.html">Prenota un tavolo</a>
    <a class="bottone secondario" href="menu.html">Guarda il menu</a>
  </div>
</div></section>
<section><div class="contenitore griglia due-col">
  <div>
    <span class="ornamento"></span>
    <h2>Benvenuti</h2>
    <p>${esc(config.sito.descrizione)}</p>
    ${
      piatti.length
        ? `<h3 style="margin-top:1.6rem">Dal menu</h3>${piatti
            .map((v) => `<div class="voce"><span class="voce-nome">${esc(v.nome)}</span><span class="voce-prezzo">${prezzo(v.prezzo)}</span><span class="voce-dettagli">${esc(v.categoria)}</span></div>`)
            .join("")}<p><a href="menu.html">Tutto il menu →</a></p>`
        : ""
    }
  </div>
  <div class="carta">
    <h3>Orari</h3>
    ${tabellaOrari(config)}
    ${haAssistente(config) ? `<p class="tenue" style="margin-bottom:0"><small>Quando siamo in servizio o chiusi risponde al telefono il nostro assistente virtuale: prende la prenotazione e ci avvisa.</small></p>` : ""}
  </div>
</div></section>
${
  info.length
    ? `<section><div class="contenitore"><div class="griglia tre">${info
        .map((f) => `<div class="carta"><h3>${esc(titoliInfo[f.tema])}</h3><p class="tenue" style="margin:0">${esc(f.risposta)}</p></div>`)
        .join("")}</div></div></section>`
    : ""
}
<section><div class="contenitore">${sezioneMappa(config)}</div></section>`;
}

function paginaMenu(config: ConfigurazioneLocale): string {
  const usati = new Set(config.menu.flatMap((c) => c.voci.flatMap((v) => v.allergeni)));
  return `<section><div class="contenitore">
  <span class="ornamento"></span>
  <h1>Menu</h1>
  <p class="sottotitolo">Prezzi in euro. Il menu può cambiare con la stagione: chiedete in sala i piatti del giorno.</p>
  ${config.menu
    .map(
      (c) => `<div class="categoria"><h2>${esc(c.categoria)}</h2>${c.voci
        .map((v) => {
          const etichette = [v.vegano ? "vegano" : v.vegetariano ? "vegetariano" : "", v.senzaGlutine ? "senza glutine" : ""].filter(Boolean);
          const allergeni = v.allergeni.length ? `<span class="allergeni">Allergeni: ${v.allergeni.map((a) => `<abbr title="${esc(ALLERGENI[a])}">${NUMERO_ALLERGENE[a]}</abbr>`).join(", ")}</span>` : "";
          const dettagli = [v.descrizione ? esc(v.descrizione) : "", etichette.map((e) => `<span class="etichetta">${e}</span>`).join(""), allergeni].filter(Boolean).join(" ");
          return `<div class="voce"><span class="voce-nome">${esc(v.nome)}</span><span class="voce-prezzo">${prezzo(v.prezzo)}</span>${dettagli ? `<span class="voce-dettagli">${dettagli}</span>` : ""}</div>`;
        })
        .join("")}</div>`,
    )
    .join("")}
  <div class="carta">
    <h3>Allergeni (Reg. UE 1169/2011)</h3>
    <p>I numeri accanto ai piatti indicano gli allergeni presenti secondo le informazioni del locale. Per allergie e intolleranze chiedete sempre al personale prima di ordinare: in cucina si lavorano anche altri ingredienti.</p>
    <ol class="legenda">${Object.entries(ALLERGENI)
      .map(([k, v]) => `<li${usati.has(k as Allergene) ? "" : ' class="tenue"'}>${esc(v)}</li>`)
      .join("")}</ol>
  </div>
</div></section>`;
}

function paginaLocale(config: ConfigurazioneLocale): string {
  const faq = config.domandeFrequenti.filter((f) => f.verificata);
  return `<section><div class="contenitore">
  <span class="ornamento"></span>
  <h1>Il locale</h1>
  <p class="sottotitolo">${esc(config.sito.descrizione)}</p>
  ${config.sito.foto.length ? `<div class="griglia tre">${config.sito.foto.map((f) => `<img src="${esc(f.src)}" alt="${esc(f.alt)}" loading="lazy" width="640" height="480">`).join("")}</div>` : ""}
</div></section>
${
  faq.length
    ? `<section><div class="contenitore"><h2>Domande frequenti</h2>${faq
        .map((f) => `<details><summary>${esc(f.domanda)}</summary><p>${esc(f.risposta)}</p></details>`)
        .join("")}</div></section>`
    : ""
}`;
}

function paginaPrenota(config: ConfigurazioneLocale, opzioni: OpzioniSito): string {
  const r = config.prenotazioni;
  const tel = config.contatti.telefono;
  if (!opzioni.apiBase) {
    return `<section><div class="contenitore"><span class="ornamento"></span><h1>Prenota</h1>
<p class="sottotitolo">${haAssistente(config) ? "Chiamateci: se siamo in servizio risponde l'assistente virtuale e la prenotazione arriva subito." : "Chiamateci o scriveteci: vi confermiamo il tavolo."}</p>
<div class="azioni"><a class="bottone" href="tel:${esc(tel)}">Chiama ${esc(telefonoLeggibile(tel))}</a>${config.contatti.whatsapp ? `<a class="bottone secondario" href="https://wa.me/${esc(config.contatti.whatsapp.replace("+", ""))}">Scrivi su WhatsApp</a>` : ""}</div></div></section>`;
  }
  return `<section><div class="contenitore griglia due-col">
  <div>
    <span class="ornamento"></span>
    <h1>Prenota un tavolo</h1>
    <p class="sottotitolo">Scegli giorno e persone: vedi subito gli orari liberi.</p>
    <form id="prenota" novalidate data-api="${esc(`${opzioni.apiBase.replace(/\/$/, "")}/api/${config.slug}`)}" data-max="${r.giorniMassimiAnticipo}" data-gruppo="${r.maxPersoneSenzaTitolare}">
      <div class="due">
        <div class="campo"><label for="data">Giorno</label><input id="data" name="data" type="date" required></div>
        <div class="campo"><label for="persone">Persone</label><input id="persone" name="persone" type="number" min="1" max="${r.maxPersone}" value="2" required inputmode="numeric"></div>
      </div>
      <div class="campo"><label for="ora">Orario</label><select id="ora" name="ora" required><option value="">Scegli prima il giorno</option></select></div>
      <div class="campo"><label for="nome">Nome e cognome</label><input id="nome" name="nome" autocomplete="name" required></div>
      <div class="campo"><label for="telefono">Telefono</label><input id="telefono" name="telefono" type="tel" autocomplete="tel" required inputmode="tel"></div>
      <div class="campo"><label for="note">Note (seggiolone, tavolo fuori…)</label><textarea id="note" name="note" maxlength="300"></textarea></div>
      <div class="campo"><label for="note_salute">Allergie o intolleranze (facoltativo)</label><textarea id="note_salute" name="note_salute" maxlength="300"></textarea>
        <label class="spunta"><input type="checkbox" id="consenso_note_salute" name="consenso_note_salute"> Acconsento a che il locale usi questa informazione solo per questa prenotazione; viene cancellata dopo la data.</label></div>
      <div class="trappola" aria-hidden="true"><label for="sito_web">Non compilare</label><input id="sito_web" name="sito_web" tabindex="-1" autocomplete="off"></div>
      <div class="campo"><label class="spunta"><input type="checkbox" id="privacy" name="privacy" required> Ho letto l'<a href="privacy.html">informativa privacy</a>.</label></div>
      <button class="bottone" type="submit">Prenota</button>
      <p class="esito" id="esito" role="status" aria-live="polite"></p>
    </form>
  </div>
  <div class="carta">
    <h3>Da sapere</h3>
    <p>Per gruppi di più di ${r.maxPersoneSenzaTitolare} persone la richiesta arriva al titolare, che vi richiama per confermare.</p>
    <p>Riceverete un messaggio con il codice e il collegamento per annullare.</p>
    <p style="margin-bottom:0">Preferite parlare? <a href="tel:${esc(tel)}">${esc(telefonoLeggibile(tel))}</a></p>
  </div>
</div></section>
<script>${scriptPrenotazione()}</script>`;
}

function paginaContatti(config: ConfigurazioneLocale): string {
  const tel = config.contatti.telefono;
  return `<section><div class="contenitore griglia due-col">
  <div>
    <span class="ornamento"></span>
    <h1>Contatti</h1>
    <p><strong>Indirizzo</strong><br>${esc(indirizzo(config))}</p>
    <p><strong>Telefono</strong><br><a href="tel:${esc(tel)}">${esc(telefonoLeggibile(tel))}</a></p>
    ${config.contatti.whatsapp ? `<p><strong>WhatsApp</strong><br><a href="https://wa.me/${esc(config.contatti.whatsapp.replace("+", ""))}">Scrivici</a></p>` : ""}
    ${config.contatti.email ? `<p><strong>Email</strong><br><a href="mailto:${esc(config.contatti.email)}">${esc(config.contatti.email)}</a></p>` : ""}
  </div>
  <div class="carta"><h3>Orari</h3>${tabellaOrari(config)}</div>
</div></section>
<section><div class="contenitore">${sezioneMappa(config)}</div></section>`;
}

/** Informativa di base: il testo definitivo va rivisto con un consulente privacy (Parte 12.4). */
function paginaPrivacy(config: ConfigurazioneLocale): string {
  const p = config.privacy;
  const giorni = config.assistente.conservazioneTrascrizioniGiorni;
  return `<!-- Modello di informativa: da verificare con un consulente privacy prima della pubblicazione per un cliente reale. -->
<section><div class="contenitore" style="max-width:46rem">
  <span class="ornamento"></span>
  <h1>Informativa privacy</h1>
  <p class="sottotitolo">Come usiamo i dati di chi prenota, ai sensi degli articoli 13 e 14 del Regolamento UE 2016/679 (GDPR).</p>
  <h2>Titolare del trattamento</h2>
  <p>${esc(p.ragioneSociale)}${p.partitaIva ? `, P. IVA ${esc(p.partitaIva)}` : ""}, ${esc(indirizzo(config))}. Contatto: <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>.</p>
  <h2>Quali dati e perché</h2>
  <p>Nome, numero di telefono, giorno, orario e numero di persone, ed eventuali note: servono a gestire la prenotazione e a mandare la conferma. La base giuridica è l'esecuzione della richiesta dell'interessato (art. 6.1.b GDPR).</p>
  <p>Allergie e intolleranze sono dati relativi alla salute: le trattiamo solo con il consenso esplicito (art. 9.2.a GDPR), solo per quella prenotazione, e le cancelliamo dopo la data.</p>
  ${
    haAssistente(config)
      ? `<h2>Assistente virtuale al telefono</h2>
  <p>Quando il locale è occupato o chiuso, le chiamate possono ricevere risposta da un assistente virtuale, cioè un sistema automatico basato sull'intelligenza artificiale, che lo dichiara all'inizio di ogni conversazione. Non registriamo l'audio: conserviamo la trascrizione della chiamata per ${giorni} giorni, per controllare che le risposte siano corrette e migliorare il servizio; poi viene cancellata.</p>`
      : ""
  }
  <h2>Chi tratta i dati per nostro conto</h2>
  <p>Il fornitore del servizio di prenotazione e dell'assistente agisce come responsabile del trattamento (art. 28 GDPR) e si appoggia a fornitori di database, voce e messaggistica. L'elenco aggiornato dei fornitori e dei Paesi in cui trattano i dati è disponibile su richiesta all'indirizzo indicato sopra.</p>
  <h2>Per quanto tempo</h2>
  <p>I dati della prenotazione sono conservati per il tempo necessario a gestirla e per gli obblighi di legge;${haAssistente(config) ? ` le trascrizioni per ${giorni} giorni;` : ""} le note sanitarie fino al giorno dopo la prenotazione.</p>
  <h2>I vostri diritti</h2>
  <p>Potete chiedere accesso, rettifica, cancellazione, limitazione e opposizione, e la portabilità dei dati, scrivendo a <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>: rispondiamo entro 30 giorni. Potete proporre reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>
  <h2>Cookie</h2>
  <p>Questo sito non usa cookie di profilazione né strumenti di statistica di terze parti. La mappa di OpenStreetMap si carica solo se la aprite.</p>
</div></section>`;
}

export function generaSito(config: ConfigurazioneLocale, opzioni: OpzioniSito = {}): Map<string, string> {
  const citta = config.contatti.indirizzo.citta;
  const pagine: Pagina[] = [
    { file: "index.html", titolo: config.nome, voceMenu: "Home", descrizione: `${config.nome}, ${config.tipo} a ${citta}. ${config.sito.slogan}`.trim(), corpo: paginaHome(config) },
    { file: "menu.html", titolo: "Menu", voceMenu: "Menu", descrizione: `Il menu di ${config.nome} a ${citta}, con prezzi e allergeni.`, corpo: paginaMenu(config) },
    { file: "locale.html", titolo: "Il locale", voceMenu: "Il locale", descrizione: `${config.nome}: il locale, i servizi e le domande frequenti.`, corpo: paginaLocale(config) },
    { file: "prenota.html", titolo: "Prenota", voceMenu: "Prenota", descrizione: `Prenota un tavolo da ${config.nome} a ${citta}.`, corpo: paginaPrenota(config, opzioni) },
    { file: "contatti.html", titolo: "Contatti", voceMenu: "Contatti", descrizione: `Indirizzo, telefono e orari di ${config.nome}.`, corpo: paginaContatti(config) },
    { file: "privacy.html", titolo: "Informativa privacy", voceMenu: "", descrizione: `Informativa privacy di ${config.nome}.`, corpo: paginaPrivacy(config) },
  ];
  const file = new Map<string, string>();
  for (const p of pagine) file.set(p.file, cornice(config, opzioni, p, pagine));
  file.set("stile.css", foglioDiStile(config));
  file.set("robots.txt", config.demo ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\n${opzioni.urlSito ? `Sitemap: ${opzioni.urlSito.replace(/\/$/, "")}/sitemap.xml\n` : ""}`);
  if (opzioni.urlSito) {
    const base = opzioni.urlSito.replace(/\/$/, "");
    file.set(
      "sitemap.xml",
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pagine
        .map((p) => `  <url><loc>${esc(`${base}/${p.file === "index.html" ? "" : p.file}`)}</loc></url>`)
        .join("\n")}\n</urlset>\n`,
    );
  }
  return file;
}
