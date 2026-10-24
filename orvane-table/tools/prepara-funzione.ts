// Copia src/ dentro supabase/functions/_shared/src per la pubblicazione della
// funzione Supabase, togliendo i file che usano solo Node.
import { cpSync, rmSync } from "node:fs";

const da = new URL("../src", import.meta.url).pathname;
const a = new URL("../supabase/functions/_shared/src", import.meta.url).pathname;
rmSync(a, { recursive: true, force: true });
cpSync(da, a, { recursive: true, filter: (f) => !f.endsWith("/adattatori/node.ts") });
console.log(`Copiato ${da} in ${a}. Ora: supabase functions deploy orvane-api`);
