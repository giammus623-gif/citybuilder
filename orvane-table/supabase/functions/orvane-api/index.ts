// Funzione Supabase (Deno) che espone l'API di Orvane Table.
// Prima della pubblicazione `npm run prepara-funzione` copia src/ in
// supabase/functions/_shared/src (la CLI include solo ciò che sta sotto functions/).
// Variabili d'ambiente: src/ambiente.ts. Passi completi: docs/DEPLOY.md.

import postgres from "postgres";
import { sqlDaPostgresJs } from "../_shared/src/adattatori/archivio-postgres.ts";
import { creaGestore } from "../_shared/src/api/gestore.ts";
import { creaAmbiente } from "../_shared/src/ambiente.ts";

// SUPABASE_DB_URL è fornita da Supabase alle funzioni; prepare: false serve con il pooler
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 3 });
const gestore = creaGestore(creaAmbiente((n) => Deno.env.get(n), sqlDaPostgresJs(sql)));

Deno.serve(gestore);
