// Archivio su Postgres (Supabase). Usa una connessione con ruolo di servizio:
// le regole di accesso a livello di riga proteggono gli utenti dei locali,
// qui ogni query filtra comunque per locale_id.

import type { Archivio, FiltroPeriodo } from "../core/archivio.ts";
import { leggiConfigurazione, type ConfigurazioneLocale } from "../core/configurazione.ts";
import { GIORNI } from "../core/tempo.ts";
import type {
  Conversazione,
  ModificaProposta,
  NuovaPrenotazione,
  Prenotazione,
  Segnalazione,
  VoceRegistro,
} from "../core/tipi.ts";

/** Il minimo che serve da un driver Postgres. */
export interface Sql {
  query<T = Record<string, unknown>>(testo: string, parametri?: unknown[]): Promise<T[]>;
  transazione<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
}

/** Adattatore per PGlite (test e prove locali). */
export function sqlDaPglite(db: {
  query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }>;
  transaction: <T>(fn: (tx: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => Promise<T>;
}): Sql {
  const da = (q: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }, dentro: boolean): Sql => ({
    query: async <T>(t: string, p: unknown[] = []) => (await q.query(t, p)).rows as T[],
    transazione: (fn) => (dentro ? fn(da(q, true)) : db.transaction((tx) => fn(da(tx, true)))),
  });
  return da(db, false);
}

/** Adattatore per il pacchetto "postgres" (porsager), usato nella funzione Supabase. */
export function sqlDaPostgresJs(sql: {
  unsafe: (t: string, p?: any[]) => Promise<any[]>;
  begin: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
}): Sql {
  const da = (q: typeof sql, dentro: boolean): Sql => ({
    query: async <T>(t: string, p: unknown[] = []) => (await q.unsafe(t, p as any[])) as T[],
    transazione: (fn) => (dentro ? fn(da(q, true)) : (sql.begin((tx) => fn(da(tx, true))) as any)),
  });
  return da(sql, false);
}

const ISO = (col: string) => `to_char(${col} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

const COLONNE_PRENOTAZIONE = `
  p.id::text as id, p.locale_id::text as "localeId", p.codice, p.token_gestione as "tokenGestione", p.nome,
  c.telefono, to_char(p.data, 'YYYY-MM-DD') as data, to_char(p.ora, 'HH24:MI') as ora, p.persone, p.stato, p.canale,
  p.note, p.note_salute as "noteSalute", p.consenso_note_salute as "consensoNoteSalute", p.fuori_orario as "fuoriOrario",
  p.id_conversazione as "idConversazione", ${ISO("p.creato_il")} as "creataIl", ${ISO("p.aggiornato_il")} as "aggiornataIl"`;
const DA_PRENOTAZIONI = `from public.prenotazioni p join public.clienti c on c.id = p.cliente_id`;
const ATTIVA = `p.stato in ('confermata', 'da_confermare')`;

const COLONNE_SEGNALAZIONE = `id::text as id, locale_id::text as "localeId", tipo, testo, urgenza, nome, telefono,
  id_conversazione as "idConversazione", stato, ${ISO("creato_il")} as "creataIl",
  case when gestito_il is null then null else ${ISO("gestito_il")} end as "gestitaIl"`;

const COLONNE_MODIFICA = `id::text as id, locale_id::text as "localeId", numero, tipo, descrizione, dati, motivo, origine, stato,
  richiede_titolare as "richiedeTitolare", stato_precedente as "statoPrecedente", ${ISO("creato_il")} as "creataIl",
  case when deciso_il is null then null else ${ISO("deciso_il")} end as "decisaIl", deciso_da as "decisaDa"`;

const centesimi = (euro: number) => Math.round(euro * 100);

export class ArchivioPostgres implements Archivio {
  constructor(private readonly sql: Sql) {}

  // --- configurazione -------------------------------------------------------

  async configurazione(localeId: string) {
    const [l] = await this.sql.query<{ id: string }>(`select id::text as id from public.locali where id = $1::uuid`, [localeId]);
    return l ? this.componi(this.sql, l.id) : null;
  }

  async configurazionePerSlug(slug: string) {
    const [l] = await this.sql.query<{ id: string }>(`select id::text as id from public.locali where slug = $1`, [slug]);
    return l ? this.componi(this.sql, l.id) : null;
  }

  private async componi(sql: Sql, id: string): Promise<ConfigurazioneLocale> {
    const [l] = await sql.query<any>(
      `select id::text as id, slug, nome, tipo, pacchetto, stato, fuso_orario, impostazioni from public.locali where id = $1::uuid`,
      [id],
    );
    const righe = await sql.query<any>(
      `select tipo, giorno_settimana, to_char(dalle, 'HH24:MI') as dalle, to_char(alle, 'HH24:MI') as alle,
              to_char(dal, 'YYYY-MM-DD') as dal, to_char(al, 'YYYY-MM-DD') as al, motivo
         from public.orari_e_chiusure where locale_id = $1::uuid order by tipo, giorno_settimana, ordine, dal`,
      [id],
    );
    const voci = await sql.query<any>(
      `select v.categoria, v.nome, v.descrizione, v.prezzo_centesimi, v.vegetariano, v.vegano, v.senza_glutine,
              coalesce((select array_agg(a.codice order by a.codice) from public.allergeni a where a.voce_menu_id = v.id), '{}') as allergeni
         from public.voci_menu v where v.locale_id = $1::uuid and v.attiva order by v.ordine`,
      [id],
    );
    const faq = await sql.query<any>(
      `select tema, domanda, risposta, verificata from public.domande_frequenti where locale_id = $1::uuid order by ordine`,
      [id],
    );
    const orari = Object.fromEntries(GIORNI.map((g) => [g, [] as { dalle: string; alle: string }[]]));
    for (const r of righe.filter((x) => x.tipo === "orario")) orari[GIORNI[r.giorno_settimana - 1]].push({ dalle: r.dalle, alle: r.alle });
    const menu: { categoria: string; voci: unknown[] }[] = [];
    for (const v of voci) {
      let cat = menu.find((c) => c.categoria === v.categoria);
      if (!cat) menu.push((cat = { categoria: v.categoria, voci: [] }));
      cat.voci.push({
        nome: v.nome,
        ...(v.descrizione ? { descrizione: v.descrizione } : {}),
        prezzo: v.prezzo_centesimi / 100,
        allergeni: v.allergeni,
        vegetariano: v.vegetariano,
        vegano: v.vegano,
        senzaGlutine: v.senza_glutine,
      });
    }
    const imp = typeof l.impostazioni === "string" ? JSON.parse(l.impostazioni) : l.impostazioni;
    return leggiConfigurazione({
      ...imp,
      id: l.id,
      slug: l.slug,
      nome: l.nome,
      tipo: l.tipo,
      pacchetto: l.pacchetto,
      demo: l.stato === "demo",
      fusoOrario: l.fuso_orario,
      orari,
      chiusure: righe.filter((x) => x.tipo === "chiusura").map((r) => ({ dal: r.dal, al: r.al, motivo: r.motivo ?? "chiusura" })),
      menu,
      domandeFrequenti: faq,
    });
  }

  async salvaConfigurazione(config: ConfigurazioneLocale) {
    const { id, slug, nome, tipo, pacchetto, demo, fusoOrario, orari, chiusure, menu, domandeFrequenti, ...impostazioni } = config;
    await this.sql.transazione(async (tx) => {
      await tx.query(
        `insert into public.locali (id, slug, nome, tipo, pacchetto, stato, fuso_orario, impostazioni)
         values ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb)
         on conflict (id) do update set slug = excluded.slug, nome = excluded.nome, tipo = excluded.tipo,
           pacchetto = excluded.pacchetto, fuso_orario = excluded.fuso_orario, impostazioni = excluded.impostazioni,
           stato = case when public.locali.stato in ('sospeso', 'chiuso') then public.locali.stato else excluded.stato end`,
        [id, slug, nome, tipo, pacchetto, demo ? "demo" : "attivo", fusoOrario, JSON.stringify(impostazioni)],
      );
      await tx.query(`delete from public.orari_e_chiusure where locale_id = $1::uuid`, [id]);
      for (const [i, g] of GIORNI.entries()) {
        for (const [ordine, f] of orari[g].entries()) {
          await tx.query(
            `insert into public.orari_e_chiusure (locale_id, tipo, giorno_settimana, dalle, alle, ordine) values ($1::uuid, 'orario', $2, $3::time, $4::time, $5)`,
            [id, i + 1, f.dalle, f.alle, ordine],
          );
        }
      }
      for (const c of chiusure) {
        await tx.query(
          `insert into public.orari_e_chiusure (locale_id, tipo, dal, al, motivo) values ($1::uuid, 'chiusura', $2::date, $3::date, $4)`,
          [id, c.dal, c.al, c.motivo],
        );
      }
      await tx.query(`delete from public.voci_menu where locale_id = $1::uuid`, [id]);
      let ordine = 0;
      for (const cat of menu) {
        for (const v of cat.voci) {
          const [riga] = await tx.query<{ id: string }>(
            `insert into public.voci_menu (locale_id, categoria, nome, descrizione, prezzo_centesimi, vegetariano, vegano, senza_glutine, ordine)
             values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9) returning id::text as id`,
            [id, cat.categoria, v.nome, v.descrizione ?? null, centesimi(v.prezzo), v.vegetariano, v.vegano, v.senzaGlutine, ordine++],
          );
          for (const a of v.allergeni) {
            await tx.query(`insert into public.allergeni (locale_id, voce_menu_id, codice) values ($1::uuid, $2::uuid, $3)`, [id, riga.id, a]);
          }
        }
      }
      await tx.query(`delete from public.domande_frequenti where locale_id = $1::uuid`, [id]);
      for (const [i, f] of domandeFrequenti.entries()) {
        await tx.query(
          `insert into public.domande_frequenti (locale_id, tema, domanda, risposta, verificata, ordine) values ($1::uuid, $2, $3, $4, $5, $6)`,
          [id, f.tema, f.domanda, f.risposta, f.verificata, i],
        );
      }
    });
  }

  // --- prenotazioni ---------------------------------------------------------

  private attiveDelGiorno(sql: Sql, localeId: string, data: string, escludi?: string) {
    return sql.query<Prenotazione>(
      `select ${COLONNE_PRENOTAZIONE} ${DA_PRENOTAZIONI}
        where p.locale_id = $1::uuid and p.data = $2::date and ${ATTIVA} and ($3::uuid is null or p.id <> $3::uuid)
        order by p.ora`,
      [localeId, data, escludi ?? null],
    );
  }

  private blocca(sql: Sql, localeId: string, data: string) {
    return sql.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`${localeId}:${data}`]);
  }

  prenotazioniAttive(localeId: string, data: string) {
    return this.attiveDelGiorno(this.sql, localeId, data);
  }

  async prenotaSeDisponibile(nuova: NuovaPrenotazione, controllo: (esistenti: Prenotazione[]) => boolean) {
    return this.sql.transazione(async (tx) => {
      await this.blocca(tx, nuova.localeId, nuova.data);
      if (!controllo(await this.attiveDelGiorno(tx, nuova.localeId, nuova.data))) return null;
      const [cliente] = await tx.query<{ id: string }>(
        `insert into public.clienti (locale_id, nome, telefono) values ($1::uuid, $2, $3)
         on conflict (locale_id, telefono) do update set nome = excluded.nome returning id::text as id`,
        [nuova.localeId, nuova.nome, nuova.telefono],
      );
      const [r] = await tx.query<{ id: string }>(
        `insert into public.prenotazioni (locale_id, cliente_id, codice, token_gestione, nome, data, ora, persone, stato, canale,
           note, note_salute, consenso_note_salute, fuori_orario, id_conversazione)
         values ($1::uuid, $2::uuid, $3, $4, $5, $6::date, $7::time, $8, $9, $10, $11, $12, $13, $14, $15) returning id::text as id`,
        [
          nuova.localeId, cliente.id, nuova.codice, nuova.tokenGestione, nuova.nome, nuova.data, nuova.ora, nuova.persone,
          nuova.stato, nuova.canale, nuova.note, nuova.noteSalute, nuova.consensoNoteSalute, nuova.fuoriOrario, nuova.idConversazione,
        ],
      );
      const [p] = await tx.query<Prenotazione>(`select ${COLONNE_PRENOTAZIONE} ${DA_PRENOTAZIONI} where p.id = $1::uuid`, [r.id]);
      return p;
    });
  }

  async aggiornaSeDisponibile(
    localeId: string,
    id: string,
    campi: Partial<Pick<Prenotazione, "data" | "ora" | "persone" | "note" | "stato">>,
    controllo: (esistentiAltre: Prenotazione[]) => boolean,
  ) {
    return this.sql.transazione(async (tx) => {
      const [attuale] = await tx.query<Prenotazione>(
        `select ${COLONNE_PRENOTAZIONE} ${DA_PRENOTAZIONI} where p.locale_id = $1::uuid and p.id = $2::uuid`,
        [localeId, id],
      );
      if (!attuale) return null;
      const data = campi.data ?? attuale.data;
      await this.blocca(tx, localeId, data);
      if (!controllo(await this.attiveDelGiorno(tx, localeId, data, id))) return null;
      await tx.query(
        `update public.prenotazioni set data = $3::date, ora = $4::time, persone = $5, note = $6, stato = $7
          where locale_id = $1::uuid and id = $2::uuid`,
        [localeId, id, data, campi.ora ?? attuale.ora, campi.persone ?? attuale.persone, campi.note !== undefined ? campi.note : attuale.note, campi.stato ?? attuale.stato],
      );
      const [p] = await tx.query<Prenotazione>(`select ${COLONNE_PRENOTAZIONE} ${DA_PRENOTAZIONI} where p.id = $1::uuid`, [id]);
      return p;
    });
  }

  async prenotazione(localeId: string, id: string) {
    const [p] = await this.sql.query<Prenotazione>(
      `select ${COLONNE_PRENOTAZIONE} ${DA_PRENOTAZIONI} where p.locale_id = $1::uuid and p.id = $2::uuid`,
      [localeId, id],
    );
    return p ?? null;
  }

  async prenotazionePerCodice(localeId: string, codice: string) {
    const [p] = await this.sql.query<Prenotazione>(
      `select ${COLONNE_PRENOTAZIONE} ${DA_PRENOTAZIONI} where p.locale_id = $1::uuid and p.codice = $2 and ${ATTIVA}`,
      [localeId, codice],
    );
    return p ?? null;
  }

  async prenotazionePerToken(token: string) {
    const [p] = await this.sql.query<Prenotazione>(`select ${COLONNE_PRENOTAZIONE} ${DA_PRENOTAZIONI} where p.token_gestione = $1`, [token]);
    return p ?? null;
  }

  prenotazioniPerTelefono(localeId: string, telefono: string, dallaData: string) {
    return this.sql.query<Prenotazione>(
      `select ${COLONNE_PRENOTAZIONE} ${DA_PRENOTAZIONI}
        where p.locale_id = $1::uuid and c.telefono = $2 and p.data >= $3::date order by p.data, p.ora`,
      [localeId, telefono, dallaData],
    );
  }

  async codiciAttivi(localeId: string) {
    const righe = await this.sql.query<{ codice: string }>(
      `select p.codice from public.prenotazioni p where p.locale_id = $1::uuid and ${ATTIVA}`,
      [localeId],
    );
    return new Set(righe.map((r) => r.codice));
  }

  prenotazioniNelPeriodo(localeId: string, periodo: FiltroPeriodo) {
    return this.sql.query<Prenotazione>(
      `select ${COLONNE_PRENOTAZIONE} ${DA_PRENOTAZIONI}
        where p.locale_id = $1::uuid and p.creato_il >= $2::timestamptz and p.creato_il < $3::timestamptz order by p.creato_il`,
      [localeId, periodo.da, periodo.a],
    );
  }

  // --- segnalazioni ---------------------------------------------------------

  async creaSegnalazione(s: Omit<Segnalazione, "id" | "creataIl" | "gestitaIl" | "stato">) {
    const [r] = await this.sql.query<Segnalazione>(
      `insert into public.segnalazioni (locale_id, tipo, testo, urgenza, nome, telefono, id_conversazione)
       values ($1::uuid, $2, $3, $4, $5, $6, $7) returning ${COLONNE_SEGNALAZIONE}`,
      [s.localeId, s.tipo, s.testo, s.urgenza, s.nome, s.telefono, s.idConversazione],
    );
    return r;
  }

  segnalazioni(localeId: string, filtro: { stato?: Segnalazione["stato"]; periodo?: FiltroPeriodo } = {}) {
    return this.sql.query<Segnalazione>(
      `select ${COLONNE_SEGNALAZIONE} from public.segnalazioni
        where locale_id = $1::uuid and ($2::text is null or stato = $2)
          and ($3::timestamptz is null or creato_il >= $3::timestamptz) and ($4::timestamptz is null or creato_il < $4::timestamptz)
        order by creato_il`,
      [localeId, filtro.stato ?? null, filtro.periodo?.da ?? null, filtro.periodo?.a ?? null],
    );
  }

  async chiudiSegnalazione(localeId: string, id: string, quando: string) {
    await this.sql.query(
      `update public.segnalazioni set stato = 'gestita', gestito_il = $3::timestamptz where locale_id = $1::uuid and id = $2::uuid`,
      [localeId, id, quando],
    );
  }

  // --- conversazioni --------------------------------------------------------

  async salvaConversazione(c: Omit<Conversazione, "id">) {
    return this.sql.transazione(async (tx) => {
      const [r] = await tx.query<{ id: string }>(
        `insert into public.conversazioni (locale_id, id_esterno, canale, iniziata_il, durata_secondi, telefono_chiamante, trascrizione, riassunto, scade_il)
         values ($1::uuid, $2, $3, $4::timestamptz, $5, $6, $7::jsonb, $8, $9::timestamptz)
         on conflict (locale_id, id_esterno) do update set durata_secondi = excluded.durata_secondi,
           telefono_chiamante = excluded.telefono_chiamante, trascrizione = excluded.trascrizione,
           riassunto = excluded.riassunto, scade_il = excluded.scade_il
         returning id::text as id`,
        [c.localeId, c.idEsterno, c.canale, c.iniziataIl, c.durataSecondi, c.telefonoChiamante, c.trascrizione ? JSON.stringify(c.trascrizione) : null, c.riassunto, c.scadeIl],
      );
      if (c.esito) {
        await tx.query(
          `insert into public.esiti (locale_id, conversazione_id, esito, temi, domande_senza_risposta, classificato_da)
           values ($1::uuid, $2::uuid, $3, array(select jsonb_array_elements_text($4::jsonb)), array(select jsonb_array_elements_text($5::jsonb)), $6)
           on conflict (conversazione_id) do update set esito = excluded.esito, temi = excluded.temi,
             domande_senza_risposta = excluded.domande_senza_risposta, classificato_da = excluded.classificato_da`,
          [c.localeId, r.id, c.esito.esito, JSON.stringify(c.esito.temi), JSON.stringify(c.esito.domandeSenzaRisposta), c.esito.classificatoDa],
        );
      }
      return { ...c, id: r.id };
    });
  }

  async conversazioni(localeId: string, periodo: FiltroPeriodo) {
    const righe = await this.sql.query<any>(
      `select c.id::text as id, c.locale_id::text as "localeId", c.id_esterno as "idEsterno", c.canale, ${ISO("c.iniziata_il")} as "iniziataIl",
              c.durata_secondi as "durataSecondi", c.telefono_chiamante as "telefonoChiamante", c.trascrizione, c.riassunto,
              ${ISO("c.scade_il")} as "scadeIl", e.esito, e.temi, e.domande_senza_risposta, e.classificato_da
         from public.conversazioni c left join public.esiti e on e.conversazione_id = c.id
        where c.locale_id = $1::uuid and c.iniziata_il >= $2::timestamptz and c.iniziata_il < $3::timestamptz
        order by c.iniziata_il`,
      [localeId, periodo.da, periodo.a],
    );
    return righe.map(({ esito, temi, domande_senza_risposta, classificato_da, trascrizione, ...c }): Conversazione => ({
      ...c,
      trascrizione: typeof trascrizione === "string" ? JSON.parse(trascrizione) : trascrizione,
      esito: esito ? { esito, temi, domandeSenzaRisposta: domande_senza_risposta, classificatoDa: classificato_da } : null,
    }));
  }

  // --- modifiche proposte ---------------------------------------------------

  async creaModifica(m: Omit<ModificaProposta, "id" | "numero" | "creataIl" | "decisaIl" | "decisaDa" | "stato" | "statoPrecedente">) {
    return this.sql.transazione(async (tx) => {
      await tx.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`modifiche:${m.localeId}`]);
      const [r] = await tx.query<ModificaProposta>(
        `insert into public.modifiche_proposte (locale_id, numero, tipo, descrizione, dati, motivo, origine, richiede_titolare)
         values ($1::uuid, (select coalesce(max(numero), 0) + 1 from public.modifiche_proposte where locale_id = $1::uuid), $2, $3, $4::jsonb, $5, $6, $7)
         returning ${COLONNE_MODIFICA}`,
        [m.localeId, m.tipo, m.descrizione, JSON.stringify(m.dati), m.motivo, m.origine, m.richiedeTitolare],
      );
      return r;
    });
  }

  modifiche(localeId: string, stato?: ModificaProposta["stato"]) {
    return this.sql.query<ModificaProposta>(
      `select ${COLONNE_MODIFICA} from public.modifiche_proposte where locale_id = $1::uuid and ($2::text is null or stato = $2) order by numero`,
      [localeId, stato ?? null],
    );
  }

  async modificaPerNumero(localeId: string, numero: number) {
    const [r] = await this.sql.query<ModificaProposta>(
      `select ${COLONNE_MODIFICA} from public.modifiche_proposte where locale_id = $1::uuid and numero = $2`,
      [localeId, numero],
    );
    return r ?? null;
  }

  async aggiornaModifica(localeId: string, id: string, campi: Pick<ModificaProposta, "stato" | "decisaIl" | "decisaDa" | "statoPrecedente">) {
    await this.sql.query(
      `update public.modifiche_proposte set stato = $3, deciso_il = $4::timestamptz, deciso_da = $5, stato_precedente = $6::jsonb
        where locale_id = $1::uuid and id = $2::uuid`,
      [localeId, id, campi.stato, campi.decisaIl, campi.decisaDa, campi.statoPrecedente ? JSON.stringify(campi.statoPrecedente) : null],
    );
  }

  // --- registro, esportazione, pulizia --------------------------------------

  async registra(v: VoceRegistro) {
    await this.sql.query(
      `insert into public.registro_strumenti (locale_id, strumento, ingresso, risposta, ok, id_conversazione, creato_il)
       values ($1::uuid, $2, $3::jsonb, $4::jsonb, $5, $6, $7::timestamptz)`,
      [v.localeId, v.strumento, JSON.stringify(v.ingresso ?? {}), JSON.stringify(v.risposta ?? {}), v.ok, v.idConversazione, v.creataIl],
    );
  }

  registroConversazione(localeId: string, idConversazione: string) {
    return this.sql.query<VoceRegistro>(
      `select locale_id::text as "localeId", strumento, ingresso, risposta, ok, id_conversazione as "idConversazione", ${ISO("creato_il")} as "creataIl"
         from public.registro_strumenti where locale_id = $1::uuid and id_conversazione = $2 order by id`,
      [localeId, idConversazione],
    );
  }

  async esporta(localeId: string) {
    const [r] = await this.sql.query<{ dati: unknown }>(`select public.esporta_locale($1::uuid) as dati`, [localeId]);
    const dati = typeof r.dati === "string" ? JSON.parse(r.dati) : r.dati;
    return { ...(dati as Record<string, unknown>), configurazione: await this.configurazione(localeId) };
  }

  async pulisciScaduti(adesso: string) {
    const [r] = await this.sql.query<{ esito: any }>(`select public.pulisci_dati_scaduti($1::timestamptz) as esito`, [adesso]);
    const e = typeof r.esito === "string" ? JSON.parse(r.esito) : r.esito;
    return { trascrizioni: e.trascrizioni, noteSalute: e.note_salute, registro: e.registro };
  }
}
