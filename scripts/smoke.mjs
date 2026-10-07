/**
 * smoke.mjs — run the real public/app.js against a minimal DOM stub.
 *
 * There is no browser in CI, but the app's bugs are mostly of the kind that
 * show up as text: a field the data does not have, a template printing
 * "undefined", a page that throws halfway through. This harness loads the
 * actual module, lets boot() run, fires the map's load handler, opens every
 * page and fails if any page throws or prints a hole.
 *
 * Run: node scripts/smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ------------------------------------------------------------- DOM stub */
const cache = new Map();
const element = (selector = 'el') => {
  const el = {
    selector, innerHTML: '', textContent: '', hidden: false, scrollTop: 0,
    style: {}, dataset: {}, value: '', files: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    addEventListener() {}, appendChild() {}, insertAdjacentHTML() {}, focus() {}, click() {}, remove() {},
    querySelector: () => element('child'), querySelectorAll: () => [],
    closest: () => null,
  };
  return el;
};
const q = (selector) => {
  if (!cache.has(selector)) cache.set(selector, element(selector));
  return cache.get(selector);
};
const windowListeners = {};
const mapHandlers = {};

globalThis.document = {
  querySelector: q,
  querySelectorAll: () => [],
  createElement: () => element('created'),
  addEventListener() {},
  body: element('body'),
  title: '',
};
globalThis.window = {
  addEventListener: (ev, cb) => { (windowListeners[ev] ||= []).push(cb); },
  location: { pathname: '/', search: '', origin: 'http://localhost', href: 'http://localhost/' },
  innerWidth: 1280,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  history: { pushState() {}, replaceState() {} },
};
globalThis.location = globalThis.window.location;
globalThis.history = globalThis.window.history;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { onLine: true, serviceWorker: { register: () => Promise.resolve() } },
});
globalThis.localStorage = {
  _d: new Map(),
  getItem(k) { return this._d.has(k) ? this._d.get(k) : null; },
  setItem(k, v) { this._d.set(k, String(v)); },
  removeItem(k) { this._d.delete(k); },
};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
globalThis.caches = { open: () => Promise.resolve({ add: () => Promise.resolve() }) };
const calls = [];
globalThis.fetch = async (url) => {
  const u = String(url);
  calls.push(u);
  if (u.startsWith('/data/')) {
    return { ok: true, json: async () => JSON.parse(read(u)) };
  }
  if (u.includes('/api/crowd/summary')) return { ok: true, json: async () => ({ summary: { 'bagbazar-sarbojanin': { level: 'busy', at: Date.now(), note: 'test', count: 1 } } }) };
  if (u.includes('/api/crowd')) return { ok: true, status: 200, json: async () => ({ reports: [{ slug: 'bagbazar-sarbojanin', level: 'busy', at: Date.now() }] }) };
  return { ok: false, status: 404, json: async () => ({}) };
};
globalThis.maplibregl = {
  Map: class {
    constructor() { this._sources = new Map(); }
    on(ev, cb) { (mapHandlers[ev] ||= []).push(cb); }
    addControl() {}
    addSource(id, def) { this._sources.set(id, def); }
    addLayer(def) { if (!def || !def.id) throw new Error('layer without id'); if (def.source && !this._sources.has(def.source)) throw new Error(`layer ${def.id} refers to missing source ${def.source}`); }
    getSource(id) { return { setData() {} }; }
    setFilter() {}
    flyTo() {} fitBounds() {} easeTo() {}
    getZoom() { return 12; }
    getCanvas() { return { style: {} }; }
  },
  NavigationControl: class {}, ScaleControl: class {},
  LngLatBounds: class { extend() {} },
};

/* ------------------------------------------------------------------ run */
let failures = 0;
const fail = (msg) => { failures++; console.log('  ✗ ' + msg); };
const ok = (msg) => console.log('  ✓ ' + msg);

console.log('loading public/app.js against the stub DOM…');
await import(path.join(ROOT, 'public/app.js'));
for (const cb of windowListeners.DOMContentLoaded || []) cb();
await new Promise((r) => setTimeout(r, 200));
ok(`boot() ran (${calls.length} fetches: ${[...new Set(calls)].join(', ')})`);

for (const cb of mapHandlers.load || []) cb();
ok('map load handler ran (sources and layers added)');

const holes = (html) => {
  const bad = [];
  if (/undefined/.test(html)) bad.push('prints "undefined"');
  if (/NaN/.test(html)) bad.push('prints "NaN"');
  if (/\[object Object\]/.test(html)) bad.push('prints an object');
  if (/href="\/metro\/"/.test(html)) bad.push('links to an empty metro page');
  return bad;
};

const check = (label, selector) => {
  const html = cache.get(selector)?.innerHTML || '';
  if (!html.trim()) return fail(`${label}: empty (${selector})`);
  const bad = holes(html);
  if (bad.length) return fail(`${label}: ${bad.join(', ')}`);
  ok(`${label}: ${html.length} chars`);
};

check('list panel', '#list');
check('filter chips', '#chips');

/* the router is what decides which page to draw, so drive that directly */
const nav = async (url) => {
  globalThis.window.location.pathname = url;
  globalThis.window.location.search = '';
  for (const cb of windowListeners.popstate || []) cb();
  await new Promise((r) => setTimeout(r, 30));
};
const pageViews = [
  ['every pandal', '/pandals'],
  ['routes index', '/routes'],
  ['route detail', `/route/${JSON.parse(read('data/routes.json'))[0].slug}`],
  ['metro index', '/metro'],
  ['metro detail', `/metro/${JSON.parse(read('data/stations.json'))[0].slug}`],
  ['area detail', '/area/north-kolkata'],
  ['guide', '/guide'],
  ['live', '/live'],
  ['about', '/about'],
  ['legal', '/legal'],
  ['contact', '/contact'],
  ['press', '/press'],
  ['missing', '/not-a-page'],
];
for (const [label, url] of pageViews) {
  q('#page-inner').innerHTML = '';
  try {
    await nav(url);
    check(label, '#page-inner');
  } catch (err) {
    fail(`${label} threw: ${err.message}`);
  }
}

/* a pandal page and the plan drawer */
q('#page-inner').innerHTML = '';
try {
  await nav('/p/bagbazar-sarbojanin');
  check('pandal page + card', '#card');
} catch (err) {
  fail(`pandal page threw: ${err.message}`);
}
q('#drawer-body').innerHTML = '';
try {
  q('#drawer').hidden = true;                      // as it starts in the document
  if (q('#plan-open').onclick) q('#plan-open').onclick();
  check('plan drawer (empty state)', '#drawer-body');
} catch (err) {
  fail(`plan drawer threw: ${err.message}`);
}

if (process.env.DUMP) {
  const first = (cache.get('#list').innerHTML.match(/<li[\s\S]*?<\/li>/) || [''])[0];
  console.log('\n--- one list row ---\n' + first.trim());
  console.log('\n--- card ---\n' + cache.get('#card').innerHTML.slice(0, 1400));
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall smoke checks passed');
process.exit(failures ? 1 : 0);
