/**
 * fetch-pujamap.mjs — retrieve the live pujamap.com pandal catalogue and save
 * it as a structured reference file for the Phase-2 synchronisation.
 *
 * The catalogue lives in an Elementor HTML widget on /puja-pandel-list/ as two
 * hard-coded JS arrays (southPandals / northPandals). We pull the page via the
 * WordPress REST API, extract those arrays, and write
 * data/ref/pujamap-catalogue.json.
 *
 * Run: node scripts/fetch-pujamap.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'data', 'ref');

const PAGE = 'https://pujamap.com/wp-json/wp/v2/pages/239?_fields=id,title,content';
const extract = (src, name) => {
  const m = src.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`could not find ${name} array`);
  /* the objects use unquoted keys; quote them so JSON.parse accepts the array */
  const json = m[1].replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*):/g, '$1"$2":');
  return JSON.parse(`[${json}]`.replace(/,\s*([}\]])/g, '$1'));
};

const res = await fetch(PAGE, { headers: { 'user-agent': 'PujaHop-sync-bot (data audit)' } });
if (!res.ok) throw new Error(`GET ${PAGE} -> ${res.status}`);
const page = await res.json();
const html = page.content?.rendered || '';
if (!html.includes('southPandals')) throw new Error('page content does not contain the pandal arrays');

const south = extract(html, 'southPandals');
const north = extract(html, 'northPandals');
const all = [...south, ...north].map((p, i) => ({
  id: i + 1,
  name: p.nameEn,
  nameBn: p.name,
  area: south.includes(p) ? 'south' : 'north',
  address: p.addressEn,
  addressBn: p.address,
  lat: p.lat,
  lng: p.lng,
}));

fs.mkdirSync(OUT_DIR, { recursive: true });
const out = {
  fetchedAt: new Date().toISOString(),
  source: 'https://pujamap.com/puja-pandel-list/ (embedded widget, extracted via WP REST API page 239)',
  note: 'The site exposes exactly this one catalogue widget: names, a locality word, and 4-decimal coordinates. There are no per-pandal detail pages and no map pins beyond these values.',
  count: all.length,
  southCount: south.length,
  northCount: north.length,
  pandals: all,
};
fs.writeFileSync(path.join(OUT_DIR, 'pujamap-catalogue.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`saved ${all.length} pujamap entries (${south.length} south, ${north.length} north) -> data/ref/pujamap-catalogue.json`);