// Proposta in una pagina (Parte 9.6, prompt 17.9 e Appendice B).
//   npm run proposta -- --locale "Trattoria Da Mario" --pacchetto pro --fondatore \
//     --emerso "perde 5 chiamate a sera il sabato" --emerso "il sito ha gli orari vecchi" --scadenza 2026-11-20
// Niente promesse economiche: solo quello che ha detto il titolare e cosa è incluso.

import { mkdirSync, writeFileSync } from "node:fs";
import { dataInParole } from "../src/core/tempo.ts";
import { EXTRA, LISTINO, NON_INCLUSO, setupScontato, type NomePacchetto } from "../src/modello/listino.ts";
import { argomento, bandiera } from "./comune.ts";

const locale = argomento("locale") ?? "[Nome del locale]";
const pacchetto = (argomento("pacchetto") ?? "pro") as NomePacchetto;
if (!LISTINO[pacchetto]) throw new Error("--pacchetto deve essere start, pro o premium");
const fondatore = bandiera("fondatore");
const emersi = process.argv.flatMap((a, i, t) => (a === "--emerso" && t[i + 1] ? [t[i + 1]] : []));
const scadenza = argomento("scadenza");
const p = LISTINO[pacchetto];
const setup = setupScontato(pacchetto, fondatore);
const euro = (n: number) => `${n.toLocaleString("it-IT", { minimumFractionDigits: n % 1 ? 2 : 0 })} euro`;

const testo = `# Proposta per ${locale}

## Cosa è emerso dalla nostra conversazione
${(emersi.length ? emersi : ["[prima cosa detta dal titolare, con le sue cifre]", "[seconda cosa]", "[terza cosa]"]).map((e) => `- ${e}`).join("\n")}

## Il pacchetto consigliato: ${p.nome}
- Setup una tantum: **${euro(setup)}**${fondatore ? ` (prezzo da cliente fondatore: sconto del 50% su ${euro(p.setup)}, in cambio di una testimonianza scritta e di un'ora di confronto al mese per tre mesi)` : ""}, metà alla firma e metà alla messa in funzione.
- Canone mensile: **${euro(p.canone)}**, anticipato, dal giorno di attivazione.${p.minutiInclusi ? `\n- Minuti dell'assistente inclusi: ${p.minutiInclusi} al mese; oltre, ${euro(EXTRA.minutoExtra)} al minuto.` : ""}
- Opzione annuale: ${EXTRA.mesiPagatiAnnuale} mesi pagati per 12.

## Cosa è incluso
${p.incluso.map((x) => `- ${x}`).join("\n")}
- Configurazione, caricamento di menu e informazioni, collaudo con voi, un'ora di formazione, correzioni entro 48 ore, aggiornamento del menu fino a quattro volte al mese.
- Supporto: ${p.supporto}.

## Tempi
Attivazione entro 5 giorni lavorativi dalla ricezione dei materiali (menu, orari, foto, numero da cui inoltrare le chiamate). Se il ritardo dipende da me, il saldo del setup non è dovuto.

## Durata e recesso
Tre mesi iniziali, poi recesso con 30 giorni di preavviso. Sito, dominio, scheda Google e dati restano vostri e si esportano in qualsiasi momento.

## Non incluso
${NON_INCLUSO.map((x) => `- ${x}`).join("\n")}

L'assistente dichiara sempre di essere un assistente virtuale e il servizio non sostituisce cassa né registratore telematico.

Validità della proposta: ${scadenza ? dataInParole(scadenza) + " " + scadenza.slice(0, 4) : "[data]"}. Importi al netto di IVA se dovuta.
`;

const cartella = new URL("../esportazioni", import.meta.url).pathname;
mkdirSync(cartella, { recursive: true });
const file = `${cartella}/proposta-${locale.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`;
writeFileSync(file, testo);
console.log(testo);
console.log(`---\nScritta in ${file}\n\nMessaggio di accompagnamento (Parte 9.6):\n"[nome], le allego la proposta. In sostanza: l'assistente risponde per voi quando siete occupati o chiusi, vi manda le prenotazioni su WhatsApp e ogni settimana vi dico cosa ha gestito e cosa ha imparato. Ci sentiamo giovedì per le domande?"`);
