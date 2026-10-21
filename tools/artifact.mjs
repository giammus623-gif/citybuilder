// Turns `vite build --mode artifact` output into one self-contained HTML page.
// Usage: node tools/artifact.mjs dist-artifact out.html
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist-artifact';
const out = process.argv[3] ?? 'city-lab.html';
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const assets = readdirSync(join(dir, 'assets'));
const css = assets
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join(dir, 'assets', f), 'utf8'))
  .join('\n');
const js = assets
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(join(dir, 'assets', f), 'utf8'))
  .join('\n');
const head = html
  .match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>/, '')
  .replace(/<meta name="viewport"[^>]*>/, '')
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<link rel="stylesheet" crossorigin href="[^"]*assets[^"]*">/g, '')
  .replace(/<link rel="modulepreload"[^>]*>/g, '');
const page = `${head.trim()}
<style>${css}</style>
<div id="app"></div>
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
`;
writeFileSync(out, page);
console.log(`${out}: ${(page.length / 1024).toFixed(0)} KB`);
