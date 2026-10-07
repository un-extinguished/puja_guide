/**
 * Copies MapLibre GL out of node_modules into public/vendor, so the app
 * serves the map library from its own origin and needs no CDN at runtime.
 * Runs automatically after `npm install`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(ROOT, 'node_modules', 'maplibre-gl', 'dist');
const to = path.join(ROOT, 'public', 'vendor');

const files = ['maplibre-gl.js', 'maplibre-gl.css'];
if (!fs.existsSync(from)) {
  console.log('maplibre-gl is not installed; run npm install first.');
  process.exit(0);
}
fs.mkdirSync(to, { recursive: true });
for (const f of files) {
  fs.copyFileSync(path.join(from, f), path.join(to, f));
  console.log(`vendored ${f} (${(fs.statSync(path.join(to, f)).size / 1024).toFixed(0)} KB)`);
}
