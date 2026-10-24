import trattoria from "../locali/demo-trattoria.json";
import pizzeria from "../locali/demo-pizzeria.json";
import { ArchivioMemoria } from "../src/adattatori/archivio-memoria.ts";
import type { ContestoStrumenti } from "../src/assistente/strumenti.ts";
import { leggiConfigurazione, type ConfigurazioneLocale } from "../src/core/configurazione.ts";
import { MessaggeroMemoria } from "../src/core/messaggero.ts";

export const configTrattoria = () => leggiConfigurazione(trattoria);
export const configPizzeria = () => leggiConfigurazione(pizzeria);

/** mercoledì 28 ottobre 2026, 10:00 a Roma (ora solare) */
export const MERCOLEDI_MATTINA = new Date("2026-10-28T09:00:00Z");

export interface Banco {
  ctx: ContestoStrumenti;
  archivio: ArchivioMemoria;
  messaggero: MessaggeroMemoria;
  config: ConfigurazioneLocale;
  orologio: { adesso: Date };
}

export async function banco(
  opzioni: { adesso?: Date; config?: ConfigurazioneLocale; telefonoChiamante?: string | null } = {},
): Promise<Banco> {
  const orologio = { adesso: opzioni.adesso ?? MERCOLEDI_MATTINA };
  const archivio = new ArchivioMemoria(() => orologio.adesso);
  const messaggero = new MessaggeroMemoria(() => orologio.adesso);
  const config = opzioni.config ?? configTrattoria();
  await archivio.salvaConfigurazione(config);
  const ctx: ContestoStrumenti = {
    archivio,
    messaggero,
    config,
    get adesso() {
      return orologio.adesso;
    },
    urlBase: "https://prenota.esempio.invalid",
    idConversazione: "conv_test",
    telefonoChiamante: opzioni.telefonoChiamante === undefined ? "+393471234567" : opzioni.telefonoChiamante,
    canale: "telefono",
  };
  return { ctx, archivio, messaggero, config, orologio };
}
