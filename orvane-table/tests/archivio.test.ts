// Le due implementazioni dell'archivio devono comportarsi allo stesso modo.
// Lo schema SQL vero (supabase/migrations) gira su PGlite, Postgres in WebAssembly.

import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { ArchivioMemoria } from "../src/adattatori/archivio-memoria.ts";
import { ArchivioPostgres, sqlDaPglite } from "../src/adattatori/archivio-postgres.ts";
import { eseguiStrumento, type ContestoStrumenti } from "../src/assistente/strumenti.ts";
import type { Archivio } from "../src/core/archivio.ts";
import { MessaggeroMemoria } from "../src/core/messaggero.ts";
import { configPizzeria, configTrattoria, MERCOLEDI_MATTINA } from "./aiuto.ts";

const SCHEMA = readFileSync(new URL("../supabase/migrations/20261026000000_schema.sql", import.meta.url), "utf8");

/** Ruoli e auth.uid() come su Supabase, il minimo per far girare lo schema. */
const PREPARAZIONE_SUPABASE = `
  create role authenticated nologin;
  create role anon nologin;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to authenticated;
  grant usage on schema public to authenticated;
`;

async function pglite() {
  const db = new PGlite();
  await db.exec(PREPARAZIONE_SUPABASE);
  await db.exec(SCHEMA);
  return db;
}

const archivi: [string, () => Promise<Archivio>][] = [
  ["memoria", async () => new ArchivioMemoria(() => MERCOLEDI_MATTINA)],
  ["postgres", async () => new ArchivioPostgres(sqlDaPglite(await pglite()))],
];

function contesto(archivio: Archivio, config = configTrattoria()): ContestoStrumenti {
  return {
    archivio,
    messaggero: new MessaggeroMemoria(),
    config,
    adesso: MERCOLEDI_MATTINA,
    urlBase: "https://prenota.esempio.invalid",
    idConversazione: "conv_a",
    telefonoChiamante: "+393471234567",
  };
}

describe.each(archivi)("archivio %s", (_nome, crea) => {
  it("salva e rilegge la configurazione senza perdere nulla", async () => {
    const archivio = await crea();
    for (const config of [configTrattoria(), configPizzeria()]) {
      await archivio.salvaConfigurazione(config);
      expect(await archivio.configurazione(config.id)).toEqual(config);
      expect(await archivio.configurazionePerSlug(config.slug)).toEqual(config);
    }
    expect(await archivio.configurazionePerSlug("non-esiste")).toBeNull();
  });

  it("prenota, modifica, annulla e tiene separati i locali", async () => {
    const archivio = await crea();
    const trattoria = configTrattoria();
    const pizzeria = configPizzeria();
    await archivio.salvaConfigurazione(trattoria);
    await archivio.salvaConfigurazione(pizzeria);
    const ctx = contesto(archivio, trattoria);
    const c = await eseguiStrumento("crea_prenotazione", ctx, { nome: "Mario Rossi", data: "sabato", ora: "20:30", persone: 2, note: "seggiolone" });
    expect(c.confermata).toBe(true);
    await eseguiStrumento("crea_prenotazione", contesto(archivio, pizzeria), { nome: "Mario Rossi", data: "sabato", ora: "20:30", persone: 4 });

    const [p] = await archivio.prenotazioniAttive(trattoria.id, "2026-10-31");
    expect(p).toMatchObject({ nome: "Mario Rossi", telefono: "+393471234567", data: "2026-10-31", ora: "20:30", persone: 2, note: "seggiolone", canale: "telefono" });
    expect(await archivio.prenotazionePerToken(p.tokenGestione)).toEqual(p);
    expect(await archivio.prenotazionePerCodice(trattoria.id, p.codice)).toEqual(p);
    expect((await archivio.codiciAttivi(trattoria.id)).has(p.codice)).toBe(true);
    expect(await archivio.prenotazioniAttive(pizzeria.id, "2026-10-31")).toHaveLength(1);

    const m = await eseguiStrumento("modifica_prenotazione", ctx, { codice: p.codice, nuova_ora: "21:00", nuove_persone: 3 });
    expect(m.modificata).toBe(true);
    expect((await archivio.prenotazione(trattoria.id, p.id))).toMatchObject({ ora: "21:00", persone: 3 });

    const a = await eseguiStrumento("annulla_prenotazione", ctx, { codice: p.codice });
    expect(a.annullata).toBe(true);
    expect(await archivio.prenotazioniAttive(trattoria.id, "2026-10-31")).toHaveLength(0);
    expect(await archivio.prenotazioniAttive(pizzeria.id, "2026-10-31")).toHaveLength(1);
    expect(await archivio.prenotazioniPerTelefono(trattoria.id, "+393471234567", "2026-10-01")).toHaveLength(1);
  });

  it("non va in overbooking con richieste contemporanee", async () => {
    const archivio = await crea();
    const config = configTrattoria();
    await archivio.salvaConfigurazione(config);
    const esiti = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        eseguiStrumento("crea_prenotazione", { ...contesto(archivio, config), telefonoChiamante: `+39347000${String(i).padStart(4, "0")}` }, {
          nome: `Ospite ${i}`,
          data: "2026-10-31",
          ora: "21:00",
          persone: 7,
        }),
      ),
    );
    expect(esiti.filter((e) => e.confermata).length).toBe(7); // 7 x 7 = 49 su 50
  });

  it("salva conversazioni con esito, segnalazioni, modifiche e registro", async () => {
    const archivio = await crea();
    const config = configTrattoria();
    await archivio.salvaConfigurazione(config);
    await eseguiStrumento("leggi_informazioni", contesto(archivio, config), { tema: "altro", domanda: "Avete il wifi?" });
    expect(await archivio.registroConversazione(config.id, "conv_a")).toMatchObject([{ strumento: "leggi_informazioni", ok: true }]);
    const [s] = await archivio.segnalazioni(config.id, { stato: "aperta" });
    expect(s).toMatchObject({ tipo: "domanda_senza_risposta", testo: "Avete il wifi?" });
    await archivio.chiudiSegnalazione(config.id, s.id, MERCOLEDI_MATTINA.toISOString());
    expect(await archivio.segnalazioni(config.id, { stato: "aperta" })).toHaveLength(0);

    const conv = {
      localeId: config.id,
      idEsterno: "conv_a",
      canale: "telefono" as const,
      iniziataIl: "2026-10-28T09:00:00.000Z",
      durataSecondi: 42,
      telefonoChiamante: "+393471234567",
      trascrizione: [{ ruolo: "cliente" as const, testo: "Avete il wifi?", secondo: 3 }],
      riassunto: "domanda sul wifi",
      scadeIl: "2026-12-27T09:00:00.000Z",
      esito: { esito: "fallita" as const, temi: ["info:altro"], domandeSenzaRisposta: ["Avete il wifi?"], classificatoDa: "sistema" as const },
    };
    await archivio.salvaConversazione(conv);
    await archivio.salvaConversazione({ ...conv, durataSecondi: 43 }); // stesso id esterno: aggiorna
    const salvate = await archivio.conversazioni(config.id, { da: "2026-10-26T00:00:00Z", a: "2026-11-02T00:00:00Z" });
    expect(salvate).toHaveLength(1);
    expect(salvate[0]).toMatchObject({ ...conv, durataSecondi: 43 });

    const m1 = await archivio.creaModifica({ localeId: config.id, tipo: "faq", descrizione: "wifi", dati: { tema: "altro" }, motivo: "x", origine: "analisi_settimanale", richiedeTitolare: false });
    const m2 = await archivio.creaModifica({ localeId: config.id, tipo: "faq", descrizione: "wifi 2", dati: {}, motivo: "x", origine: "fondatore", richiedeTitolare: false });
    expect([m1.numero, m2.numero]).toEqual([1, 2]);
    await archivio.aggiornaModifica(config.id, m1.id, { stato: "applicata", decisaIl: "2026-10-28T10:00:00.000Z", decisaDa: "titolare", statoPrecedente: { sezione: "domandeFrequenti", valore: [] } });
    expect(await archivio.modificaPerNumero(config.id, 1)).toMatchObject({ stato: "applicata", decisaDa: "titolare", statoPrecedente: { sezione: "domandeFrequenti" } });
    expect(await archivio.modifiche(config.id, "proposta")).toHaveLength(1);
  });

  it("esporta tutto e cancella i dati scaduti", async () => {
    const archivio = await crea();
    const config = configTrattoria();
    await archivio.salvaConfigurazione(config);
    await eseguiStrumento("crea_prenotazione", contesto(archivio, config), {
      nome: "Anna Verdi", data: "2026-10-31", ora: "13:00", persone: 2, note_salute: "celiachia", consenso_note_salute: true,
    });
    await archivio.salvaConversazione({
      localeId: config.id, idEsterno: "conv_vecchia", canale: "telefono", iniziataIl: "2026-08-01T10:00:00.000Z", durataSecondi: 30,
      telefonoChiamante: "+393471234567", trascrizione: [{ ruolo: "cliente", testo: "ciao" }], riassunto: "x", scadeIl: "2026-09-30T10:00:00.000Z",
      esito: { esito: "risolta", temi: [], domandeSenzaRisposta: [], classificatoDa: "sistema" },
    });
    const dati = await archivio.esporta(config.id);
    expect(dati).toMatchObject({ formato: "orvane-table/esportazione@1" });
    expect((dati.prenotazioni as unknown[]).length).toBe(1);
    expect((dati.conversazioni as unknown[]).length).toBe(1);
    expect(dati.configurazione).toEqual(config);

    const r = await archivio.pulisciScaduti("2026-11-02T10:00:00.000Z", "2026-11-02");
    expect(r).toMatchObject({ trascrizioni: 1, noteSalute: 1 });
    const [c] = await archivio.conversazioni(config.id, { da: "2026-07-01T00:00:00Z", a: "2026-12-01T00:00:00Z" });
    expect(c).toMatchObject({ trascrizione: null, telefonoChiamante: null, riassunto: null, esito: { esito: "risolta" } });
  });
});

describe("regole di accesso a livello di riga", () => {
  it("un utente vede e scrive solo i dati del proprio locale", async () => {
    const db = await pglite();
    const archivio = new ArchivioPostgres(sqlDaPglite(db));
    const a = configTrattoria();
    const b = configPizzeria();
    await archivio.salvaConfigurazione(a);
    await archivio.salvaConfigurazione(b);
    for (const config of [a, b]) {
      await eseguiStrumento("crea_prenotazione", contesto(archivio, config), { nome: "Cliente", data: "2026-10-31", ora: "20:30", persone: 2 });
    }
    const utente = "7d0c4bd5-3a39-4d3c-9a0e-2b1f0e0a0001";
    await db.query(`insert into public.utenti (locale_id, auth_user_id, nome, ruolo) values ($1, $2, 'Rina', 'titolare')`, [a.id, utente]);

    const comeUtente = <T>(fn: (tx: any) => Promise<T>) =>
      db.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [utente]);
        await tx.exec("set local role authenticated");
        return fn(tx);
      });

    const viste = await comeUtente((tx) => tx.query(`select locale_id::text as l from public.prenotazioni`));
    expect((viste as any).rows).toEqual([{ l: a.id }]);
    const locali = await comeUtente((tx) => tx.query(`select slug from public.locali`));
    expect((locali as any).rows).toEqual([{ slug: "demo-trattoria" }]);
    await expect(
      comeUtente((tx) => tx.query(`insert into public.domande_frequenti (locale_id, tema, domanda, risposta) values ($1, 'altro', 'x', 'y')`, [b.id])),
    ).rejects.toThrow(/row-level security/);
    await expect(comeUtente((tx) => tx.query(`delete from public.registro_strumenti`))).rejects.toThrow();
    const export_ = await comeUtente((tx) => tx.query(`select public.esporta_locale($1) -> 'prenotazioni' as p`, [b.id]));
    expect((export_ as any).rows[0].p).toEqual([]);

    // senza utente collegato non si vede nulla
    const anonimo = await db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      return tx.query(`select count(*)::int as n from public.prenotazioni`);
    });
    expect((anonimo as any).rows[0].n).toBe(0);
  });

  it("rifiuta note sanitarie senza consenso anche a livello di database", async () => {
    const db = await pglite();
    const archivio = new ArchivioPostgres(sqlDaPglite(db));
    const a = configTrattoria();
    await archivio.salvaConfigurazione(a);
    await eseguiStrumento("crea_prenotazione", contesto(archivio, a), { nome: "Cliente", data: "2026-10-31", ora: "20:30", persone: 2 });
    await expect(db.query(`update public.prenotazioni set note_salute = 'celiachia'`)).rejects.toThrow(/check constraint/);
  });
});
