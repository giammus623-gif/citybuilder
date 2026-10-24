// I dieci scenari di collaudo dell'assistente (Parte 6.3 e prompt 17.4),
// provati sulle funzioni server. Lo scenario dell'accento o del dialetto
// riguarda il riconoscimento vocale e si prova solo con telefonate vere
// (vedi docs/operativita/collaudo-20-chiamate.md).

import { describe, expect, it } from "vitest";
import { FRASE_ALLERGIE, eseguiStrumento } from "../src/assistente/strumenti.ts";
import { banco, configTrattoria } from "./aiuto.ts";

const SABATO = "2026-10-31";

describe("scenario 1: prenotazione semplice per due persone", () => {
  it("verifica, salva, manda la conferma e registra le chiamate", async () => {
    const { ctx, archivio, messaggero } = await banco();
    const v = await eseguiStrumento("verifica_disponibilita", ctx, { data: "sabato", ora: "20:30", persone: 2 });
    expect(v).toMatchObject({ ok: true, disponibile: true, data: SABATO, ora: "20:30" });

    const c = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Mario Rossi", data: SABATO, ora: "20:30", persone: 2 });
    expect(c).toMatchObject({ ok: true, confermata: true, messaggio_inviato: true });
    expect(String(c.codice)).toMatch(/^\d{4}$/);

    const salvate = await archivio.prenotazioniAttive(ctx.config.id, SABATO);
    expect(salvate).toHaveLength(1);
    expect(salvate[0]).toMatchObject({ telefono: "+393471234567", stato: "confermata", canale: "telefono" });

    expect(messaggero.inviati).toHaveLength(1);
    expect(messaggero.inviati[0]).toMatchObject({ a: "+393471234567", tipo: "conferma_prenotazione" });
    expect(messaggero.inviati[0].testo).toContain(`/p/${salvate[0].tokenGestione}`);
    expect(archivio.registro.map((r) => r.strumento)).toEqual(["verifica_disponibilita", "crea_prenotazione"]);
  });

  it("capisce 'alle 8' come le 20:00 per una cena", async () => {
    const { ctx } = await banco();
    const v = await eseguiStrumento("verifica_disponibilita", ctx, { data: "venerdì", ora: "8", persone: 2 });
    expect(v).toMatchObject({ disponibile: true, ora: "20:00" });
  });
});

describe("scenario 2: orario non disponibile", () => {
  it("propone orari vicini quando la sala è piena", async () => {
    const { ctx, archivio } = await banco();
    for (let i = 0; i < 6; i++) {
      const r = await eseguiStrumento("crea_prenotazione", ctx, { nome: `Cliente ${i}`, telefono: `+3934700000${i}0`, data: SABATO, ora: "20:30", persone: 8 });
      expect(r.confermata).toBe(true);
    }
    // 48 coperti alle 20:30 su 50: per 4 persone non c'è posto
    const v = await eseguiStrumento("verifica_disponibilita", ctx, { data: SABATO, ora: "20:30", persone: 4 });
    expect(v).toMatchObject({ ok: true, disponibile: false, motivo: "pieno" });
    const alternative = v.alternative as string[];
    expect(alternative.length).toBeGreaterThan(0);
    for (const ora of alternative) {
      const prova = await eseguiStrumento("verifica_disponibilita", ctx, { data: SABATO, ora, persone: 4 });
      expect(prova.disponibile).toBe(true);
    }
    const prima = (await archivio.prenotazioniAttive(ctx.config.id, SABATO)).length;
    const c = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Tardi", data: SABATO, ora: "20:30", persone: 4 });
    expect(c).toMatchObject({ disponibile: false, motivo: "pieno" });
    expect((await archivio.prenotazioniAttive(ctx.config.id, SABATO)).length).toBe(prima);
  });

  it("non permette l'overbooking con richieste contemporanee", async () => {
    const { ctx, archivio } = await banco();
    const richieste = Array.from({ length: 12 }, (_, i) =>
      eseguiStrumento("crea_prenotazione", { ...ctx, telefonoChiamante: `+39347555${String(i).padStart(4, "0")}` }, {
        nome: `Ospite ${i}`,
        data: SABATO,
        ora: "21:00",
        persone: 6,
      }),
    );
    const esiti = await Promise.all(richieste);
    const confermate = esiti.filter((e) => e.confermata === true).length;
    expect(confermate).toBe(8); // 8 x 6 = 48 coperti, il nono sforerebbe i 50
    const totale = (await archivio.prenotazioniAttive(ctx.config.id, SABATO)).reduce((s, p) => s + p.persone, 0);
    expect(totale).toBeLessThanOrEqual(ctx.config.prenotazioni.capienzaCoperti);
  });

  it("indica i giorni successivi quando il locale è chiuso", async () => {
    const { ctx } = await banco();
    const v = await eseguiStrumento("verifica_disponibilita", ctx, { data: "lunedì", ora: "20:00", persone: 2 });
    expect(v).toMatchObject({ disponibile: false, motivo: "chiuso" });
    const giorni = v.giorni_alternativi as { data: string; orari: string[] }[];
    expect(giorni[0].data).toBe("2026-11-03"); // martedì
    expect(giorni[0].orari).toContain("20:00");
  });
});

describe("scenario 3: gruppo grande", () => {
  it("non conferma, tiene il posto in sospeso e avvisa il titolare", async () => {
    const { ctx, archivio, messaggero } = await banco();
    const v = await eseguiStrumento("verifica_disponibilita", ctx, { data: SABATO, ora: "20:00", persone: 12 });
    expect(v).toMatchObject({ disponibile: false, motivo: "gruppo_grande", richiede_titolare: true });

    const c = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Festa Bianchi", data: SABATO, ora: "20:00", persone: 12, note: "compleanno" });
    expect(c).toMatchObject({ ok: true, confermata: false, da_confermare: true });
    const [p] = await archivio.prenotazioniAttive(ctx.config.id, SABATO);
    expect(p.stato).toBe("da_confermare");
    const segnalazioni = await archivio.segnalazioni(ctx.config.id);
    expect(segnalazioni).toMatchObject([{ tipo: "gruppo_grande", urgenza: "alta" }]);
    expect(messaggero.inviati).toHaveLength(1);
    expect(messaggero.inviati[0]).toMatchObject({ a: ctx.config.titolare.telefono, tipo: "avviso_titolare" });
  });
});

describe("scenario 4: allergie e intolleranze", () => {
  it("risponde in modo prudente e legge solo gli allergeni scritti dal locale", async () => {
    const { ctx } = await banco();
    const r = await eseguiStrumento("leggi_informazioni", ctx, { tema: "allergie", piatto: "cacio e pepe" });
    expect(r.messaggio).toContain(FRASE_ALLERGIE);
    expect(r.messaggio).toContain("cereali contenenti glutine");
    expect(r.messaggio).toContain("latte e lattosio");
    expect(r.messaggio).toContain("confermato con il personale");
    const generica = await eseguiStrumento("leggi_informazioni", ctx, { tema: "allergie", domanda: "è tutto senza glutine?" });
    expect(generica.messaggio).toBe(FRASE_ALLERGIE);
  });

  it("annota le note sanitarie solo con consenso e le cancella dopo la data", async () => {
    const { ctx, archivio, orologio } = await banco();
    const senza = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Anna Verdi", data: SABATO, ora: "13:00", persone: 3, note_salute: "celiachia" });
    expect(senza).toMatchObject({ ok: false, errore: "dato_non_valido", campo: "consenso_note_salute" });
    expect(await archivio.prenotazioniAttive(ctx.config.id, SABATO)).toHaveLength(0);

    const con = await eseguiStrumento("crea_prenotazione", ctx, {
      nome: "Anna Verdi",
      data: SABATO,
      ora: "13:00",
      persone: 3,
      note_salute: "celiachia",
      consenso_note_salute: true,
    });
    expect(con.confermata).toBe(true);
    expect((await archivio.prenotazioniAttive(ctx.config.id, SABATO))[0]).toMatchObject({ noteSalute: "celiachia", consensoNoteSalute: true });

    orologio.adesso = new Date("2026-11-01T09:00:00Z");
    const pulizia = await archivio.pulisciScaduti(orologio.adesso.toISOString(), "2026-11-01");
    expect(pulizia.noteSalute).toBe(1);
    expect((await archivio.prenotazioniAttive(ctx.config.id, SABATO))[0].noteSalute).toBeNull();
  });
});

describe("scenario 5: modifica di una prenotazione esistente", () => {
  it("sposta l'orario riconoscendo il cliente da codice e numero", async () => {
    const { ctx, messaggero } = await banco();
    const c = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Luca Neri", data: SABATO, ora: "20:00", persone: 4 });
    const m = await eseguiStrumento("modifica_prenotazione", ctx, { codice: c.codice, nuova_ora: "21:15" });
    expect(m).toMatchObject({ ok: true, modificata: true });
    expect(messaggero.inviati.map((x) => x.tipo)).toEqual(["conferma_prenotazione", "modifica_prenotazione"]);
    expect(messaggero.inviati[1].testo).toContain("21:15");
  });

  it("non modifica la prenotazione di un altro numero", async () => {
    const { ctx } = await banco();
    const c = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Luca Neri", data: SABATO, ora: "20:00", persone: 4 });
    const m = await eseguiStrumento("modifica_prenotazione", { ...ctx, telefonoChiamante: "+393479999999" }, { codice: c.codice, nuova_ora: "21:15" });
    expect(m).toMatchObject({ ok: false, errore: "non_trovata" });
  });

  it("passa al titolare chi vuole aumentare oltre il limite di gruppo", async () => {
    const { ctx, archivio } = await banco();
    const c = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Luca Neri", data: SABATO, ora: "20:00", persone: 4 });
    const m = await eseguiStrumento("modifica_prenotazione", ctx, { codice: c.codice, nuove_persone: 14 });
    expect(m).toMatchObject({ ok: true, modificata: false, richiede_titolare: true });
    expect((await archivio.prenotazioniAttive(ctx.config.id, SABATO))[0].persone).toBe(4);
  });
});

describe("scenario 6: annullamento", () => {
  it("annulla dal numero del chiamante e libera i coperti", async () => {
    const { ctx, archivio } = await banco();
    await eseguiStrumento("crea_prenotazione", ctx, { nome: "Sara Blu", data: SABATO, ora: "20:00", persone: 2 });
    const a = await eseguiStrumento("annulla_prenotazione", ctx, {});
    expect(a).toMatchObject({ ok: true, annullata: true });
    expect(await archivio.prenotazioniAttive(ctx.config.id, SABATO)).toHaveLength(0);
  });

  it("chiede quale prenotazione se ce n'è più di una", async () => {
    const { ctx } = await banco();
    await eseguiStrumento("crea_prenotazione", ctx, { nome: "Sara Blu", data: SABATO, ora: "20:00", persone: 2 });
    await eseguiStrumento("crea_prenotazione", ctx, { nome: "Sara Blu", data: "2026-11-06", ora: "20:00", persone: 2 });
    const a = await eseguiStrumento("annulla_prenotazione", ctx, {});
    expect(a).toMatchObject({ ok: false, errore: "piu_prenotazioni" });
    const b = await eseguiStrumento("annulla_prenotazione", ctx, { data: "6/11" });
    expect(b).toMatchObject({ ok: true, annullata: true });
  });
});

describe("scenario 7: domande su parcheggio, animali, accessibilità, orari festivi", () => {
  it("risponde con le informazioni verificate", async () => {
    const { ctx } = await banco();
    const p = await eseguiStrumento("leggi_informazioni", ctx, { tema: "parcheggio" });
    expect(p).toMatchObject({ trovato: true });
    expect(p.messaggio).toContain("piazza del Mercato");
    const a = await eseguiStrumento("leggi_informazioni", ctx, { tema: "accessibilita" });
    expect(a.messaggio).toContain("piano terra");
    const o = await eseguiStrumento("leggi_informazioni", ctx, { tema: "orari" });
    expect(o.messaggio).toContain("lunedì: chiuso");
  });

  it("non inventa e registra la domanda senza risposta", async () => {
    const { ctx, archivio } = await banco();
    const r = await eseguiStrumento("leggi_informazioni", ctx, { tema: "altro", domanda: "Avete il wifi gratuito?" });
    expect(r).toMatchObject({ ok: true, trovato: false });
    expect(await archivio.segnalazioni(ctx.config.id)).toMatchObject([{ tipo: "domanda_senza_risposta", testo: "Avete il wifi gratuito?" }]);
  });
});

describe("scenario 8: chiamata fuori orario per il giorno dopo", () => {
  it("prenota per domani e segna la prenotazione come fuori orario", async () => {
    // lunedì 2 novembre, 23:30: locale chiuso
    const { ctx, archivio } = await banco({ adesso: new Date("2026-11-02T22:30:00Z") });
    const c = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Paolo Gialli", data: "domani", ora: "20:00", persone: 2 });
    expect(c).toMatchObject({ ok: true, confermata: true, data: "2026-11-03" });
    expect((await archivio.prenotazioniAttive(ctx.config.id, "2026-11-03"))[0].fuoriOrario).toBe(true);
  });

  it("non accetta un orario già passato o troppo vicino", async () => {
    const { ctx } = await banco({ adesso: new Date("2026-10-28T19:10:00Z") }); // 20:10 a Roma
    const v = await eseguiStrumento("verifica_disponibilita", ctx, { data: "oggi", ora: "20:30", persone: 2 });
    expect(v).toMatchObject({ disponibile: false, motivo: "troppo_presto" });
    const passato = await eseguiStrumento("verifica_disponibilita", ctx, { data: "oggi", ora: "19:30", persone: 2 });
    expect(passato).toMatchObject({ disponibile: false, motivo: "passato" });
  });
});

describe("scenario 9: il cliente chiede di parlare con una persona", () => {
  it("passa la chiamata solo quando il locale è aperto", async () => {
    const aperto = await banco({ adesso: new Date("2026-10-28T19:30:00Z") }); // mercoledì 20:30
    const t = await eseguiStrumento("trasferisci_chiamata", aperto.ctx, { motivo: "vuole parlare con la titolare" });
    expect(t).toMatchObject({ ok: true, consentito: true, numero: "+393330000002" });

    const chiuso = await banco({ adesso: new Date("2026-11-02T19:30:00Z") }); // lunedì
    const n = await eseguiStrumento("trasferisci_chiamata", chiuso.ctx, {});
    expect(n).toMatchObject({ ok: true, consentito: false });
  });

  it("lascia un messaggio al titolare entro un minuto", async () => {
    const { ctx, messaggero, archivio } = await banco();
    const m = await eseguiStrumento("lascia_messaggio_al_titolare", ctx, { testo: "Vorrei organizzare una cena aziendale", nome: "Giulia", urgenza: "alta" });
    expect(m.ok).toBe(true);
    expect(messaggero.inviati).toHaveLength(1);
    expect(messaggero.inviati[0]).toMatchObject({ a: "+393330000002", tipo: "avviso_titolare" });
    expect(messaggero.inviati[0].testo).toContain("URGENTE");
    expect(messaggero.inviati[0].inviatoIl).toBe(ctx.adesso.toISOString());
    expect(await archivio.segnalazioni(ctx.config.id)).toHaveLength(1);
  });

  it("non trasferisce se il locale non lo ha attivato", async () => {
    const config = { ...configTrattoria(), assistente: { ...configTrattoria().assistente, trasferimento: false } };
    const { ctx } = await banco({ config, adesso: new Date("2026-10-28T19:30:00Z") });
    expect(await eseguiStrumento("trasferisci_chiamata", ctx, {})).toMatchObject({ consentito: false });
  });
});

describe("scenario 10: chiamata interrotta o dati incompleti", () => {
  it("non salva nulla con dati mancanti e chiede il dato giusto", async () => {
    const { ctx, archivio } = await banco({ telefonoChiamante: null });
    const senzaNome = await eseguiStrumento("crea_prenotazione", ctx, { data: SABATO, ora: "20:00", persone: 2, telefono: "3471234567" });
    expect(senzaNome).toMatchObject({ ok: false, campo: "nome" });
    const senzaTelefono = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Rossi", data: SABATO, ora: "20:00", persone: 2 });
    expect(senzaTelefono).toMatchObject({ ok: false, campo: "telefono" });
    const senzaPersone = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Rossi", telefono: "3471234567", data: SABATO, ora: "20:00" });
    expect(senzaPersone).toMatchObject({ ok: false, campo: "persone" });
    const dataStrana = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Rossi", telefono: "3471234567", data: "il giorno del mio compleanno", ora: "20:00", persone: 2 });
    expect(dataStrana).toMatchObject({ ok: false, campo: "data" });
    const troppi = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Rossi", telefono: "3471234567", data: SABATO, ora: "20:00", persone: 400 });
    expect(troppi).toMatchObject({ ok: false, campo: "persone" });
    expect(await archivio.prenotazioniAttive(ctx.config.id, SABATO)).toHaveLength(0);
    expect(archivio.registro.every((r) => r.ok === false)).toBe(true);
  });

  it("normalizza il numero detto a voce", async () => {
    const { ctx, archivio } = await banco({ telefonoChiamante: null });
    const c = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Rossi", telefono: "347 123 4567", data: SABATO, ora: "20:00", persone: 2 });
    expect(c.confermata).toBe(true);
    expect((await archivio.prenotazioniAttive(ctx.config.id, SABATO))[0].telefono).toBe("+393471234567");
  });
});
