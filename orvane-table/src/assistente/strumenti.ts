// Le funzioni che l'assistente vocale può chiamare (Parte 5.4, prompt 17.4).
// L'assistente non tocca mai il database: chiede a queste funzioni, che
// controllano i dati prima di scrivere e rispondono con frasi da ripetere.

import type { Archivio } from "../core/archivio.ts";
import { ALLERGENI, TEMI, type ConfigurazioneLocale, type Tema } from "../core/configurazione.ts";
import {
  apertoAdesso,
  chiusuraDel,
  descriviOrari,
  fasceDelGiorno,
  orariLiberiVicini,
  risolviOraAmbigua,
  verificaPrenotazione,
  type MotivoNonDisponibile,
} from "../core/disponibilita.ts";
import type { Messaggero } from "../core/messaggero.ts";
import {
  aggiungiGiorni,
  dataInParole,
  interpretaData,
  interpretaOra,
  istanteLocale,
  oraDa,
  type Istante,
} from "../core/tempo.ts";
import type { Canale, Prenotazione } from "../core/tipi.ts";
import {
  DatoNonValido,
  comeOggetto,
  interoPositivo,
  nomePersona,
  normalizzaTelefono,
  telefonoOpzionale,
  testoBreve,
} from "../core/validazione.ts";
import { testoConferma, testoModifica, testoAnnullamento } from "./testi.ts";

export interface ContestoStrumenti {
  archivio: Archivio;
  messaggero: Messaggero;
  config: ConfigurazioneLocale;
  adesso: Date;
  /** indirizzo pubblico per i collegamenti nei messaggi, senza barra finale */
  urlBase: string;
  idConversazione?: string | null;
  /** numero da cui chiama il cliente, se il fornitore lo passa */
  telefonoChiamante?: string | null;
  canale?: Canale;
}

export interface RispostaStrumento {
  ok: boolean;
  /** frase per l'assistente: cosa dire o cosa chiedere al cliente */
  messaggio: string;
  [campo: string]: unknown;
}

type Strumento = (ctx: ContestoStrumenti, ingresso: Record<string, unknown>) => Promise<RispostaStrumento>;

// ---------------------------------------------------------------------------
// interpretazione di data e ora

interface Richiesta {
  data: string;
  minuti: number;
  persone: number;
}

function leggiDataOra(ctx: ContestoStrumenti, ingresso: Record<string, unknown>, adesso: Istante) {
  if (typeof ingresso.data !== "string") throw new DatoNonValido("data", "Per che giorno?");
  const data = interpretaData(ingresso.data, adesso.data);
  if (!data) throw new DatoNonValido("data", "Non ho capito il giorno: me lo può dire con giorno e mese?");
  if (typeof ingresso.ora !== "string" && typeof ingresso.ora !== "number") {
    throw new DatoNonValido("ora", "A che ora?");
  }
  const minuti = interpretaOra(String(ingresso.ora));
  if (minuti === null) throw new DatoNonValido("ora", "Non ho capito l'orario: me lo può ripetere?");
  return { data, minuti: risolviOraAmbigua(ctx.config, data, minuti) };
}

function leggiRichiesta(ctx: ContestoStrumenti, ingresso: Record<string, unknown>, adesso: Istante): Richiesta {
  const { data, minuti } = leggiDataOra(ctx, ingresso, adesso);
  const persone = interoPositivo(ingresso.persone, "persone", "Per quante persone?");
  if (persone > ctx.config.prenotazioni.maxPersone) {
    throw new DatoNonValido("persone", `Il numero di persone non sembra corretto: me lo può ripetere?`);
  }
  return { data, minuti, persone };
}

// ---------------------------------------------------------------------------
// alternative

async function giorniAlternativi(ctx: ContestoStrumenti, r: Richiesta, adesso: Istante, quanti = 2) {
  const giorni: { data: string; in_parole: string; orari: string[] }[] = [];
  for (let i = 1; i <= 14 && giorni.length < quanti; i++) {
    const data = aggiungiGiorni(r.data, i);
    if (fasceDelGiorno(ctx.config, data).length === 0) continue;
    const esistenti = await ctx.archivio.prenotazioniAttive(ctx.config.id, data);
    const orari = orariLiberiVicini(ctx.config, esistenti, data, r.minuti, r.persone, adesso, 2);
    const esatto = verificaPrenotazione(ctx.config, esistenti, data, r.minuti, r.persone, adesso, {
      ignoraLimiteGruppo: true,
    });
    const elenco = esatto.disponibile ? [oraDa(r.minuti), ...orari].slice(0, 3).sort() : orari;
    if (elenco.length) giorni.push({ data, in_parole: dataInParole(data), orari: elenco });
  }
  return giorni;
}

function elencoOrari(orari: string[]): string {
  if (orari.length <= 1) return orari.join("");
  return `${orari.slice(0, -1).join(", ")} o ${orari[orari.length - 1]}`;
}

async function spiegaNonDisponibile(
  ctx: ContestoStrumenti,
  r: Richiesta,
  motivo: MotivoNonDisponibile,
  esistenti: Prenotazione[],
  adesso: Istante,
): Promise<RispostaStrumento> {
  const regole = ctx.config.prenotazioni;
  const giorno = dataInParole(r.data);
  const base = { ok: true, disponibile: false, motivo, data: r.data, data_in_parole: giorno, ora: oraDa(r.minuti), persone: r.persone };

  if (motivo === "gruppo_grande") {
    return {
      ...base,
      richiede_titolare: true,
      messaggio: `Per gruppi di più di ${regole.maxPersoneSenzaTitolare} persone la conferma la dà il titolare. Posso registrare la richiesta per ${giorno} alle ${oraDa(r.minuti)} e farla ricontattare.`,
    };
  }
  if (motivo === "passato") return { ...base, messaggio: "Quell'orario è già passato: per quando vuole prenotare?" };
  if (motivo === "troppo_lontano") {
    return { ...base, messaggio: `Si può prenotare al massimo ${regole.giorniMassimiAnticipo} giorni prima. Posso lasciare un messaggio al titolare.` };
  }

  const stessoGiorno =
    motivo === "chiuso" ? [] : orariLiberiVicini(ctx.config, esistenti, r.data, r.minuti, r.persone, adesso, 3);
  const altriGiorni = stessoGiorno.length ? [] : await giorniAlternativi(ctx, r, adesso);
  let frase: string;
  if (motivo === "chiuso") {
    const ch = chiusuraDel(ctx.config, r.data);
    frase = ch ? `${giorno} il locale è chiuso (${ch.motivo}).` : `${giorno} il locale è chiuso.`;
  } else if (motivo === "troppo_presto") {
    frase = `Per quell'ora non faccio più in tempo: serve almeno ${regole.anticipoMinimoMinuti} minuti di anticipo.`;
  } else if (motivo === "fuori_orario") {
    frase = `Alle ${oraDa(r.minuti)} non si prenota. Gli orari sono: ${descriviOrari(ctx.config)}.`;
  } else {
    frase = `${giorno} alle ${oraDa(r.minuti)} è tutto pieno per ${r.persone} persone.`;
  }
  if (stessoGiorno.length) frase += ` Lo stesso giorno ho posto alle ${elencoOrari(stessoGiorno)}.`;
  else if (altriGiorni.length) {
    frase += ` Ho posto ${altriGiorni.map((g) => `${g.in_parole} alle ${elencoOrari(g.orari)}`).join(", oppure ")}.`;
  } else frase += " Non vedo posti liberi nei prossimi giorni: posso lasciare un messaggio al titolare.";
  return { ...base, alternative: stessoGiorno, giorni_alternativi: altriGiorni, messaggio: frase };
}

// ---------------------------------------------------------------------------
// ricerca della prenotazione di chi chiama

async function trovaPrenotazioneCliente(
  ctx: ContestoStrumenti,
  ingresso: Record<string, unknown>,
  adesso: Istante,
): Promise<{ prenotazione: Prenotazione } | { risposta: RispostaStrumento }> {
  const telefono = telefonoOpzionale(ingresso.telefono) ?? telefonoOpzionale(ctx.telefonoChiamante);
  const codice = typeof ingresso.codice === "string" || typeof ingresso.codice === "number"
    ? String(ingresso.codice).replace(/\D/g, "")
    : "";
  const attiva = (p: Prenotazione) =>
    (p.stato === "confermata" || p.stato === "da_confermare") && p.data >= adesso.data;

  if (!telefono) {
    return { risposta: { ok: false, errore: "dato_mancante", campo: "telefono", messaggio: "Mi dice il numero di telefono usato per la prenotazione?" } };
  }
  if (codice) {
    const p = await ctx.archivio.prenotazionePerCodice(ctx.config.id, codice);
    if (p && attiva(p) && p.telefono === telefono) return { prenotazione: p };
    return { risposta: { ok: false, errore: "non_trovata", messaggio: "Non trovo una prenotazione con questo codice e questo numero. Mi dice il giorno della prenotazione?" } };
  }
  let trovate = (await ctx.archivio.prenotazioniPerTelefono(ctx.config.id, telefono, adesso.data)).filter(attiva);
  if (typeof ingresso.data === "string" && ingresso.data.trim()) {
    const data = interpretaData(ingresso.data, adesso.data);
    if (data) trovate = trovate.filter((p) => p.data === data);
  }
  if (trovate.length === 1) return { prenotazione: trovate[0] };
  if (trovate.length === 0) {
    return { risposta: { ok: false, errore: "non_trovata", messaggio: "Non trovo prenotazioni future con questo numero. Ha il codice che le è arrivato nel messaggio?" } };
  }
  return {
    risposta: {
      ok: false,
      errore: "piu_prenotazioni",
      scelte: trovate.map((p) => ({ data: p.data, data_in_parole: dataInParole(p.data), ora: p.ora, persone: p.persone })),
      messaggio: `Ho trovato ${trovate.length} prenotazioni: ${trovate.map((p) => `${dataInParole(p.data)} alle ${p.ora}`).join(", ")}. Quale intende?`,
    },
  };
}

// ---------------------------------------------------------------------------
// gli strumenti

async function generaCodice(ctx: ContestoStrumenti): Promise<string> {
  const usati = await ctx.archivio.codiciAttivi(ctx.config.id);
  for (let i = 0; i < 50; i++) {
    const n = crypto.getRandomValues(new Uint16Array(1))[0] % 9000;
    const codice = String(1000 + n);
    if (!usati.has(codice)) return codice;
  }
  throw new Error("Nessun codice di prenotazione libero");
}

function generaToken(): string {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "").slice(0, 8);
}

async function avvisaTitolare(ctx: ContestoStrumenti, testo: string) {
  await ctx.messaggero.invia({ a: ctx.config.titolare.telefono, tipo: "avviso_titolare", testo, parametri: [testo] });
}

const verifica_disponibilita: Strumento = async (ctx, ingresso) => {
  const adesso = istanteLocale(ctx.adesso, ctx.config.fusoOrario);
  const r = leggiRichiesta(ctx, ingresso, adesso);
  const esistenti = await ctx.archivio.prenotazioniAttive(ctx.config.id, r.data);
  const esito = verificaPrenotazione(ctx.config, esistenti, r.data, r.minuti, r.persone, adesso);
  if (!esito.disponibile) return spiegaNonDisponibile(ctx, r, esito.motivo, esistenti, adesso);
  return {
    ok: true,
    disponibile: true,
    data: r.data,
    data_in_parole: dataInParole(r.data),
    ora: oraDa(r.minuti),
    persone: r.persone,
    messaggio: `C'è posto ${dataInParole(r.data)} alle ${oraDa(r.minuti)} per ${r.persone} persone. Mi servono nome e numero di telefono.`,
  };
};

const crea_prenotazione: Strumento = async (ctx, ingresso) => {
  const config = ctx.config;
  const adesso = istanteLocale(ctx.adesso, config.fusoOrario);
  const nome = nomePersona(ingresso.nome);
  const telefono = normalizzaTelefono(ingresso.telefono || ctx.telefonoChiamante);
  const r = leggiRichiesta(ctx, ingresso, adesso);
  const note = testoBreve(ingresso.note, "note", 300);
  const noteSalute = testoBreve(ingresso.note_salute, "note_salute", 300);
  const consenso = ingresso.consenso_note_salute === true || ingresso.consenso_note_salute === "true";
  if (noteSalute && !consenso) {
    throw new DatoNonValido(
      "consenso_note_salute",
      "Per annotare allergie o intolleranze sulla prenotazione mi serve il suo consenso: va bene se lo annoto?",
    );
  }

  const esistenti = await ctx.archivio.prenotazioniAttive(config.id, r.data);
  const controlloBase = verificaPrenotazione(config, esistenti, r.data, r.minuti, r.persone, adesso, { ignoraLimiteGruppo: true });
  if (!controlloBase.disponibile) return spiegaNonDisponibile(ctx, r, controlloBase.motivo, esistenti, adesso);

  const gruppoGrande = r.persone > config.prenotazioni.maxPersoneSenzaTitolare;
  const nuova = {
    localeId: config.id,
    codice: await generaCodice(ctx),
    tokenGestione: generaToken(),
    nome,
    telefono,
    data: r.data,
    ora: oraDa(r.minuti),
    persone: r.persone,
    stato: gruppoGrande ? ("da_confermare" as const) : ("confermata" as const),
    canale: ctx.canale ?? ("telefono" as const),
    note,
    noteSalute: consenso ? noteSalute : null,
    consensoNoteSalute: Boolean(consenso && noteSalute),
    fuoriOrario: !apertoAdesso(config, adesso),
    idConversazione: ctx.idConversazione ?? null,
  };
  const salvata = await ctx.archivio.prenotaSeDisponibile(nuova, (attuali) =>
    verificaPrenotazione(config, attuali, r.data, r.minuti, r.persone, adesso, { ignoraLimiteGruppo: true }).disponibile,
  );
  if (!salvata) {
    // qualcuno ha preso il posto tra la verifica e il salvataggio
    const aggiornate = await ctx.archivio.prenotazioniAttive(config.id, r.data);
    return spiegaNonDisponibile(ctx, r, "pieno", aggiornate, adesso);
  }

  const quando = `${dataInParole(salvata.data)} alle ${salvata.ora}`;
  if (gruppoGrande) {
    await ctx.archivio.creaSegnalazione({
      localeId: config.id,
      tipo: "gruppo_grande",
      testo: `Richiesta per ${salvata.persone} persone ${quando} a nome ${nome}${note ? ` (${note})` : ""}. Da confermare.`,
      urgenza: "alta",
      nome,
      telefono,
      idConversazione: ctx.idConversazione ?? null,
    });
    await avvisaTitolare(
      ctx,
      `Richiesta da confermare: ${salvata.persone} persone ${quando}, ${nome}, ${telefono}. Il posto è tenuto in sospeso: richiamate il cliente.`,
    );
    return {
      ok: true,
      confermata: false,
      da_confermare: true,
      codice: salvata.codice,
      messaggio: `Ho registrato la richiesta per ${salvata.persone} persone ${quando}. Il titolare la ricontatterà al numero ${telefono} per confermare.`,
    };
  }

  const invio = await ctx.messaggero.invia({
    a: telefono,
    tipo: "conferma_prenotazione",
    testo: testoConferma(config, salvata, ctx.urlBase),
    parametri: [config.nome, quando, String(salvata.persone), salvata.codice, `${ctx.urlBase}/p/${salvata.tokenGestione}`],
  });
  return {
    ok: true,
    confermata: true,
    codice: salvata.codice,
    data: salvata.data,
    ora: salvata.ora,
    persone: salvata.persone,
    messaggio_inviato: invio.ok,
    messaggio: invio.ok
      ? `Prenotazione confermata ${quando} per ${salvata.persone} persone a nome ${nome}. Le arriva un messaggio con il codice ${salvata.codice}.`
      : `Prenotazione confermata ${quando} per ${salvata.persone} persone a nome ${nome}. Il codice è ${salvata.codice}: il messaggio di conferma non è partito, glielo ripeto.`,
  };
};

const modifica_prenotazione: Strumento = async (ctx, ingresso) => {
  const config = ctx.config;
  const adesso = istanteLocale(ctx.adesso, config.fusoOrario);
  const trovata = await trovaPrenotazioneCliente(ctx, ingresso, adesso);
  if ("risposta" in trovata) return trovata.risposta;
  const p = trovata.prenotazione;

  const vuoleData = typeof ingresso.nuova_data === "string" && ingresso.nuova_data.trim() !== "";
  const vuoleOra = ingresso.nuova_ora !== undefined && ingresso.nuova_ora !== null && ingresso.nuova_ora !== "";
  const vuolePersone = ingresso.nuove_persone !== undefined && ingresso.nuove_persone !== null && ingresso.nuove_persone !== "";
  const note = testoBreve(ingresso.note, "note", 300);
  if (!vuoleData && !vuoleOra && !vuolePersone && note === null) {
    return { ok: false, errore: "nessuna_modifica", messaggio: "Cosa vuole cambiare: giorno, orario o numero di persone?" };
  }
  const { data, minuti } = leggiDataOra(
    ctx,
    { data: vuoleData ? ingresso.nuova_data : p.data, ora: vuoleOra ? ingresso.nuova_ora : p.ora },
    adesso,
  );
  const persone = vuolePersone
    ? interoPositivo(ingresso.nuove_persone, "nuove_persone", "Per quante persone?")
    : p.persone;
  const r = { data, minuti, persone };

  if (persone > config.prenotazioni.maxPersoneSenzaTitolare && persone > p.persone) {
    await ctx.archivio.creaSegnalazione({
      localeId: config.id,
      tipo: "gruppo_grande",
      testo: `${p.nome} chiede di passare da ${p.persone} a ${persone} persone per ${dataInParole(data)} alle ${oraDa(minuti)} (prenotazione ${p.codice}).`,
      urgenza: "alta",
      nome: p.nome,
      telefono: p.telefono,
      idConversazione: ctx.idConversazione ?? null,
    });
    await avvisaTitolare(ctx, `Richiesta di modifica da confermare: ${p.nome}, ${p.telefono}, da ${p.persone} a ${persone} persone, ${dataInParole(data)} alle ${oraDa(minuti)}.`);
    return {
      ok: true,
      modificata: false,
      richiede_titolare: true,
      messaggio: `Per più di ${config.prenotazioni.maxPersoneSenzaTitolare} persone decide il titolare: la prenotazione resta com'è e il titolare la ricontatta per la modifica.`,
    };
  }

  const aggiornata = await ctx.archivio.aggiornaSeDisponibile(
    config.id,
    p.id,
    { data, ora: oraDa(minuti), persone, ...(note !== null ? { note } : {}) },
    (altre) => verificaPrenotazione(config, altre, data, minuti, persone, adesso).disponibile,
  );
  if (!aggiornata) {
    const altre = (await ctx.archivio.prenotazioniAttive(config.id, data)).filter((x) => x.id !== p.id);
    const motivo = verificaPrenotazione(config, altre, data, minuti, persone, adesso);
    return spiegaNonDisponibile(ctx, r, motivo.disponibile ? "pieno" : motivo.motivo, altre, adesso);
  }
  await ctx.messaggero.invia({
    a: aggiornata.telefono,
    tipo: "modifica_prenotazione",
    testo: testoModifica(config, aggiornata, ctx.urlBase),
    parametri: [config.nome, `${dataInParole(aggiornata.data)} alle ${aggiornata.ora}`, String(aggiornata.persone), aggiornata.codice],
  });
  return {
    ok: true,
    modificata: true,
    codice: aggiornata.codice,
    messaggio: `Fatto: la prenotazione ora è ${dataInParole(aggiornata.data)} alle ${aggiornata.ora} per ${aggiornata.persone} persone. Le arriva un messaggio di conferma.`,
  };
};

const annulla_prenotazione: Strumento = async (ctx, ingresso) => {
  const config = ctx.config;
  const adesso = istanteLocale(ctx.adesso, config.fusoOrario);
  const trovata = await trovaPrenotazioneCliente(ctx, ingresso, adesso);
  if ("risposta" in trovata) return trovata.risposta;
  const p = trovata.prenotazione;
  await ctx.archivio.aggiornaSeDisponibile(config.id, p.id, { stato: "annullata" }, () => true);
  await ctx.messaggero.invia({
    a: p.telefono,
    tipo: "annullamento_prenotazione",
    testo: testoAnnullamento(config, p),
    parametri: [config.nome, `${dataInParole(p.data)} alle ${p.ora}`],
  });
  if (p.data === adesso.data) {
    await avvisaTitolare(ctx, `Disdetta per oggi: ${p.nome}, ${p.persone} persone alle ${p.ora}.`);
  }
  return {
    ok: true,
    annullata: true,
    messaggio: `Ho annullato la prenotazione di ${dataInParole(p.data)} alle ${p.ora}. Grazie per averci avvisato.`,
  };
};

export const FRASE_ALLERGIE =
  "Per allergie e intolleranze la cosa migliore è confermare con il personale; posso annotare la sua richiesta sulla prenotazione.";

function normalizza(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ");
}

const PAROLE_VUOTE = new Set(["il", "lo", "la", "i", "gli", "le", "un", "una", "di", "da", "per", "con", "che", "e", "si", "ci", "a", "in", "voi", "vostro", "avete", "posso", "del", "della"]);

function parole(t: string): string[] {
  return normalizza(t).split(" ").filter((p) => p.length > 2 && !PAROLE_VUOTE.has(p));
}

const leggi_informazioni: Strumento = async (ctx, ingresso) => {
  const config = ctx.config;
  const adesso = istanteLocale(ctx.adesso, config.fusoOrario);
  const tema: Tema = (TEMI as readonly string[]).includes(String(ingresso.tema)) ? (ingresso.tema as Tema) : "altro";
  const domanda = testoBreve(ingresso.domanda, "domanda", 300);
  const faq = config.domandeFrequenti.filter((f) => f.verificata);
  const risposte: string[] = [];

  const prossimeChiusure = config.chiusure
    .filter((c) => c.al >= adesso.data && c.dal <= aggiungiGiorni(adesso.data, 45))
    .map((c) => (c.dal === c.al ? `${dataInParole(c.dal)} (${c.motivo})` : `dal ${dataInParole(c.dal)} al ${dataInParole(c.al)} (${c.motivo})`));

  switch (tema) {
    case "orari":
      risposte.push(`Orari: ${descriviOrari(config)}.`);
      if (prossimeChiusure.length) risposte.push(`Chiusure in programma: ${prossimeChiusure.join("; ")}.`);
      break;
    case "chiusure":
      risposte.push(prossimeChiusure.length ? `Chiusure in programma: ${prossimeChiusure.join("; ")}.` : "Non ci sono chiusure straordinarie in programma.");
      break;
    case "indirizzo": {
      const i = config.contatti.indirizzo;
      risposte.push(`Siamo in ${i.via}, ${i.cap} ${i.citta} (${i.provincia}).`);
      break;
    }
    case "menu":
      if (config.menu.length) {
        risposte.push(
          config.menu
            .map((c) => `${c.categoria}: ${c.voci.map((v) => `${v.nome} ${formatoPrezzo(v.prezzo)}`).join(", ")}`)
            .join(". "),
        );
      }
      break;
    case "vegetariano": {
      const voci = config.menu.flatMap((c) => c.voci).filter((v) => v.vegetariano || v.vegano);
      if (voci.length) risposte.push(`Piatti vegetariani: ${voci.map((v) => `${v.nome}${v.vegano ? " (vegano)" : ""}`).join(", ")}.`);
      break;
    }
    case "prezzi": {
      const prezzi = config.menu.flatMap((c) => c.voci.map((v) => v.prezzo)).filter((p) => p > 0);
      if (prezzi.length) risposte.push(`I piatti vanno da ${formatoPrezzo(Math.min(...prezzi))} a ${formatoPrezzo(Math.max(...prezzi))}.`);
      break;
    }
    case "allergie": {
      risposte.push(FRASE_ALLERGIE);
      const piatto = testoBreve(ingresso.piatto, "piatto", 100);
      if (piatto) {
        const cercate = parole(piatto);
        const voce = config.menu
          .flatMap((c) => c.voci)
          .find((v) => cercate.length > 0 && cercate.every((p) => normalizza(v.nome).includes(p)));
        if (voce) {
          const elenco = voce.allergeni.map((a) => ALLERGENI[a]);
          risposte.push(
            elenco.length
              ? `Secondo le informazioni scritte dal locale, ${voce.nome} contiene: ${elenco.join(", ")}. Va comunque confermato con il personale.`
              : `Per ${voce.nome} il locale non ha indicato allergeni: va comunque confermato con il personale.`,
          );
        }
      }
      // sulle allergie non si dice altro: niente ricerca libera nelle domande frequenti
      return { ok: true, trovato: true, tema, messaggio: risposte.join(" ") };
    }
    default:
      break;
  }

  const delTema = faq.filter((f) => f.tema === tema && tema !== "altro");
  risposte.push(...delTema.map((f) => f.risposta));
  if (domanda && risposte.length === 0) {
    const cercate = parole(domanda);
    const punteggio = (f: (typeof faq)[number]) => {
      const testo = normalizza(`${f.domanda} ${f.risposta}`);
      return cercate.filter((p) => testo.includes(p)).length;
    };
    const migliore = faq.map((f) => ({ f, p: punteggio(f) })).sort((a, b) => b.p - a.p)[0];
    if (migliore && migliore.p >= Math.min(2, cercate.length) && migliore.p > 0) risposte.push(migliore.f.risposta);
  }

  if (risposte.length === 0) {
    await ctx.archivio.creaSegnalazione({
      localeId: config.id,
      tipo: "domanda_senza_risposta",
      testo: domanda ?? `Domanda sul tema "${tema}"`,
      urgenza: "normale",
      nome: null,
      telefono: null,
      idConversazione: ctx.idConversazione ?? null,
    });
    return {
      ok: true,
      trovato: false,
      tema,
      messaggio: "Questa informazione non ce l'ho. Posso lasciare un messaggio al titolare, che la richiama.",
    };
  }
  return { ok: true, trovato: true, tema, messaggio: risposte.join(" ") };
};

function formatoPrezzo(euro: number): string {
  return Number.isInteger(euro) ? `${euro} euro` : `${euro.toFixed(2).replace(".", ",")} euro`;
}

const lascia_messaggio_al_titolare: Strumento = async (ctx, ingresso) => {
  const testo = testoBreve(ingresso.testo, "testo", 600);
  if (!testo) throw new DatoNonValido("testo", "Qual è il messaggio da lasciare al titolare?");
  const urgenza = ingresso.urgenza === "alta" || ingresso.urgenza === "bassa" ? ingresso.urgenza : "normale";
  const nome = typeof ingresso.nome === "string" && ingresso.nome.trim() ? ingresso.nome.trim().slice(0, 80) : null;
  const telefono = telefonoOpzionale(ingresso.telefono) ?? telefonoOpzionale(ctx.telefonoChiamante);
  await ctx.archivio.creaSegnalazione({
    localeId: ctx.config.id,
    tipo: ingresso.richiesta_persona === true ? "richiesta_persona" : "messaggio_titolare",
    testo,
    urgenza,
    nome,
    telefono,
    idConversazione: ctx.idConversazione ?? null,
  });
  await avvisaTitolare(
    ctx,
    `${urgenza === "alta" ? "URGENTE - " : ""}Messaggio${nome ? ` da ${nome}` : ""}${telefono ? ` (${telefono})` : ""}: ${testo}`,
  );
  return {
    ok: true,
    messaggio: telefono
      ? `Ho lasciato il messaggio al titolare, che la ricontatterà al numero ${telefono}.`
      : "Ho lasciato il messaggio al titolare. Mi lascia un numero per essere richiamato?",
  };
};

const trasferisci_chiamata: Strumento = async (ctx) => {
  const config = ctx.config;
  const adesso = istanteLocale(ctx.adesso, config.fusoOrario);
  if (!config.assistente.trasferimento || !config.assistente.numeroTrasferimento) {
    return {
      ok: true,
      consentito: false,
      messaggio: "In questo momento non posso passare la chiamata. Posso lasciare un messaggio al titolare, che la richiama.",
    };
  }
  if (!apertoAdesso(config, adesso)) {
    return {
      ok: true,
      consentito: false,
      messaggio: "Il locale adesso è chiuso e non c'è nessuno per rispondere. Posso lasciare un messaggio al titolare.",
    };
  }
  return {
    ok: true,
    consentito: true,
    numero: config.assistente.numeroTrasferimento,
    messaggio: "Passo la chiamata al locale: usa lo strumento di trasferimento verso il numero del locale.",
  };
};

export const STRUMENTI = {
  verifica_disponibilita,
  crea_prenotazione,
  modifica_prenotazione,
  annulla_prenotazione,
  leggi_informazioni,
  lascia_messaggio_al_titolare,
  trasferisci_chiamata,
} satisfies Record<string, Strumento>;

export type NomeStrumento = keyof typeof STRUMENTI;

export function eUnoStrumento(nome: string): nome is NomeStrumento {
  return Object.hasOwn(STRUMENTI, nome);
}

/** Esegue uno strumento, traduce gli errori in frasi e registra la chiamata. */
export async function eseguiStrumento(
  nome: NomeStrumento,
  ctx: ContestoStrumenti,
  ingressoGrezzo: unknown,
): Promise<RispostaStrumento> {
  const ingresso = comeOggetto(ingressoGrezzo);
  let risposta: RispostaStrumento;
  try {
    risposta = await STRUMENTI[nome](ctx, ingresso);
  } catch (e) {
    if (e instanceof DatoNonValido) {
      risposta = { ok: false, errore: "dato_non_valido", campo: e.campo, messaggio: e.message };
    } else {
      risposta = {
        ok: false,
        errore: "errore_interno",
        messaggio: "C'è un problema tecnico. Posso lasciare un messaggio al titolare, che la richiama.",
      };
      console.error(`[${ctx.config.slug}] errore in ${nome}:`, e);
    }
  }
  await ctx.archivio
    .registra({
      localeId: ctx.config.id,
      strumento: nome,
      ingresso,
      risposta,
      ok: risposta.ok,
      idConversazione: ctx.idConversazione ?? null,
      creataIl: ctx.adesso.toISOString(),
    })
    .catch((e) => console.error("registro non salvato:", e));
  return risposta;
}
