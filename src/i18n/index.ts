import { it } from './it';
import { en } from './en';

export type Dict = Record<string, string>;
export type Locale = 'it' | 'en' | 'es' | 'de' | 'fr' | 'pt';

// Spanish, German, French and Portuguese fall back to Italian until translated.
const DICTS: Partial<Record<Locale, Dict>> = { it, en };
let current: Locale = 'it';

export function setLocale(l: Locale): void {
  current = l;
}

export function getLocale(): Locale {
  return current;
}

/** Translate a key, filling {placeholders} from params. Missing keys fall back to Italian. */
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = DICTS[current]?.[key] ?? it[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    return typeof v === 'number' ? fmtNum(v) : (v ?? '');
  });
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat(current === 'en' ? 'en-GB' : 'it-IT').format(Math.round(n));
}

export function fmtMoney(n: number): string {
  return `${n < 0 ? '−' : ''}₵ ${fmtNum(Math.abs(n))}`;
}
