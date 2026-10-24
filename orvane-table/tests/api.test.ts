import { describe, expect, it } from "vitest";
import { firmaHmac, INTESTAZIONE_CHIAVE } from "../src/assistente/elevenlabs.ts";
import { chiaveStrumenti, collegamentoApprovazione, creaGestore, type Ambiente } from "../src/api/gestore.ts";
import { ArchivioMemoria } from "../src/adattatori/archivio-memoria.ts";
import { MessaggeroMemoria } from "../src/core/messaggero.ts";
import { datiSettimana, testoRapporto } from "../src/rapporti/rapporto-settimanale.ts";
import { configTrattoria, MERCOLEDI_MATTINA } from "./aiuto.ts";

const BASE = "https://api.esempio.invalid";

async function preparaApi(adesso = MERCOLEDI_MATTINA) {
  const orologio = { adesso };
  const archivio = new ArchivioMemoria(() => orologio.adesso);
  const messaggero = new MessaggeroMemoria(() => orologio.adesso);
  const config = configTrattoria();
  await archivio.salvaConfigurazione(config);
  const amb: Ambiente = {
    archivio,
    messaggero,
    ora: () => orologio.adesso,
    urlBase: BASE,
    segretoStrumenti: "segreto-strumenti-di-prova",
    segretoCollegamenti: "segreto-collegamenti-di-prova",
    segretoWebhookVoce: "segreto-webhook-di-prova",
    whatsapp: { tokenVerifica: "verifica-di-prova" },
    originiSito: ["https://trattoria.esempio.invalid"],
  };
  const gestore = creaGestore(amb);
  const chiave = await chiaveStrumenti(amb.segretoStrumenti, config.slug);
  const chiama = (percorso: string, init: RequestInit = {}) => gestore(new Request(`${BASE}${percorso}`, init));
  const strumento = (nome: string, corpo: unknown, k = chiave) =>
    chiama(`/api/demo-trattoria/strumenti/${nome}`, {
      method: "POST",
      headers: { "content-type": "application/json", [INTESTAZIONE_CHIAVE]: k },
      body: JSON.stringify(corpo),
    });
  return { amb, archivio, messaggero, config, chiama, strumento, orologio };
}

async function fineChiamata(chiama: (p: string, i?: RequestInit) => Promise<Response>, segreto: string, adesso: Date, dati: unknown) {
  const corpo = JSON.stringify(dati);
  const t = Math.floor(adesso.getTime() / 1000);
  const firma = await firmaHmac(segreto, `${t}.${corpo}`);
  return chiama("/api/demo-trattoria/fine-chiamata", {
    method: "POST",
    headers: { "content-type": "application/json", "elevenlabs-signature": `t=${t},v0=${firma}` },
    body: corpo,
  });
}

describe("API degli strumenti", () => {
  it("rifiuta le chiamate senza chiave e accetta quelle con la chiave del locale", async () => {
    const { strumento } = await preparaApi();
    expect((await strumento("verifica_disponibilita", {}, "sbagliata")).status).toBe(401);
    const r = await strumento("verifica_disponibilita", { data: "sabato", ora: "20:30", persone: 2 });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, disponibile: true });
  });

  it("usa il numero del chiamante passato dalla piattaforma vocale", async () => {
    const { strumento, archivio, config } = await preparaApi();
    const r = await (await strumento("crea_prenotazione", {
      nome: "Mario Rossi",
      data: "sabato",
      ora: "20:30",
      persone: 2,
      _telefono_chiamante: "+393471234567",
      _id_conversazione: "conv_1",
    })).json();
    expect(r.confermata).toBe(true);
    const [p] = await archivio.prenotazioniAttive(config.id, "2026-10-31");
    expect(p).toMatchObject({ telefono: "+393471234567", idConversazione: "conv_1" });
  });

  it("restituisce saluto e data all'avvio della chiamata", async () => {
    const { chiama, config, amb } = await preparaApi();
    const r = await chiama("/api/demo-trattoria/avvio-chiamata", {
      method: "POST",
      headers: { [INTESTAZIONE_CHIAVE]: await chiaveStrumenti(amb.segretoStrumenti, config.slug) },
    });
    expect(await r.json()).toMatchObject({ dynamic_variables: { saluto: "Buongiorno", oggi: "mercoledì 28 ottobre 2026, ore 10:00" } });
  });
});

describe("webhook di fine chiamata", () => {
  it("salva la conversazione con firma valida e la classifica dal registro", async () => {
    const { chiama, strumento, archivio, config, amb } = await preparaApi();
    await strumento("crea_prenotazione", { nome: "Mario Rossi", data: "sabato", ora: "20:30", persone: 2, _telefono_chiamante: "+393471234567", _id_conversazione: "conv_ok" });
    const r = await fineChiamata(chiama, amb.segretoWebhookVoce!, amb.ora(), {
      type: "post_call_transcription",
      event_timestamp: 1,
      data: {
        conversation_id: "conv_ok",
        metadata: { start_time_unix_secs: Math.floor(amb.ora().getTime() / 1000) - 90, call_duration_secs: 84 },
        transcript: [
          { role: "agent", message: "Buongiorno, sono l'assistente virtuale...", time_in_call_secs: 0 },
          { role: "user", message: "Vorrei prenotare per sabato", time_in_call_secs: 4 },
        ],
        analysis: { call_successful: "success", transcript_summary: "Prenotazione per due" },
      },
    });
    expect(await r.json()).toMatchObject({ ok: true, esito: "risolta" });
    const [c] = await archivio.conversazioni(config.id, { da: "2026-10-01", a: "2026-12-01" });
    expect(c).toMatchObject({ idEsterno: "conv_ok", durataSecondi: 84, riassunto: "Prenotazione per due" });
    expect(c.trascrizione).toHaveLength(2);
    expect(Date.parse(c.scadeIl) - Date.parse(c.iniziataIl)).toBe(60 * 86_400_000);
  });

  it("classifica come fallita una chiamata interrotta senza azioni", async () => {
    const { chiama, amb } = await preparaApi();
    const r = await fineChiamata(chiama, amb.segretoWebhookVoce!, amb.ora(), {
      type: "post_call_transcription",
      data: { conversation_id: "conv_cadu", metadata: { call_duration_secs: 7 }, transcript: [{ role: "user", message: "Pronto? Si sen..." }], analysis: { call_successful: "unknown" } },
    });
    expect(await r.json()).toMatchObject({ esito: "fallita" });
  });

  it("rifiuta i webhook senza firma", async () => {
    const { chiama } = await preparaApi();
    const r = await chiama("/api/demo-trattoria/fine-chiamata", { method: "POST", body: JSON.stringify({ type: "post_call_transcription" }) });
    expect(r.status).toBe(401);
  });
});

describe("prenotazione dal sito", () => {
  it("mostra gli orari liberi e prenota solo con l'informativa accettata", async () => {
    const { chiama, archivio, config } = await preparaApi();
    const origine = { origin: "https://trattoria.esempio.invalid" };
    const d = await chiama("/api/demo-trattoria/disponibilita?data=2026-10-31&persone=2", { headers: origine });
    expect(d.headers.get("access-control-allow-origin")).toBe(origine.origin);
    const orari = (await d.json()).orari as string[];
    expect(orari).toContain("20:30");
    expect(orari[0]).toBe("12:00");

    const corpo = { nome: "Laura Bianchi", telefono: "3331112222", data: "2026-10-31", ora: "20:30", persone: 2 };
    const senza = await chiama("/api/demo-trattoria/prenotazioni", { method: "POST", headers: origine, body: JSON.stringify(corpo) });
    expect(senza.status).toBe(400);
    const con = await chiama("/api/demo-trattoria/prenotazioni", { method: "POST", headers: origine, body: JSON.stringify({ ...corpo, privacy: true }) });
    expect(await con.json()).toMatchObject({ ok: true, confermata: true });
    const [p] = await archivio.prenotazioniAttive(config.id, "2026-10-31");
    expect(p.canale).toBe("sito");
  });

  it("ignora in silenzio i moduli compilati da programmi automatici", async () => {
    const { chiama, archivio, config } = await preparaApi();
    await chiama("/api/demo-trattoria/prenotazioni", {
      method: "POST",
      body: JSON.stringify({ nome: "Bot", telefono: "3331112222", data: "2026-10-31", ora: "20:30", persone: 2, privacy: true, sito_web: "http://spam" }),
    });
    expect(await archivio.prenotazioniAttive(config.id, "2026-10-31")).toHaveLength(0);
  });

  it("permette al cliente di annullare dal collegamento ricevuto", async () => {
    const { chiama, strumento, archivio, config } = await preparaApi();
    await strumento("crea_prenotazione", { nome: "Mario Rossi", data: "sabato", ora: "20:30", persone: 2, _telefono_chiamante: "+393471234567" });
    const [p] = await archivio.prenotazioniAttive(config.id, "2026-10-31");
    const pagina = await (await chiama(`/p/${p.tokenGestione}`)).text();
    expect(pagina).toContain("Mario Rossi");
    expect(pagina).toContain("Annulla la prenotazione");
    const dopo = await (await chiama(`/p/${p.tokenGestione}/annulla`, { method: "POST" })).text();
    expect(dopo).toContain("Prenotazione annullata");
    expect(await archivio.prenotazioniAttive(config.id, "2026-10-31")).toHaveLength(0);
  });
});

describe("il titolare su WhatsApp e nella pagina di approvazione", () => {
  const messaggio = (da: string, testo: string) =>
    JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: da, text: { body: testo } }] } }] }] });

  it("aggiunge una chiusura solo dopo la conferma", async () => {
    const { chiama, messaggero, strumento, archivio, config } = await preparaApi();
    await chiama("/api/demo-trattoria/whatsapp", { method: "POST", body: messaggio("393330000002", "CHIUSO 10/11 ferie") });
    expect(messaggero.inviati.at(-1)?.testo).toMatch(/Risponda OK 1/);
    expect((await archivio.configurazione(config.id))?.chiusure).toHaveLength(1);

    await chiama("/api/demo-trattoria/whatsapp", { method: "POST", body: messaggio("393330000002", "ok 1") });
    expect(messaggero.inviati.at(-1)?.testo).toContain("fatto");
    expect((await archivio.configurazione(config.id))?.chiusure).toContainEqual({ dal: "2026-11-10", al: "2026-11-10", motivo: "ferie" });
    const v = await (await strumento("verifica_disponibilita", { data: "2026-11-10", ora: "20:00", persone: 2 })).json();
    expect(v.motivo).toBe("chiuso");
  });

  it("ignora i comandi che non arrivano dal numero del titolare", async () => {
    const { chiama, messaggero } = await preparaApi();
    await chiama("/api/demo-trattoria/whatsapp", { method: "POST", body: messaggio("393479999999", "CHIUSO 10/11") });
    expect(messaggero.inviati).toHaveLength(0);
  });

  it("verifica il webhook di Meta", async () => {
    const { chiama } = await preparaApi();
    const ok = await chiama("/api/demo-trattoria/whatsapp?hub.mode=subscribe&hub.verify_token=verifica-di-prova&hub.challenge=123");
    expect(await ok.text()).toBe("123");
    const no = await chiama("/api/demo-trattoria/whatsapp?hub.mode=subscribe&hub.verify_token=altro&hub.challenge=123");
    expect(no.status).toBe(403);
  });

  it("approva dalla pagina con collegamento firmato e scadenza", async () => {
    const { chiama, amb, archivio, config, orologio } = await preparaApi();
    await archivio.creaModifica({
      localeId: config.id,
      tipo: "faq",
      descrizione: 'Rispondere "sì, c\'è il wifi gratuito"',
      dati: { tema: "altro", domanda: "Avete il wifi?", risposta: "Sì, c'è il wifi gratuito: la password è sul menu." },
      motivo: "3 domande senza risposta",
      origine: "analisi_settimanale",
      richiedeTitolare: false,
    });
    const link = (await collegamentoApprovazione(amb, config.slug, new Date(orologio.adesso.getTime() + 86_400_000))).replace(BASE, "");
    expect(await (await chiama(link)).text()).toContain("wifi");
    const dopo = await (await chiama(`${link}/1/ok`, { method: "POST" })).text();
    expect(dopo).toContain("approvata e applicata");
    expect((await archivio.configurazione(config.id))?.domandeFrequenti.some((f) => f.domanda === "Avete il wifi?")).toBe(true);

    orologio.adesso = new Date(orologio.adesso.getTime() + 2 * 86_400_000);
    expect((await chiama(link)).status).toBe(403);
    expect((await chiama(link.replace(/[a-f0-9]{32}$/, "0".repeat(32)))).status).toBe(403);
  });
});

describe("rapporto settimanale", () => {
  it("riassume la settimana in meno di 120 parole con le proposte da approvare", async () => {
    const { strumento, archivio, config } = await preparaApi();
    await strumento("crea_prenotazione", { nome: "Mario Rossi", data: "sabato", ora: "20:30", persone: 2, _telefono_chiamante: "+393471234567" });
    await strumento("leggi_informazioni", { tema: "altro", domanda: "Avete il menu per celiaci?" });
    await archivio.creaModifica({
      localeId: config.id,
      tipo: "istruzione_assistente",
      descrizione: "Per gruppi sopra le 8 persone passare sempre al titolare",
      dati: { testo: "Per gruppi sopra le 8 persone passa sempre al titolare." },
      motivo: "richiesta ripetuta",
      origine: "analisi_settimanale",
      richiedeTitolare: true,
    });
    const dati = await datiSettimana(archivio, config, "2026-10-28");
    // alle 10 il locale apre solo a mezzogiorno: la prenotazione è fuori orario
    expect(dati).toMatchObject({ dal: "2026-10-26", al: "2026-11-01", prenotazioniPrese: 1, prenotazioniFuoriOrario: 1 });
    const t = testoRapporto(config, dati);
    expect(t).toContain("Buongiorno Rina");
    expect(t).toContain("Avete il menu per celiaci?");
    expect(t).toContain('"ok 1"');
    expect(t.split(/\s+/).length).toBeLessThanOrEqual(120);
  });
});
