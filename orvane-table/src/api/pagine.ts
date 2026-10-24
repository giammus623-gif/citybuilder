// Pagine HTML minime servite dall'API: gestione della prenotazione da parte
// del cliente e approvazione delle proposte da parte del titolare.

import type { ConfigurazioneLocale } from "../core/configurazione.ts";
import { dataInParole } from "../core/tempo.ts";
import type { ModificaProposta, Prenotazione } from "../core/tipi.ts";

export function esc(v: unknown): string {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function pagina(titolo: string, corpo: string, colore = "#8a2d1c"): string {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(titolo)}</title>
<style>
:root{--p:${esc(colore)};--s:#fbf7f0;--t:#2a211c;--b:#e6ddd0}
*{box-sizing:border-box}body{margin:0;font:17px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--s);color:var(--t)}
main{max-width:34rem;margin:0 auto;padding:1.5rem 1rem 3rem}
h1{font:600 1.6rem/1.2 Georgia,"Iowan Old Style",serif;margin:.5rem 0 1rem}
.card{background:#fff;border:1px solid var(--b);border-radius:12px;padding:1rem 1.1rem;margin:0 0 1rem}
.dato{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px dashed var(--b);padding:.35rem 0}.dato:last-child{border:0}
button,.bottone{font:inherit;border:0;border-radius:999px;padding:.7rem 1.2rem;background:var(--p);color:#fff;cursor:pointer;text-decoration:none;display:inline-block}
button.secondario{background:#fff;color:var(--t);border:1px solid var(--b)}
.azioni{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.8rem}
small,.nota{color:#6b5f55}
</style>
</head>
<body><main>${corpo}</main></body>
</html>`;
}

export function paginaPrenotazione(config: ConfigurazioneLocale, p: Prenotazione, azione: string, messaggio?: string): string {
  const attiva = p.stato === "confermata" || p.stato === "da_confermare";
  const stato: Record<Prenotazione["stato"], string> = {
    confermata: "Confermata",
    da_confermare: "In attesa di conferma del locale",
    annullata: "Annullata",
    completata: "Completata",
    no_show: "Non presentata",
  };
  return pagina(
    `Prenotazione - ${config.nome}`,
    `<h1>${esc(config.nome)}</h1>
${messaggio ? `<p class="card">${esc(messaggio)}</p>` : ""}
<div class="card">
  <div class="dato"><span>Stato</span><strong>${esc(stato[p.stato])}</strong></div>
  <div class="dato"><span>Quando</span><strong>${esc(dataInParole(p.data))}, ore ${esc(p.ora)}</strong></div>
  <div class="dato"><span>Persone</span><strong>${esc(p.persone)}</strong></div>
  <div class="dato"><span>Nome</span><strong>${esc(p.nome)}</strong></div>
  <div class="dato"><span>Codice</span><strong>${esc(p.codice)}</strong></div>
</div>
${
  attiva
    ? `<form method="post" action="${esc(azione)}" onsubmit="return confirm('Annullare la prenotazione?')">
  <p>Per cambiare giorno, orario o persone chiami il locale al <a href="tel:${esc(config.contatti.telefono)}">${esc(config.contatti.telefono)}</a>${config.pacchetto === "start" ? "" : ": risponde anche l'assistente virtuale"}.</p>
  <div class="azioni"><button type="submit">Annulla la prenotazione</button></div>
</form>`
    : ""
}
<p class="nota">I dati servono solo per gestire la prenotazione. Titolare del trattamento: ${esc(config.privacy.ragioneSociale)} (${esc(config.privacy.email)}).</p>`,
    config.sito.colori.primario,
  );
}

export function paginaApprovazioni(config: ConfigurazioneLocale, proposte: ModificaProposta[], base: string, messaggio?: string): string {
  const elenco = proposte.length
    ? proposte
        .map(
          (m) => `<div class="card">
  <strong>${esc(m.numero)}) ${esc(m.descrizione)}</strong>
  <p class="nota">Perché: ${esc(m.motivo)}${m.richiedeTitolare ? " — cambia una regola del locale" : ""}</p>
  <div class="azioni">
    <form method="post" action="${esc(`${base}/${m.numero}/ok`)}"><button type="submit">Approva</button></form>
    <form method="post" action="${esc(`${base}/${m.numero}/no`)}"><button class="secondario" type="submit">Scarta</button></form>
  </div>
</div>`,
        )
        .join("\n")
    : `<p class="card">Non ci sono proposte da approvare. Grazie!</p>`;
  return pagina(
    `Proposte - ${config.nome}`,
    `<h1>Cosa deve imparare l'assistente</h1>
${messaggio ? `<p class="card">${esc(messaggio)}</p>` : ""}
${elenco}
<p class="nota">Si può rispondere anche su WhatsApp con "ok" o "no" seguito dal numero.</p>`,
    config.sito.colori.primario,
  );
}
