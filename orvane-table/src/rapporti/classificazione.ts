// Classificazione di ogni conversazione (Parte 5B.2): risolta, passata a una
// persona, fallita, cliente insoddisfatto. Si basa sul registro degli
// strumenti chiamati, non su cosa dice la piattaforma vocale: così vale
// anche se si cambia fornitore.

import type { ChiamataConclusa } from "../assistente/elevenlabs.ts";
import type { Conversazione, VoceRegistro } from "../core/tipi.ts";

const azioniRiuscite = (r: VoceRegistro) => {
  const risposta = (r.risposta ?? {}) as Record<string, unknown>;
  if (!r.ok) return false;
  switch (r.strumento) {
    case "crea_prenotazione":
      return risposta.confermata === true;
    case "modifica_prenotazione":
      return risposta.modificata === true;
    case "annulla_prenotazione":
      return risposta.annullata === true;
    case "leggi_informazioni":
      return risposta.trovato === true;
    default:
      return false;
  }
};

const passaggiAPersona = (r: VoceRegistro) => {
  const risposta = (r.risposta ?? {}) as Record<string, unknown>;
  return (
    r.strumento === "lascia_messaggio_al_titolare" ||
    (r.strumento === "trasferisci_chiamata" && risposta.consentito === true) ||
    risposta.da_confermare === true ||
    risposta.richiede_titolare === true
  );
};

export function classifica(chiamata: Pick<ChiamataConclusa, "durataSecondi" | "esitoPiattaforma" | "clienteSoddisfatto">, registro: VoceRegistro[]): NonNullable<Conversazione["esito"]> {
  const temi = [
    ...new Set(
      registro.map((r) =>
        r.strumento === "leggi_informazioni" ? `info:${String((r.ingresso as Record<string, unknown>)?.tema ?? "altro")}` : r.strumento,
      ),
    ),
  ];
  const domandeSenzaRisposta = registro
    .filter((r) => r.strumento === "leggi_informazioni" && (r.risposta as Record<string, unknown>)?.trovato === false)
    .map((r) => {
      const i = r.ingresso as Record<string, unknown>;
      return String(i?.domanda ?? i?.tema ?? "domanda non registrata");
    });

  let esito: NonNullable<Conversazione["esito"]>["esito"];
  if (chiamata.clienteSoddisfatto === false) esito = "insoddisfatto";
  else if (registro.some(passaggiAPersona)) esito = "passata_a_persona";
  // una prenotazione riuscita resta "risolta" anche con una domanda senza risposta,
  // che comunque finisce nell'elenco da correggere
  else if (registro.some((r) => azioniRiuscite(r) && r.strumento !== "leggi_informazioni")) esito = "risolta";
  else if (domandeSenzaRisposta.length > 0 || registro.some((r) => !r.ok)) esito = "fallita";
  else if (registro.some(azioniRiuscite)) esito = "risolta";
  else if (chiamata.esitoPiattaforma === "success" && chiamata.durataSecondi >= 20) esito = "risolta";
  else esito = "fallita"; // chiamata interrotta o senza nessuna azione utile

  return { esito, temi, domandeSenzaRisposta, classificatoDa: "sistema" };
}
