-- Project Orvane Table: schema multi-locale (prompt 17.3).
-- Pensato per Supabase (Postgres 15+): usa auth.uid() e i ruoli
-- authenticated e service_role. Le funzioni server usano service_role e
-- filtrano sempre per locale_id; gli utenti del locale passano dalle regole
-- di accesso a livello di riga e vedono solo i dati del proprio locale.
--
-- Regione del progetto: scegliere l'Unione europea (Parte 12.4).

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- locali e utenti

create table public.locali (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome text not null,
  tipo text not null,
  pacchetto text not null check (pacchetto in ('start', 'pro', 'premium')),
  stato text not null default 'demo' check (stato in ('demo', 'attivo', 'sospeso', 'chiuso')),
  fuso_orario text not null default 'Europe/Rome',
  -- contatti, titolare, regole di prenotazione, assistente, sito, privacy
  impostazioni jsonb not null default '{}'::jsonb,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create table public.utenti (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locali (id) on delete cascade,
  -- utente di Supabase Auth; null finché la persona non ha un accesso
  auth_user_id uuid,
  nome text not null,
  ruolo text not null check (ruolo in ('titolare', 'staff', 'fondatore')),
  telefono text,
  email text,
  creato_il timestamptz not null default now(),
  unique (locale_id, auth_user_id)
);

-- ---------------------------------------------------------------------------
-- configurazione: orari, menu, domande frequenti

create table public.orari_e_chiusure (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locali (id) on delete cascade,
  tipo text not null check (tipo in ('orario', 'chiusura')),
  -- per gli orari: 1 = lunedì ... 7 = domenica
  giorno_settimana smallint check (giorno_settimana between 1 and 7),
  dalle time,
  alle time,
  -- per le chiusure
  dal date,
  al date,
  motivo text,
  ordine smallint not null default 0,
  check (
    (tipo = 'orario' and giorno_settimana is not null and dalle is not null and alle is not null and dal is null)
    or (tipo = 'chiusura' and dal is not null and al is not null and al >= dal and giorno_settimana is null)
  )
);

create table public.voci_menu (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locali (id) on delete cascade,
  categoria text not null,
  nome text not null,
  descrizione text,
  prezzo_centesimi integer not null check (prezzo_centesimi >= 0),
  vegetariano boolean not null default false,
  vegano boolean not null default false,
  senza_glutine boolean not null default false,
  ordine integer not null default 0,
  attiva boolean not null default true
);

-- i 14 allergeni dell'allegato II del Reg. UE 1169/2011
create table public.allergeni (
  locale_id uuid not null references public.locali (id) on delete cascade,
  voce_menu_id uuid not null references public.voci_menu (id) on delete cascade,
  codice text not null check (codice in (
    'glutine', 'crostacei', 'uova', 'pesce', 'arachidi', 'soia', 'latte', 'frutta_a_guscio',
    'sedano', 'senape', 'sesamo', 'solfiti', 'lupini', 'molluschi'
  )),
  primary key (voce_menu_id, codice)
);

create table public.domande_frequenti (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locali (id) on delete cascade,
  tema text not null,
  domanda text not null,
  risposta text not null,
  -- solo le risposte verificate dal titolare vengono lette ai clienti
  verificata boolean not null default true,
  ordine integer not null default 0
);

-- ---------------------------------------------------------------------------
-- clienti e prenotazioni

create table public.clienti (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locali (id) on delete cascade,
  nome text not null,
  telefono text not null check (telefono ~ '^\+[0-9]{8,15}$'),
  creato_il timestamptz not null default now(),
  unique (locale_id, telefono)
);

create table public.prenotazioni (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locali (id) on delete cascade,
  cliente_id uuid not null references public.clienti (id) on delete cascade,
  codice text not null check (codice ~ '^[0-9]{4}$'),
  token_gestione text not null unique,
  nome text not null,
  data date not null,
  ora time not null,
  persone integer not null check (persone between 1 and 200),
  stato text not null check (stato in ('confermata', 'da_confermare', 'annullata', 'completata', 'no_show')),
  canale text not null check (canale in ('telefono', 'whatsapp', 'sito', 'titolare')),
  note text,
  -- dato particolare (art. 9 GDPR): solo con consenso, cancellato dopo la data
  note_salute text,
  consenso_note_salute boolean not null default false,
  fuori_orario boolean not null default false,
  id_conversazione text,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  check (note_salute is null or consenso_note_salute)
);

-- ---------------------------------------------------------------------------
-- conversazioni, esiti, segnalazioni, modifiche proposte (Parte 5B)

create table public.conversazioni (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locali (id) on delete cascade,
  id_esterno text not null,
  canale text not null check (canale in ('telefono', 'whatsapp', 'chat')),
  iniziata_il timestamptz not null,
  durata_secondi integer not null default 0,
  telefono_chiamante text,
  -- nessun audio: solo la trascrizione, cancellata alla scadenza
  trascrizione jsonb,
  riassunto text,
  scade_il timestamptz not null,
  unique (locale_id, id_esterno)
);

create table public.esiti (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locali (id) on delete cascade,
  conversazione_id uuid not null unique references public.conversazioni (id) on delete cascade,
  esito text not null check (esito in ('risolta', 'passata_a_persona', 'fallita', 'insoddisfatto')),
  temi text[] not null default '{}',
  domande_senza_risposta text[] not null default '{}',
  classificato_da text not null default 'sistema' check (classificato_da in ('sistema', 'fondatore', 'titolare')),
  creato_il timestamptz not null default now()
);

create table public.segnalazioni (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locali (id) on delete cascade,
  tipo text not null check (tipo in (
    'messaggio_titolare', 'gruppo_grande', 'domanda_senza_risposta', 'richiesta_persona', 'correzione_staff', 'errore'
  )),
  testo text not null,
  urgenza text not null default 'normale' check (urgenza in ('bassa', 'normale', 'alta')),
  nome text,
  telefono text,
  id_conversazione text,
  stato text not null default 'aperta' check (stato in ('aperta', 'gestita')),
  creato_il timestamptz not null default now(),
  gestito_il timestamptz
);

create table public.modifiche_proposte (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locali (id) on delete cascade,
  -- progressivo del locale: il titolare risponde "ok 3"
  numero integer not null,
  tipo text not null check (tipo in ('faq', 'chiusura_aggiungi', 'chiusura_rimuovi', 'istruzione_assistente', 'regola_prenotazione')),
  descrizione text not null,
  dati jsonb not null default '{}'::jsonb,
  motivo text not null,
  origine text not null check (origine in ('analisi_settimanale', 'titolare', 'fondatore')),
  stato text not null default 'proposta' check (stato in ('proposta', 'applicata', 'rifiutata', 'annullata')),
  richiede_titolare boolean not null,
  stato_precedente jsonb,
  creato_il timestamptz not null default now(),
  deciso_il timestamptz,
  deciso_da text,
  unique (locale_id, numero)
);

-- registro di ogni chiamata agli strumenti dell'assistente
create table public.registro_strumenti (
  id bigint generated always as identity primary key,
  locale_id uuid not null references public.locali (id) on delete cascade,
  strumento text not null,
  ingresso jsonb not null,
  risposta jsonb not null,
  ok boolean not null,
  id_conversazione text,
  creato_il timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- indici: locale_id su ogni tabella (serve anche alle regole di accesso)

create index on public.utenti (auth_user_id);
create index on public.orari_e_chiusure (locale_id, tipo);
create index on public.voci_menu (locale_id, ordine);
create index on public.allergeni (locale_id);
create index on public.domande_frequenti (locale_id);
create index on public.prenotazioni (locale_id, data) where stato in ('confermata', 'da_confermare');
create index on public.prenotazioni (locale_id, creato_il);
create index on public.prenotazioni (cliente_id);
create unique index prenotazioni_codice_attivo on public.prenotazioni (locale_id, codice) where stato in ('confermata', 'da_confermare');
create index on public.conversazioni (locale_id, iniziata_il);
create index on public.conversazioni (scade_il) where trascrizione is not null;
create index on public.esiti (locale_id, esito);
create index on public.segnalazioni (locale_id, stato, creato_il);
create index on public.modifiche_proposte (locale_id, stato);
create index on public.registro_strumenti (locale_id, id_conversazione);
create index on public.registro_strumenti (creato_il);

-- ---------------------------------------------------------------------------
-- aggiornato_il automatico

create or replace function private.tocca_aggiornato_il() returns trigger
language plpgsql as $$
begin
  new.aggiornato_il := now();
  return new;
end $$;

create trigger locali_aggiornato before update on public.locali
  for each row execute function private.tocca_aggiornato_il();
create trigger prenotazioni_aggiornato before update on public.prenotazioni
  for each row execute function private.tocca_aggiornato_il();

-- ---------------------------------------------------------------------------
-- regole di accesso a livello di riga

-- locali dell'utente collegato; security definer per non rileggere utenti con le sue stesse regole
create or replace function private.locali_utente() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select u.locale_id from public.utenti u where u.auth_user_id = (select auth.uid())
$$;
revoke all on function private.locali_utente() from public;
grant usage on schema private to authenticated;
grant execute on function private.locali_utente() to authenticated;

alter table public.locali enable row level security;
create policy "locale proprio: lettura" on public.locali for select to authenticated
  using (id in (select private.locali_utente()));

do $$
declare t text;
begin
  foreach t in array array[
    'utenti', 'orari_e_chiusure', 'voci_menu', 'allergeni', 'domande_frequenti', 'clienti',
    'prenotazioni', 'conversazioni', 'esiti', 'segnalazioni', 'modifiche_proposte', 'registro_strumenti'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "locale proprio" on public.%I for all to authenticated using (locale_id in (select private.locali_utente())) with check (locale_id in (select private.locali_utente()))',
      t
    );
  end loop;
end $$;

-- il registro e le modifiche si leggono soltanto: scrive il server
drop policy "locale proprio" on public.registro_strumenti;
create policy "locale proprio: lettura" on public.registro_strumenti for select to authenticated
  using (locale_id in (select private.locali_utente()));
drop policy "locale proprio" on public.utenti;
create policy "locale proprio: lettura" on public.utenti for select to authenticated
  using (locale_id in (select private.locali_utente()));

grant select on public.locali to authenticated;
grant select on public.registro_strumenti, public.utenti to authenticated;
grant select, insert, update, delete on
  public.orari_e_chiusure, public.voci_menu, public.allergeni, public.domande_frequenti, public.clienti,
  public.prenotazioni, public.conversazioni, public.esiti, public.segnalazioni, public.modifiche_proposte
  to authenticated;

-- ---------------------------------------------------------------------------
-- esportazione di tutti i dati di un locale in un solo documento (Parte 6.2)
-- security invoker: un utente esporta solo ciò che le regole gli lasciano vedere

create or replace function public.esporta_locale(p_locale uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'formato', 'orvane-table/esportazione@1',
    'esportato_il', now(),
    'locale', (select to_jsonb(l) from public.locali l where l.id = p_locale),
    'orari_e_chiusure', coalesce((select jsonb_agg(to_jsonb(x) order by x.tipo, x.giorno_settimana, x.dal, x.ordine) from public.orari_e_chiusure x where x.locale_id = p_locale), '[]'),
    'voci_menu', coalesce((select jsonb_agg(to_jsonb(x) || jsonb_build_object('allergeni',
        coalesce((select jsonb_agg(a.codice order by a.codice) from public.allergeni a where a.voce_menu_id = x.id), '[]'))
        order by x.ordine) from public.voci_menu x where x.locale_id = p_locale), '[]'),
    'domande_frequenti', coalesce((select jsonb_agg(to_jsonb(x) order by x.ordine) from public.domande_frequenti x where x.locale_id = p_locale), '[]'),
    'clienti', coalesce((select jsonb_agg(to_jsonb(x) order by x.creato_il) from public.clienti x where x.locale_id = p_locale), '[]'),
    'prenotazioni', coalesce((select jsonb_agg(to_jsonb(x) order by x.data, x.ora) from public.prenotazioni x where x.locale_id = p_locale), '[]'),
    'conversazioni', coalesce((select jsonb_agg(to_jsonb(x) order by x.iniziata_il) from public.conversazioni x where x.locale_id = p_locale), '[]'),
    'esiti', coalesce((select jsonb_agg(to_jsonb(x) order by x.creato_il) from public.esiti x where x.locale_id = p_locale), '[]'),
    'segnalazioni', coalesce((select jsonb_agg(to_jsonb(x) order by x.creato_il) from public.segnalazioni x where x.locale_id = p_locale), '[]'),
    'modifiche_proposte', coalesce((select jsonb_agg(to_jsonb(x) order by x.numero) from public.modifiche_proposte x where x.locale_id = p_locale), '[]')
  )
$$;

-- ---------------------------------------------------------------------------
-- cancellazione dei dati scaduti (Parte 12.4): trascrizioni oltre la
-- conservazione, note sanitarie dopo la data della prenotazione, registro
-- degli strumenti oltre 90 giorni. Su Supabase si pianifica con pg_cron:
--   select cron.schedule('pulizia-orvane', '15 3 * * *', 'select public.pulisci_dati_scaduti()');

create or replace function public.pulisci_dati_scaduti(p_adesso timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n_trascrizioni integer;
  n_note integer;
  n_registro integer;
begin
  update public.conversazioni
     set trascrizione = null, telefono_chiamante = null, riassunto = null
   where scade_il <= p_adesso
     and (trascrizione is not null or telefono_chiamante is not null or riassunto is not null);
  get diagnostics n_trascrizioni = row_count;

  update public.prenotazioni
     set note_salute = null
   where note_salute is not null
     and data < (p_adesso at time zone 'Europe/Rome')::date;
  get diagnostics n_note = row_count;

  delete from public.registro_strumenti where creato_il < p_adesso - interval '90 days';
  get diagnostics n_registro = row_count;

  return jsonb_build_object('trascrizioni', n_trascrizioni, 'note_salute', n_note, 'registro', n_registro);
end $$;
revoke all on function public.pulisci_dati_scaduti(timestamptz) from public;
