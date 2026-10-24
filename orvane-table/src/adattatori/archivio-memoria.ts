// Archivio in memoria: per la demo con dati finti e per i test.
// Le operazioni "se disponibile" non contengono await tra lettura e scrittura,
// quindi sono atomiche anche con richieste concorrenti.

import type { Archivio, FiltroPeriodo } from "../core/archivio.ts";
import type { ConfigurazioneLocale } from "../core/configurazione.ts";
import type {
  Conversazione,
  ModificaProposta,
  NuovaPrenotazione,
  Prenotazione,
  Segnalazione,
  VoceRegistro,
} from "../core/tipi.ts";

const attiva = (p: Prenotazione) => p.stato === "confermata" || p.stato === "da_confermare";
const copia = <T>(v: T): T => structuredClone(v);

export class ArchivioMemoria implements Archivio {
  private configurazioni = new Map<string, ConfigurazioneLocale>();
  private prenotazioniTutte: Prenotazione[] = [];
  private segnalazioniTutte: Segnalazione[] = [];
  private conversazioniTutte: Conversazione[] = [];
  private modificheTutte: ModificaProposta[] = [];
  readonly registro: VoceRegistro[] = [];

  constructor(private readonly ora: () => Date = () => new Date()) {}

  async configurazione(localeId: string) {
    const c = this.configurazioni.get(localeId);
    return c ? copia(c) : null;
  }

  async configurazionePerSlug(slug: string) {
    for (const c of this.configurazioni.values()) if (c.slug === slug) return copia(c);
    return null;
  }

  async salvaConfigurazione(config: ConfigurazioneLocale) {
    this.configurazioni.set(config.id, copia(config));
  }

  async prenotazioniAttive(localeId: string, data: string) {
    return copia(this.prenotazioniTutte.filter((p) => p.localeId === localeId && p.data === data && attiva(p)));
  }

  async prenotaSeDisponibile(nuova: NuovaPrenotazione, controllo: (esistenti: Prenotazione[]) => boolean) {
    const esistenti = this.prenotazioniTutte.filter((p) => p.localeId === nuova.localeId && p.data === nuova.data && attiva(p));
    if (!controllo(copia(esistenti))) return null;
    const adesso = this.ora().toISOString();
    const p: Prenotazione = { ...copia(nuova), id: crypto.randomUUID(), creataIl: adesso, aggiornataIl: adesso };
    this.prenotazioniTutte.push(p);
    return copia(p);
  }

  async aggiornaSeDisponibile(
    localeId: string,
    id: string,
    campi: Partial<Pick<Prenotazione, "data" | "ora" | "persone" | "note" | "stato">>,
    controllo: (esistentiAltre: Prenotazione[]) => boolean,
  ) {
    const p = this.prenotazioniTutte.find((x) => x.localeId === localeId && x.id === id);
    if (!p) return null;
    const data = campi.data ?? p.data;
    const altre = this.prenotazioniTutte.filter((x) => x.localeId === localeId && x.data === data && x.id !== id && attiva(x));
    if (!controllo(copia(altre))) return null;
    Object.assign(p, campi, { aggiornataIl: this.ora().toISOString() });
    return copia(p);
  }

  async prenotazione(localeId: string, id: string) {
    const p = this.prenotazioniTutte.find((x) => x.localeId === localeId && x.id === id);
    return p ? copia(p) : null;
  }

  async prenotazionePerCodice(localeId: string, codice: string) {
    const p = this.prenotazioniTutte.find((x) => x.localeId === localeId && x.codice === codice && attiva(x));
    return p ? copia(p) : null;
  }

  async prenotazionePerToken(token: string) {
    const p = this.prenotazioniTutte.find((x) => x.tokenGestione === token);
    return p ? copia(p) : null;
  }

  async prenotazioniPerTelefono(localeId: string, telefono: string, dallaData: string) {
    return copia(
      this.prenotazioniTutte
        .filter((p) => p.localeId === localeId && p.telefono === telefono && p.data >= dallaData)
        .sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora)),
    );
  }

  async codiciAttivi(localeId: string) {
    return new Set(this.prenotazioniTutte.filter((p) => p.localeId === localeId && attiva(p)).map((p) => p.codice));
  }

  async prenotazioniNelPeriodo(localeId: string, periodo: FiltroPeriodo) {
    return copia(this.prenotazioniTutte.filter((p) => p.localeId === localeId && p.creataIl >= periodo.da && p.creataIl < periodo.a));
  }

  async creaSegnalazione(s: Omit<Segnalazione, "id" | "creataIl" | "gestitaIl" | "stato">) {
    const nuova: Segnalazione = { ...s, id: crypto.randomUUID(), stato: "aperta", creataIl: this.ora().toISOString(), gestitaIl: null };
    this.segnalazioniTutte.push(nuova);
    return copia(nuova);
  }

  async segnalazioni(localeId: string, filtro: { stato?: Segnalazione["stato"]; periodo?: FiltroPeriodo } = {}) {
    return copia(
      this.segnalazioniTutte.filter(
        (s) =>
          s.localeId === localeId &&
          (!filtro.stato || s.stato === filtro.stato) &&
          (!filtro.periodo || (s.creataIl >= filtro.periodo.da && s.creataIl < filtro.periodo.a)),
      ),
    );
  }

  async chiudiSegnalazione(localeId: string, id: string, quando: string) {
    const s = this.segnalazioniTutte.find((x) => x.localeId === localeId && x.id === id);
    if (s) Object.assign(s, { stato: "gestita", gestitaIl: quando });
  }

  async salvaConversazione(c: Omit<Conversazione, "id">) {
    const esistente = this.conversazioniTutte.find((x) => x.localeId === c.localeId && x.idEsterno === c.idEsterno);
    if (esistente) {
      Object.assign(esistente, copia(c));
      return copia(esistente);
    }
    const nuova = { ...copia(c), id: crypto.randomUUID() };
    this.conversazioniTutte.push(nuova);
    return copia(nuova);
  }

  async conversazioni(localeId: string, periodo: FiltroPeriodo) {
    return copia(
      this.conversazioniTutte.filter((c) => c.localeId === localeId && c.iniziataIl >= periodo.da && c.iniziataIl < periodo.a),
    );
  }

  async creaModifica(
    m: Omit<ModificaProposta, "id" | "numero" | "creataIl" | "decisaIl" | "decisaDa" | "stato" | "statoPrecedente">,
  ) {
    const numero = 1 + Math.max(0, ...this.modificheTutte.filter((x) => x.localeId === m.localeId).map((x) => x.numero));
    const nuova: ModificaProposta = {
      ...copia(m),
      id: crypto.randomUUID(),
      numero,
      stato: "proposta",
      statoPrecedente: null,
      creataIl: this.ora().toISOString(),
      decisaIl: null,
      decisaDa: null,
    };
    this.modificheTutte.push(nuova);
    return copia(nuova);
  }

  async modifiche(localeId: string, stato?: ModificaProposta["stato"]) {
    return copia(this.modificheTutte.filter((m) => m.localeId === localeId && (!stato || m.stato === stato)));
  }

  async modificaPerNumero(localeId: string, numero: number) {
    const m = this.modificheTutte.find((x) => x.localeId === localeId && x.numero === numero);
    return m ? copia(m) : null;
  }

  async aggiornaModifica(
    localeId: string,
    id: string,
    campi: Pick<ModificaProposta, "stato" | "decisaIl" | "decisaDa" | "statoPrecedente">,
  ) {
    const m = this.modificheTutte.find((x) => x.localeId === localeId && x.id === id);
    if (m) Object.assign(m, copia(campi));
  }

  async registra(voce: VoceRegistro) {
    this.registro.push(copia(voce));
  }

  async registroConversazione(localeId: string, idConversazione: string) {
    return copia(this.registro.filter((v) => v.localeId === localeId && v.idConversazione === idConversazione));
  }

  async esporta(localeId: string) {
    return copia({
      formato: "orvane-table/esportazione@1",
      esportatoIl: this.ora().toISOString(),
      configurazione: this.configurazioni.get(localeId) ?? null,
      prenotazioni: this.prenotazioniTutte.filter((p) => p.localeId === localeId),
      conversazioni: this.conversazioniTutte.filter((c) => c.localeId === localeId),
      segnalazioni: this.segnalazioniTutte.filter((s) => s.localeId === localeId),
      modifiche: this.modificheTutte.filter((m) => m.localeId === localeId),
    });
  }

  async pulisciScaduti(adesso: string, oggi: string) {
    let trascrizioni = 0;
    let noteSalute = 0;
    for (const c of this.conversazioniTutte) {
      if (c.scadeIl <= adesso && (c.trascrizione || c.telefonoChiamante || c.riassunto)) {
        Object.assign(c, { trascrizione: null, telefonoChiamante: null, riassunto: null });
        trascrizioni++;
      }
    }
    for (const p of this.prenotazioniTutte) {
      if (p.noteSalute && p.data < oggi) {
        p.noteSalute = null;
        noteSalute++;
      }
    }
    const prima = this.registro.length;
    const limite = new Date(Date.parse(adesso) - 90 * 86_400_000).toISOString();
    const restano = this.registro.filter((v) => v.creataIl >= limite);
    this.registro.splice(0, this.registro.length, ...restano);
    return { trascrizioni, noteSalute, registro: prima - restano.length };
  }
}
