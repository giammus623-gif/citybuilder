import { describe, expect, it } from "vitest";
import { generaSito } from "../src/sito/genera.ts";
import { mescola } from "../src/sito/stile.ts";
import { configPizzeria, configTrattoria } from "./aiuto.ts";

describe("sito del locale", () => {
  it("genera tutte le pagine con telefono, orari e pulsante di prenotazione", () => {
    const file = generaSito(configTrattoria(), { apiBase: "https://api.esempio.invalid", urlSito: "https://trattoria.esempio.invalid" });
    expect([...file.keys()].sort()).toEqual(
      ["contatti.html", "index.html", "locale.html", "menu.html", "prenota.html", "privacy.html", "robots.txt", "sitemap.xml", "stile.css"].sort(),
    );
    for (const nome of ["index.html", "menu.html", "locale.html", "prenota.html", "contatti.html"]) {
      const html = file.get(nome)!;
      expect(html).toContain('href="tel:+390600000001"');
      expect(html).toContain('href="prenota.html"');
      expect(html).toContain('class="orari"');
      expect(html).toContain('href="privacy.html"');
    }
    expect(file.get("prenota.html")).toContain('data-api="https://api.esempio.invalid/api/demo-trattoria"');
  });

  it("include dati strutturati validi per un ristorante", () => {
    const html = generaSito(configTrattoria(), { urlSito: "https://trattoria.esempio.invalid" }).get("index.html")!;
    const json = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)![1];
    const dati = JSON.parse(json);
    expect(dati).toMatchObject({ "@type": "Restaurant", name: "Trattoria La Prova", telephone: "+390600000001", priceRange: "€€" });
    expect(dati.openingHoursSpecification).toContainEqual({ "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "19:00", closes: "23:00" });
    expect(dati.hasMenu).toBe("https://trattoria.esempio.invalid/menu.html");
  });

  it("mostra il menu in testo con allergeni numerati e l'avviso per il personale", () => {
    const menu = generaSito(configTrattoria()).get("menu.html")!;
    expect(menu).toContain("Cacio e pepe");
    expect(menu).toContain("11,00 €");
    expect(menu).toContain('<abbr title="cereali contenenti glutine">1</abbr>');
    expect(menu).toContain("chiedete sempre al personale");
    expect(menu).not.toContain(".pdf");
  });

  it("non parla di assistente virtuale nel pacchetto Start", () => {
    const pizzeria = configPizzeria();
    expect(pizzeria.pacchetto).toBe("start");
    for (const [nome, contenuto] of generaSito(pizzeria)) {
      expect(contenuto, nome).not.toMatch(/assistente virtuale/i);
    }
    const trattoria = generaSito(configTrattoria());
    expect(trattoria.get("privacy.html")).toMatch(/assistente virtuale/);
  });

  it("senza API il modulo rimanda al telefono e i locali demo non vanno indicizzati", () => {
    const file = generaSito(configTrattoria());
    expect(file.get("prenota.html")).not.toContain("<form");
    expect(file.get("index.html")).toContain('<meta name="robots" content="noindex">');
    expect(file.get("robots.txt")).toContain("Disallow: /");
  });

  it("protegge dai caratteri speciali nei testi della configurazione", () => {
    const config = configTrattoria();
    config.sito.slogan = '<script>alert("x")</script>';
    const html = generaSito(config).get("index.html")!;
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;");
  });

  it("calcola i colori derivati senza color-mix", () => {
    expect(mescola("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(generaSito(configTrattoria()).get("stile.css")).not.toContain("color-mix");
  });
});
