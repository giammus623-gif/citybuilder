// Screenshot + measurement run (Part 0, rule 2). Usage: node tools/shoot.mjs [url] [outdir]
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4173/?test';
const out = process.argv[3] ?? 'screenshots';
import { mkdirSync } from 'node:fs';
mkdirSync(out, { recursive: true });
const exe = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({
  executablePath: exe,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

async function run(name, viewport, opts = {}) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: opts.dpr ?? 1,
    isMobile: opts.mobile ?? false,
    hasTouch: opts.mobile ?? false,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.cityLab && !!document.querySelector('.start-card'));
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${name}-1-start.png` });
  await page.evaluate(() => window.cityLab.start(4242, 'pizzeria'));
  await page.waitForFunction(() => window.cityLab.snap()?.pop !== undefined);
  await page.evaluate(() => window.cityLab.closePanel());
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.cityLab.layout();
    window.cityLab.speed(120);
  });
  // Run until the afternoon of day 2.
  await page.waitForFunction(
    () => {
      const s = window.cityLab.snap();
      return s && s.day >= 2 && s.tod > 14400 * 0.6;
    },
    null,
    { timeout: 120000, polling: 250 },
  );
  await page.evaluate(() => window.cityLab.speed(1));
  const [x, z] = await page.evaluate(() =>
    window.cityLab.tileCenter(window.cityLab.businessTile()),
  );
  await page.evaluate(([x, z]) => window.cityLab.camera(x - 1, z, 46, 40), [x, z]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-2-city.png` });
  await page.evaluate(() => window.cityLab.panel('business'));
  await page.evaluate(() => window.cityLab.debug(true));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${name}-3-panel.png` });
  await page.evaluate(() => {
    window.cityLab.closePanel();
    window.cityLab.debug(false);
  });
  await page.evaluate(([x, z]) => window.cityLab.camera(x, z, 16, 210), [x, z]);
  await page.evaluate(() => window.cityLab.speed(120));
  await page.waitForFunction(
    () => {
      const s = window.cityLab.snap();
      return s && s.day >= 3 && s.tod > 14400 * 0.88;
    },
    null,
    { timeout: 120000, polling: 200 },
  );
  await page.evaluate(() => window.cityLab.speed(0));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-4-night.png` });
  const snap = await page.evaluate(() => window.cityLab.snap());
  const mem = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
  console.log(JSON.stringify({ name, loadMs, snap, memMB: Math.round(mem / 1048576), errors }));
  await page.close();
}

await run('desktop', { width: 1440, height: 900 });
await run('phone', { width: 390, height: 844 }, { mobile: true, dpr: 2 });
await browser.close();
