// Date e orari nel fuso del locale. Le date sono stringhe "AAAA-MM-GG",
// gli orari "HH:MM": niente oggetti Date per i giorni, così non ci sono
// sorprese con l'ora legale.

export const GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;
export type Giorno = (typeof GIORNI)[number];

const NOMI_GIORNI: Record<Giorno, string> = {
  lun: "lunedì",
  mar: "martedì",
  mer: "mercoledì",
  gio: "giovedì",
  ven: "venerdì",
  sab: "sabato",
  dom: "domenica",
};

const NOMI_MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_ORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function dataValida(data: string): boolean {
  const m = RE_DATA.exec(data);
  if (!m) return false;
  const [a, me, g] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(a, me - 1, g));
  return d.getUTCFullYear() === a && d.getUTCMonth() === me - 1 && d.getUTCDate() === g;
}

export function oraValida(ora: string): boolean {
  return RE_ORA.test(ora);
}

export function minutiDa(ora: string): number {
  const [h, m] = ora.split(":").map(Number);
  return h * 60 + m;
}

export function oraDa(minuti: number): string {
  const m = ((minuti % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function utc(data: string): Date {
  const [a, m, g] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, g));
}

export function aggiungiGiorni(data: string, giorni: number): string {
  const d = utc(data);
  d.setUTCDate(d.getUTCDate() + giorni);
  return d.toISOString().slice(0, 10);
}

export function differenzaGiorni(da: string, a: string): number {
  return Math.round((utc(a).getTime() - utc(da).getTime()) / 86_400_000);
}

export function giornoSettimana(data: string): Giorno {
  // getUTCDay: 0 = domenica
  return GIORNI[(utc(data).getUTCDay() + 6) % 7];
}

export function dataInParole(data: string): string {
  const d = utc(data);
  return `${NOMI_GIORNI[giornoSettimana(data)]} ${d.getUTCDate()} ${NOMI_MESI[d.getUTCMonth()]}`;
}

export function dataBreve(data: string): string {
  const d = utc(data);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface Istante {
  data: string;
  minuti: number;
  giorno: Giorno;
}

/** Data, minuti dalla mezzanotte e giorno della settimana di `istante` nel fuso indicato. */
export function istanteLocale(istante: Date, fuso: string): Istante {
  const parti = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(istante);
  const v = (t: string) => parti.find((p) => p.type === t)?.value ?? "00";
  const data = `${v("year")}-${v("month")}-${v("day")}`;
  return { data, minuti: Number(v("hour")) * 60 + Number(v("minute")), giorno: giornoSettimana(data) };
}

const PAROLE_GIORNI: Record<string, Giorno> = {
  lunedi: "lun",
  lunedì: "lun",
  martedi: "mar",
  martedì: "mar",
  mercoledi: "mer",
  mercoledì: "mer",
  giovedi: "gio",
  giovedì: "gio",
  venerdi: "ven",
  venerdì: "ven",
  sabato: "sab",
  domenica: "dom",
};

/**
 * Interpreta una data detta al telefono: "2026-11-07", "7/11", "07/11/2026",
 * "oggi", "domani", "dopodomani", "sabato", "sabato prossimo".
 * Il giorno della settimana indica il primo giorno con quel nome a partire da oggi.
 * Restituisce null se la frase non è una data riconoscibile.
 */
export function interpretaData(testo: string, oggi: string): string | null {
  const t = testo.trim().toLowerCase().replace(/\s+/g, " ");
  if (dataValida(t)) return t;
  if (t === "oggi" || t === "stasera") return oggi;
  if (t === "domani" || t === "domani sera") return aggiungiGiorni(oggi, 1);
  if (t === "dopodomani") return aggiungiGiorni(oggi, 2);

  const slash = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/.exec(t);
  if (slash) {
    const g = Number(slash[1]);
    const m = Number(slash[2]);
    let a = slash[3] ? Number(slash[3]) : Number(oggi.slice(0, 4));
    if (a < 100) a += 2000;
    let data = `${a}-${String(m).padStart(2, "0")}-${String(g).padStart(2, "0")}`;
    if (!dataValida(data)) return null;
    // "7/1" detto a dicembre vuol dire gennaio dell'anno dopo
    if (!slash[3] && data < oggi) data = `${a + 1}${data.slice(4)}`;
    return dataValida(data) ? data : null;
  }

  const parole = t.replace(/^(il |la |questo |questa )/, "").split(" ");
  const giorno = PAROLE_GIORNI[parole[0]];
  if (giorno) {
    const prossimo = parole[1] === "prossimo" || parole[1] === "prossima";
    let data = oggi;
    for (let i = 0; i < 7 && giornoSettimana(data) !== giorno; i++) data = aggiungiGiorni(data, 1);
    if (prossimo && data === oggi) data = aggiungiGiorni(data, 7);
    return data;
  }
  return null;
}

/**
 * Interpreta un orario: "20:30", "20.30", "20", "8 e mezza" non è gestito.
 * Restituisce i minuti, oppure null. Un'ora sotto le 12 resta tale: la scelta
 * tra 8:00 e 20:00 la fa chi conosce gli orari del locale (vedi disponibilita.ts).
 */
export function interpretaOra(testo: string): number | null {
  const t = testo.trim().toLowerCase().replace(/^alle /, "");
  const m = /^(\d{1,2})(?:[:.](\d{2}))?$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** L'istante UTC che corrisponde a `data` alle `minuti` nel fuso indicato. */
export function istanteDaLocale(data: string, minuti: number, fuso: string): Date {
  const [a, m, g] = data.split("-").map(Number);
  const voluto = Date.UTC(a, m - 1, g, Math.floor(minuti / 60), minuti % 60);
  let stima = voluto;
  // due passaggi bastano anche nei giorni del cambio d'ora
  for (let i = 0; i < 2; i++) {
    const l = istanteLocale(new Date(stima), fuso);
    const [la, lm, lg] = l.data.split("-").map(Number);
    const visto = Date.UTC(la, lm - 1, lg, Math.floor(l.minuti / 60), l.minuti % 60);
    stima += voluto - visto;
  }
  return new Date(stima);
}

/** Lunedì della settimana che contiene `data`. */
export function lunediDellaSettimana(data: string): string {
  return aggiungiGiorni(data, -GIORNI.indexOf(giornoSettimana(data)));
}
