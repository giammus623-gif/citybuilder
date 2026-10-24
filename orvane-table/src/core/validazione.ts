// Controlli sui dati che arrivano dall'assistente vocale o dal sito.
// I messaggi d'errore sono frasi che l'assistente può ripetere al cliente.

export class DatoNonValido extends Error {
  constructor(
    readonly campo: string,
    messaggio: string,
  ) {
    super(messaggio);
  }
}

/** Telefono in formato +39...; accetta spazi, trattini, 0039 e numeri italiani senza prefisso. */
export function normalizzaTelefono(grezzo: unknown): string {
  if (typeof grezzo !== "string" || !grezzo.trim()) {
    throw new DatoNonValido("telefono", "Mi serve un numero di telefono per la conferma.");
  }
  let t = grezzo.replace(/[\s().\-/]/g, "");
  if (t.startsWith("00")) t = `+${t.slice(2)}`;
  if (!t.startsWith("+")) {
    if (/^[03]\d{5,10}$/.test(t)) t = `+39${t}`;
    else throw new DatoNonValido("telefono", "Il numero di telefono non sembra corretto: me lo può ripetere?");
  }
  if (!/^\+\d{8,15}$/.test(t)) {
    throw new DatoNonValido("telefono", "Il numero di telefono non sembra corretto: me lo può ripetere?");
  }
  return t;
}

export function telefonoOpzionale(grezzo: unknown): string | null {
  if (grezzo === undefined || grezzo === null || grezzo === "") return null;
  try {
    return normalizzaTelefono(grezzo);
  } catch {
    return null;
  }
}

export function nomePersona(grezzo: unknown): string {
  if (typeof grezzo !== "string") throw new DatoNonValido("nome", "A che nome registro la prenotazione?");
  const n = grezzo.trim().replace(/\s+/g, " ");
  if (n.length < 2 || n.length > 80 || !/\p{L}/u.test(n)) {
    throw new DatoNonValido("nome", "A che nome registro la prenotazione?");
  }
  return n;
}

export function testoBreve(grezzo: unknown, campo: string, massimo = 500): string | null {
  if (grezzo === undefined || grezzo === null) return null;
  if (typeof grezzo !== "string") throw new DatoNonValido(campo, `Il campo ${campo} non è un testo.`);
  const t = grezzo.trim();
  if (!t) return null;
  if (t.length > massimo) throw new DatoNonValido(campo, `Il testo è troppo lungo (massimo ${massimo} caratteri).`);
  return t;
}

export function interoPositivo(grezzo: unknown, campo: string, messaggio: string): number {
  const n = typeof grezzo === "string" ? Number(grezzo.trim()) : grezzo;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1) throw new DatoNonValido(campo, messaggio);
  return n;
}

export function comeOggetto(grezzo: unknown): Record<string, unknown> {
  if (grezzo && typeof grezzo === "object" && !Array.isArray(grezzo)) return grezzo as Record<string, unknown>;
  return {};
}

/** Toglie numeri di telefono ed email da un testo prima di mandarlo a un modello linguistico. */
export function anonimizza(testo: string, nomiNoti: string[] = []): string {
  let t = testo
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[EMAIL]")
    .replace(/(?:\+|00)?\d[\d\s.-]{6,}\d/g, "[TELEFONO]");
  for (const nome of nomiNoti.filter((n) => n.length >= 3)) {
    t = t.replace(new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[NOME]");
  }
  return t;
}
