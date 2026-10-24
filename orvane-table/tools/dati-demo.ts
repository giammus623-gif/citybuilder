// Dati finti per la demo (Parte 2.2: "nessun lavoro gratis se non la demo
// con dati finti"). Nomi e numeri sono inventati.

import { eseguiStrumento, type ContestoStrumenti } from "../src/assistente/strumenti.ts";
import type { Archivio } from "../src/core/archivio.ts";
import type { ConfigurazioneLocale } from "../src/core/configurazione.ts";
import type { Messaggero } from "../src/core/messaggero.ts";
import { aggiungiGiorni, istanteDaLocale, istanteLocale, lunediDellaSettimana } from "../src/core/tempo.ts";
import { classifica } from "../src/rapporti/classificazione.ts";

const CLIENTI = ["Marco Ferri", "Giulia Conti", "Paolo Greco", "Elena Riva", "Luca Moretti", "Sara Gallo", "Andrea Costa", "Chiara Fontana"];

interface Chiamata {
  giorno: number;
  ora: number;
  strumenti: [string, Record<string, unknown>][];
  trascrizione: [string, string][];
  durata: number;
}

const CHIAMATE: Chiamata[] = [
  {
    giorno: 0,
    ora: 20 * 60 + 40,
    durata: 95,
    strumenti: [
      ["verifica_disponibilita", { data: "sabato", ora: "20:30", persone: 4 }],
      ["crea_prenotazione", { nome: "{cliente}", data: "sabato", ora: "20:30", persone: 4 }],
    ],
    trascrizione: [["cliente", "Buonasera, vorrei prenotare per sabato alle otto e mezza, siamo in quattro."], ["assistente", "C'è posto sabato alle 20:30 per 4 persone. A che nome?"]],
  },
  {
    giorno: 1,
    ora: 23 * 60 + 10,
    durata: 70,
    strumenti: [["crea_prenotazione", { nome: "{cliente}", data: "domani", ora: "13:00", persone: 2 }]],
    trascrizione: [["cliente", "So che siete chiusi, posso prenotare per domani a pranzo?"], ["assistente", "Certo: domani alle 13:00 per 2 persone."]],
  },
  {
    giorno: 1,
    ora: 13 * 60 + 5,
    durata: 40,
    strumenti: [["leggi_informazioni", { tema: "altro", domanda: "Avete un menu per bambini?" }]],
    trascrizione: [["cliente", "Avete un menu per bambini?"], ["assistente", "Questa informazione non ce l'ho. Posso lasciare un messaggio al titolare."]],
  },
  {
    giorno: 2,
    ora: 21 * 60,
    durata: 120,
    strumenti: [["crea_prenotazione", { nome: "{cliente}", data: "sabato", ora: "20:00", persone: 14, note: "cena aziendale" }]],
    trascrizione: [["cliente", "Siamo quattordici colleghi per sabato sera."], ["assistente", "Per gruppi oltre 8 persone la conferma la dà la titolare: registro la richiesta."]],
  },
  {
    giorno: 2,
    ora: 12 * 60 + 50,
    durata: 35,
    strumenti: [["leggi_informazioni", { tema: "parcheggio" }]],
    trascrizione: [["cliente", "C'è parcheggio vicino?"], ["assistente", "C'è un parcheggio pubblico gratuito a cento metri."]],
  },
  {
    giorno: 3,
    ora: 19 * 60 + 45,
    durata: 60,
    strumenti: [["leggi_informazioni", { tema: "altro", domanda: "Fate la carbonara senza guanciale per un vegetariano?" }], ["lascia_messaggio_al_titolare", { testo: "Chiede se si può fare la carbonara vegetariana per sabato", nome: "{cliente}" }]],
    trascrizione: [["cliente", "Fate la carbonara senza guanciale?"], ["assistente", "Non ho questa informazione: lascio un messaggio alla titolare."]],
  },
  {
    giorno: 4,
    ora: 20 * 60 + 15,
    durata: 9,
    strumenti: [],
    trascrizione: [["cliente", "Pronto? Non si sente..."]],
  },
];

/** `orologio` è l'ora usata dall'archivio: durante il popolamento segue le chiamate finte. */
export async function popolaDemo(
  archivio: Archivio,
  messaggero: Messaggero,
  config: ConfigurazioneLocale,
  adesso: Date,
  urlBase: string,
  orologio: { adesso: Date | null },
) {
  const oggi = istanteLocale(adesso, config.fusoOrario).data;
  const lunedi = lunediDellaSettimana(aggiungiGiorni(oggi, -7));
  let n = 0;
  for (const c of CHIAMATE) {
    const giorno = aggiungiGiorni(lunedi, c.giorno);
    const quando = istanteDaLocale(giorno, c.ora, config.fusoOrario);
    const id = `demo_${config.slug}_${n}`;
    const cliente = CLIENTI[n % CLIENTI.length];
    const telefono = `+3934700${String(1000 + n * 37).padStart(5, "0")}`;
    orologio.adesso = quando;
    const ctx: ContestoStrumenti = { archivio, messaggero, config, adesso: quando, urlBase, idConversazione: id, telefonoChiamante: telefono, canale: "telefono" };
    for (const [nome, ingresso] of c.strumenti) {
      const pieno = Object.fromEntries(Object.entries(ingresso).map(([k, v]) => [k, v === "{cliente}" ? cliente : v]));
      await eseguiStrumento(nome as never, ctx, pieno);
    }
    const registro = await archivio.registroConversazione(config.id, id);
    await archivio.salvaConversazione({
      localeId: config.id,
      idEsterno: id,
      canale: "telefono",
      iniziataIl: quando.toISOString(),
      durataSecondi: c.durata,
      telefonoChiamante: telefono,
      trascrizione: [
        { ruolo: "assistente", testo: `Buonasera, sono l'assistente virtuale di ${config.nome}: un sistema automatico.` },
        ...c.trascrizione.map(([r, t]) => ({ ruolo: r as "cliente" | "assistente", testo: t })),
      ],
      riassunto: null,
      scadeIl: new Date(quando.getTime() + config.assistente.conservazioneTrascrizioniGiorni * 86_400_000).toISOString(),
      esito: classifica({ durataSecondi: c.durata, esitoPiattaforma: "unknown", clienteSoddisfatto: null }, registro),
    });
    n++;
  }
  orologio.adesso = null;
  // una proposta nata dall'analisi della settimana, in attesa del titolare
  await archivio.creaModifica({
    localeId: config.id,
    tipo: "faq",
    descrizione: 'Rispondere sul menu bambini: "si possono ordinare mezze porzioni dei primi"',
    dati: { tema: "menu", domanda: "Avete un menu per bambini?", risposta: "Non c'è un menu bambini, ma si possono ordinare mezze porzioni dei primi." },
    motivo: "domanda senza risposta in settimana",
    origine: "analisi_settimanale",
    richiedeTitolare: false,
  });
  await archivio.creaModifica({
    localeId: config.id,
    tipo: "istruzione_assistente",
    descrizione: "Per gruppi sopra le 8 persone chiedere sempre l'occasione (compleanno, lavoro)",
    dati: { testo: "Per gruppi sopra le 8 persone chiedi l'occasione e scrivila nelle note." },
    motivo: "il titolare lo chiede ogni volta quando richiama",
    origine: "fondatore",
    richiedeTitolare: true,
  });
}
