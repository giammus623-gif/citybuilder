import { describe, expect, it } from "vitest";
import {
  aggiungiGiorni,
  dataInParole,
  giornoSettimana,
  interpretaData,
  interpretaOra,
  istanteLocale,
} from "../src/core/tempo.ts";

describe("tempo", () => {
  it("calcola giorno della settimana e date in parole", () => {
    expect(giornoSettimana("2026-10-24")).toBe("sab");
    expect(giornoSettimana("2026-10-26")).toBe("lun");
    expect(dataInParole("2026-10-31")).toBe("sabato 31 ottobre");
    expect(aggiungiGiorni("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("converte l'istante nel fuso di Roma, anche con il cambio dell'ora", () => {
    // 25 ottobre 2026: fine dell'ora legale
    expect(istanteLocale(new Date("2026-10-24T18:30:00Z"), "Europe/Rome")).toMatchObject({ data: "2026-10-24", minuti: 20 * 60 + 30 });
    expect(istanteLocale(new Date("2026-10-28T18:30:00Z"), "Europe/Rome")).toMatchObject({ data: "2026-10-28", minuti: 19 * 60 + 30 });
    expect(istanteLocale(new Date("2026-10-28T23:30:00Z"), "Europe/Rome")).toMatchObject({ data: "2026-10-29", giorno: "gio" });
  });

  it("interpreta le date dette al telefono", () => {
    const oggi = "2026-10-28"; // mercoledì
    expect(interpretaData("domani", oggi)).toBe("2026-10-29");
    expect(interpretaData("sabato", oggi)).toBe("2026-10-31");
    expect(interpretaData("mercoledì", oggi)).toBe("2026-10-28");
    expect(interpretaData("mercoledì prossimo", oggi)).toBe("2026-11-04");
    expect(interpretaData("7/11", oggi)).toBe("2026-11-07");
    expect(interpretaData("3/1", oggi)).toBe("2027-01-03");
    expect(interpretaData("31/02", oggi)).toBeNull();
    expect(interpretaData("boh", oggi)).toBeNull();
  });

  it("interpreta gli orari", () => {
    expect(interpretaOra("20:30")).toBe(1230);
    expect(interpretaOra("20.30")).toBe(1230);
    expect(interpretaOra("alle 21")).toBe(1260);
    expect(interpretaOra("25:00")).toBeNull();
  });
});
