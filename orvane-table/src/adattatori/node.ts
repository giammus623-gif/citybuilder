// Utilità solo per Node: leggere i locali dai file e servire il gestore HTTP.

import { readdirSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { join } from "node:path";
import { leggiConfigurazione, type ConfigurazioneLocale } from "../core/configurazione.ts";

export function caricaLocali(cartella: string): ConfigurazioneLocale[] {
  return readdirSync(cartella)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .sort()
    .map((f) => {
      try {
        return leggiConfigurazione(JSON.parse(readFileSync(join(cartella, f), "utf8")));
      } catch (e) {
        throw new Error(`${f}: ${e instanceof Error ? e.message : e}`);
      }
    });
}

export function caricaLocale(cartella: string, slug: string): ConfigurazioneLocale {
  const trovato = caricaLocali(cartella).find((c) => c.slug === slug);
  if (!trovato) throw new Error(`Nessun locale con slug "${slug}" in ${cartella}`);
  return trovato;
}

async function corpo(req: IncomingMessage): Promise<Buffer> {
  const pezzi: Buffer[] = [];
  for await (const p of req) pezzi.push(p as Buffer);
  return Buffer.concat(pezzi);
}

/** Avvia un server Node che passa ogni richiesta a un gestore Request -> Response. */
export function servi(porta: number, gestore: (req: Request) => Promise<Response>): Server {
  const server = createServer(async (req, res) => {
    try {
      const metodo = req.method ?? "GET";
      const richiesta = new Request(`http://${req.headers.host ?? `localhost:${porta}`}${req.url ?? "/"}`, {
        method: metodo,
        headers: Object.entries(req.headers).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? v.join(", ") : v] as [string, string]])),
        body: metodo === "GET" || metodo === "HEAD" ? undefined : await corpo(req),
      });
      const risposta = await gestore(richiesta);
      res.writeHead(risposta.status, Object.fromEntries(risposta.headers.entries()));
      res.end(Buffer.from(await risposta.arrayBuffer()));
    } catch (e) {
      console.error(e);
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("Errore interno");
    }
  });
  server.listen(porta);
  return server;
}
