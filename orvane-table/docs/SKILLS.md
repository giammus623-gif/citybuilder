# Skill utili per questo progetto (/find-skills, 24/10/2026)

Ricerca fatta con `npx skills find` sull'ecosistema [skills.sh](https://skills.sh/). Ho scelto solo fonti ufficiali o molto usate. L'installazione automatica in questa sessione è stata bloccata dalle regole di sicurezza dell'ambiente: i comandi sono qui sotto da lanciare a mano, dopo aver letto il contenuto della skill.

| Skill | Fonte | Installazioni | A cosa serve qui | Comando |
|---|---|---|---|---|
| agents | elevenlabs/skills (ufficiale ElevenLabs) | ~10.900 | Configurare e provare l'agente vocale, CLI `elevenlabs agents` | `npx skills add elevenlabs/skills@agents` |
| supabase | supabase/agent-skills (ufficiale Supabase) | ~341.000 | Funzioni edge, segreti, migrazioni, pg_cron | `npx skills add supabase/agent-skills@supabase` |
| supabase-postgres-best-practices | supabase/agent-skills (ufficiale) | ~459.000 | Regole RLS, indici, prestazioni dello schema | `npx skills add supabase/agent-skills@supabase-postgres-best-practices` |
| frontend-design | anthropics/skills (ufficiale Anthropic) | ~1.000.000 | Rifinire la grafica dei siti dei locali | `npx skills add anthropics/skills@frontend-design` |
| schema-markup | coreyhaines31/marketingskills | ~55.000 | Dati strutturati per la ricerca locale | `npx skills add coreyhaines31/marketingskills@schema-markup` |
| seo-local | agricidaniel/claude-seo | ~7.000 | Scheda Google e SEO locale dei clienti | `npx skills add agricidaniel/claude-seo@seo-local` |
| gdpr-data-handling | wshobson/agents | ~15.000 | Controllo incrociato delle procedure privacy (non sostituisce il consulente) | `npx skills add wshobson/agents@gdpr-data-handling` |

Già disponibili in questa sessione e usate: `xlsx` (foglio del cruscotto), `pdf` (lettura del prompt master).

Scartate: skill di prenotazione per singoli siti (installazioni sotto 500 o fonti sconosciute), skill di "lead scraping" (vietato dalla Parte 12.7: niente raccolta automatica di contatti).

Per un progetto: aggiungere `-g` per installarle per l'utente, oppure lasciarlo per installarle nel repository (cartella delle skill del progetto), così le trovano anche le sessioni future.
