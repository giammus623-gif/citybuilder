// Foglio di stile del sito: un solo file piccolo, nessun carattere scaricato
// da terzi (i Google Fonts remoti trasferiscono l'IP del visitatore: meglio
// evitarli), colori dalla configurazione del locale.

import type { ConfigurazioneLocale } from "../core/configurazione.ts";

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const pieno = h.length === 3 ? [...h].map((x) => x + x).join("") : h.padEnd(6, "0").slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(pieno.slice(i, i + 2), 16) || 0) as [number, number, number];
}

/** Mescola due colori: peso è la quota del primo. Calcolato qui per funzionare anche su telefoni vecchi. */
export function mescola(a: string, b: string, peso: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v * peso + y[i] * (1 - peso)).toString(16).padStart(2, "0")).join("")}`;
}

function trasparente(hex: string, alfa: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${alfa})`;
}

export function foglioDiStile(config: ConfigurazioneLocale): string {
  const c = config.sito.colori;
  return `:root{
  --primario:${c.primario};--sfondo:${c.sfondo};--testo:${c.testo};
  --tenue:${mescola(c.testo, c.sfondo, 0.68)};
  --linea:${mescola(c.testo, c.sfondo, 0.14)};
  --carta:${mescola("#ffffff", c.sfondo, 0.7)};
  --morbido:${mescola(c.primario, c.sfondo, 0.09)};
  --velo:${trasparente(c.sfondo, 0.93)};
  --alone:${trasparente(c.primario, 0.14)};
  --fuoco:${mescola(c.primario, "#ffffff", 0.55)};
  --serif:"Iowan Old Style","Palatino Linotype","Book Antiqua",Palatino,Georgia,serif;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--sfondo);color:var(--testo);font:17px/1.6 var(--sans);padding-bottom:4.5rem}
img{max-width:100%;height:auto;display:block;border-radius:10px}
a{color:var(--primario)}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--fuoco);outline-offset:2px}
.contenitore{max-width:64rem;margin:0 auto;padding:0 1rem}
.salta{position:absolute;left:-999px}.salta:focus{left:1rem;top:1rem;background:#fff;padding:.5rem;z-index:10}

/* intestazione */
.testata{position:sticky;top:0;z-index:5;background:var(--velo);backdrop-filter:blur(8px);border-bottom:1px solid var(--linea)}
.testata .contenitore{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.2rem 1rem;min-height:3.6rem;padding-top:.5rem;padding-bottom:.4rem}
.marchio{font:600 1.25rem/1.1 var(--serif);text-decoration:none;color:var(--testo);letter-spacing:.01em}
.nav{display:flex;gap:.2rem;overflow-x:auto;scrollbar-width:none;order:3;width:100%;margin:0 -.7rem}
.nav a{padding:.45rem .55rem;border-radius:999px;text-decoration:none;color:var(--testo);white-space:nowrap;font-size:.93rem}
.nav a[aria-current="page"]{background:var(--morbido);color:var(--primario);font-weight:600}
.telefono-testata{display:none;font-weight:600;text-decoration:none;white-space:nowrap}

/* apertura */
.apertura{padding:3.2rem 0 2.4rem;border-bottom:1px solid var(--linea);background:
  radial-gradient(60rem 18rem at 85% -10%,var(--alone),transparent 70%)}
.occhiello{font:600 .78rem/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--primario);margin:0 0 1rem}
h1,h2,h3{font-family:var(--serif);font-weight:600;line-height:1.15;margin:0 0 .6rem}
h1{font-size:clamp(2.2rem,7vw,3.6rem);letter-spacing:-.01em;max-width:18ch}
h2{font-size:clamp(1.5rem,4vw,2rem);margin-top:.2rem}
h3{font-size:1.15rem}
.sottotitolo{font:400 1.15rem/1.5 var(--serif);color:var(--tenue);max-width:40ch;margin:0 0 1.6rem}
.azioni{display:flex;flex-wrap:wrap;gap:.7rem}
.bottone{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:3rem;padding:.7rem 1.4rem;border-radius:999px;border:1.5px solid var(--primario);
  background:var(--primario);color:#fff;font:600 1rem/1 var(--sans);text-decoration:none;cursor:pointer}
.bottone.secondario{background:transparent;color:var(--primario)}
.bottone[disabled]{opacity:.55;cursor:wait}

/* sezioni */
section{padding:2.6rem 0}
section+section{border-top:1px solid var(--linea)}
.griglia{display:grid;gap:1.2rem}
.carta{background:var(--carta);border:1px solid var(--linea);border-radius:14px;padding:1.2rem 1.3rem}
.ornamento{display:block;width:2.4rem;height:2px;background:var(--primario);margin:0 0 1rem;border-radius:2px}
.tenue{color:var(--tenue)}

/* orari */
.orari{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
.orari th{text-align:left;font-weight:500;padding:.35rem 0;width:40%}
.orari td{padding:.35rem 0;text-align:right}
.orari .fascia{white-space:nowrap;display:inline-block;margin-left:.6rem}
.orari tr{border-bottom:1px dashed var(--linea)}
.orari tr.oggi{color:var(--primario);font-weight:600}
.orari .chiuso{color:var(--tenue)}

/* menu */
.categoria{margin:0 0 2.2rem}
.categoria h2{display:flex;align-items:baseline;gap:.8rem}
.categoria h2::after{content:"";flex:1;border-bottom:1px solid var(--linea)}
.voce{display:grid;grid-template-columns:1fr auto;gap:.1rem 1rem;padding:.75rem 0;border-bottom:1px dashed var(--linea)}
.voce:last-child{border-bottom:0}
.voce-nome{font:600 1.08rem/1.35 var(--serif)}
.voce-prezzo{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
.voce-dettagli{grid-column:1/-1;font-size:.92rem;color:var(--tenue)}
.etichetta{display:inline-block;font-size:.72rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:.1rem .45rem;border-radius:999px;background:var(--morbido);color:var(--primario);margin-right:.3rem;vertical-align:1px}
.allergeni{font-size:.82rem}
.legenda{columns:2;column-gap:2rem;font-size:.9rem;padding-left:1.2rem}

/* domande frequenti */
details{border-bottom:1px solid var(--linea);padding:.8rem 0}
summary{cursor:pointer;font-weight:600;list-style:none}
summary::-webkit-details-marker{display:none}
summary::before{content:"+";display:inline-block;width:1.2rem;color:var(--primario);font-weight:700}
details[open] summary::before{content:"–"}
details p{margin:.5rem 0 0 1.2rem}

/* modulo */
form .campo{display:grid;gap:.35rem;margin:0 0 1rem}
label{font-weight:600;font-size:.95rem}
input,select,textarea{font:inherit;width:100%;padding:.7rem .8rem;border:1.5px solid var(--linea);border-radius:10px;background:#fff;color:var(--testo);min-height:3rem}
textarea{min-height:5rem;resize:vertical}
.due{display:grid;gap:1rem;grid-template-columns:1fr 1fr}
.spunta{display:flex;gap:.6rem;align-items:flex-start;font-weight:400}
.spunta input{width:1.2rem;min-height:1.2rem;margin-top:.25rem;flex:none}
.trappola{position:absolute;left:-9999px;height:0;overflow:hidden}
.esito{margin:1rem 0 0;padding:1rem;border-radius:12px;background:var(--morbido);display:none}
.esito.visibile{display:block}
.esito.errore{background:#fdecea;color:#7a1f14}

/* mappa */
.mappa{aspect-ratio:16/10;border:1px solid var(--linea);border-radius:14px;display:grid;place-items:center;text-align:center;padding:1rem;background:
  repeating-linear-gradient(45deg,var(--morbido) 0 12px,transparent 12px 24px)}
.mappa iframe{width:100%;height:100%;border:0;border-radius:14px}

/* piede e barra azioni */
.piede{border-top:1px solid var(--linea);padding:2rem 0 1.5rem;font-size:.92rem;color:var(--tenue)}
.piede .griglia{grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))}
.piede strong{color:var(--testo)}
.barra{position:fixed;left:0;right:0;bottom:0;z-index:6;display:grid;grid-template-columns:1fr 1fr;gap:.6rem;padding:.6rem .8rem calc(.6rem + env(safe-area-inset-bottom));
  background:var(--velo);backdrop-filter:blur(8px);border-top:1px solid var(--linea)}
.barra .bottone{min-height:2.9rem}

@media (min-width:48rem){
  body{padding-bottom:0}
  .barra{display:none}
  .telefono-testata{display:inline}
  .testata .contenitore{flex-wrap:nowrap;padding-top:0;padding-bottom:0}
  .nav{order:0;width:auto;margin:0}
  .griglia.tre{grid-template-columns:repeat(3,1fr)}
  .griglia.due-col{grid-template-columns:1.2fr 1fr;align-items:start}
  .apertura{padding:5rem 0 3.6rem}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{.testata,.barra,.azioni,.mappa{display:none}body{padding:0}}
`;
}
