import { describe, expect, it } from "vitest";
import { ArchivioMemoria } from "../src/adattatori/archivio-memoria.ts";
import { annulla, decidi, proponi } from "../src/rapporti/miglioramento.ts";
import { istruzioniAssistente } from "../src/assistente/prompt.ts";
import { configTrattoria, MERCOLEDI_MATTINA } from "./aiuto.ts";

async function preparato() {
  const archivio = new ArchivioMemoria(() => MERCOLEDI_MATTINA);
  const config = configTrattoria();
  await archivio.salvaConfigurazione(config);
  return { archivio, config };
}

describe("ciclo di miglioramento", () => {
  it("il fondatore non può approvare da solo una regola del locale", async () => {
    const { archivio, config } = await preparato();
    const m = await proponi(archivio, config, {
      tipo: "regola_prenotazione",
      descrizione: "Gruppi fino a 10 senza titolare",
      dati: { campo: "maxPersoneSenzaTitolare", valore: 10 },
      motivo: "molti gruppi da 9-10",
      origine: "analisi_settimanale",
    });
    expect(m.richiedeTitolare).toBe(true);
    const e = await decidi(archivio, config.id, m.numero, "ok", "fondatore", MERCOLEDI_MATTINA);
    expect(e.ok).toBe(false);
    const t = await decidi(archivio, config.id, m.numero, "ok", "titolare", MERCOLEDI_MATTINA);
    expect(t).toMatchObject({ ok: true, stato: "applicata" });
    expect((await archivio.configurazione(config.id))?.prenotazioni.maxPersoneSenzaTitolare).toBe(10);
  });

  it("registra lo stato precedente e permette di tornare indietro", async () => {
    const { archivio, config } = await preparato();
    const m = await proponi(archivio, config, {
      tipo: "istruzione_assistente",
      descrizione: "Dire che il venerdì c'è il pesce fresco",
      dati: { testo: "Il venerdì c'è il pesce fresco: dillo a chi chiede il menu del venerdì." },
      motivo: "domanda frequente",
      origine: "fondatore",
    });
    await decidi(archivio, config.id, m.numero, "ok", "titolare", MERCOLEDI_MATTINA);
    const dopo = (await archivio.configurazione(config.id))!;
    expect(istruzioniAssistente(dopo)).toContain("REGOLE APPROVATE DAL TITOLARE");
    expect(istruzioniAssistente(dopo)).toContain("pesce fresco");

    const r = await annulla(archivio, config.id, m.numero, MERCOLEDI_MATTINA);
    expect(r.ok).toBe(true);
    expect((await archivio.configurazione(config.id))?.assistente.istruzioniAggiuntive).toEqual([]);
    expect((await archivio.modificaPerNumero(config.id, m.numero))?.stato).toBe("annullata");
  });

  it("non annulla una modifica se dopo ne è stata applicata un'altra sulla stessa sezione", async () => {
    const { archivio, config } = await preparato();
    const base = { tipo: "faq" as const, motivo: "prova", origine: "fondatore" as const };
    const a = await proponi(archivio, config, { ...base, descrizione: "A", dati: { tema: "altro", domanda: "A?", risposta: "a" } });
    const b = await proponi(archivio, (await archivio.configurazione(config.id))!, { ...base, descrizione: "B", dati: { tema: "altro", domanda: "B?", risposta: "b" } });
    await decidi(archivio, config.id, a.numero, "ok", "fondatore", MERCOLEDI_MATTINA);
    await decidi(archivio, config.id, b.numero, "ok", "fondatore", MERCOLEDI_MATTINA);
    expect((await annulla(archivio, config.id, a.numero, MERCOLEDI_MATTINA)).ok).toBe(false);
    expect((await annulla(archivio, config.id, b.numero, MERCOLEDI_MATTINA)).ok).toBe(true);
    expect((await annulla(archivio, config.id, a.numero, MERCOLEDI_MATTINA)).ok).toBe(true);
  });

  it("scarta subito le proposte impossibili", async () => {
    const { archivio, config } = await preparato();
    await expect(
      proponi(archivio, config, { tipo: "chiusura_aggiungi", descrizione: "x", dati: { dal: "2026-13-01" }, motivo: "x", origine: "fondatore" }),
    ).rejects.toThrow();
  });
});

describe("istruzioni dell'assistente", () => {
  it("contengono la dichiarazione di sistema automatico e le regole sulle allergie", () => {
    const t = istruzioniAssistente(configTrattoria());
    expect(t).toContain("DICHIARAZIONE OBBLIGATORIA");
    expect(t).toContain("sistema automatico");
    expect(t).toContain("Per allergie e intolleranze la cosa migliore è confermare con il personale");
    expect(t).toContain("oltre 8 persone");
    expect(t).toContain("lunedì: chiuso");
  });
});
