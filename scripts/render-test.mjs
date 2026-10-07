#!/usr/bin/env node
/**
 * render-test.mjs — load the real index.html and the real app.js in a real
 * DOM, and check the thing that actually broke once: what happens when the
 * 3D map cannot start.
 *
 * The map is the least important thing on the page. The list, the pandal
 * cards, the routes and every other page must survive its failure — a blocked
 * tile server, a browser without WebGL, or a map library that never loads.
 *
 *   npm i -D jsdom esbuild     (dev only; the app itself needs neither)
 *   npm run test:render
 *
 * Skips with a message when the two dev tools are not installed.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let JSDOM, VirtualConsole, esbuild;
try {
  ({ JSDOM, VirtualConsole } = await import('jsdom'));
  esbuild = (await import('esbuild')).default ?? (await import('esbuild'));
} catch {
  console.log('skipped: render-test needs the dev tools. Install them with:');
  console.log('    npm i -D jsdom esbuild');
  process.exit(0);
}

/* the app as the browser sees it: one classic script, as bundled */
const bundlePath = path.join(os.tmpdir(), 'pujaguide-render-test.js');
await esbuild.build({
  entryPoints: [path.join(ROOT, 'public', 'app.js')],
  bundle: true, format: 'iife', outfile: bundlePath, logLevel: 'silent',
});
const bundle = fs.readFileSync(bundlePath, 'utf8');

const indexHtml = read('public/index.html')
  .replace(/<script src="\/vendor\/maplibre-gl\.js[^"]*"><\/script>/, '')
  .replace(/<script type="module" src="\/app\.js[^"]*"><\/script>/, '');

/* serve the app's own fetches out of the repository, so no server is needed */
const fileFetch = async (url) => {
  const p = String(url);
  if (p.startsWith('/data/')) {
    return { ok: true, status: 200, json: async () => JSON.parse(read('data/' + p.slice('/data/'.length))) };
  }
  if (p.includes('/api/crowd/summary')) return { ok: true, json: async () => ({ summary: {} }) };
  if (p.includes('/api/crowd')) return { ok: true, json: async () => ({ reports: [] }) };
  return { ok: false, status: 404, json: async () => ({}) };
};

const mapsBuilt = [];
const mapStub = ({ failOnMap = false } = {}) => {
  const handlers = {};
  return {
    Map: class {
      constructor() {
        if (failOnMap) throw new Error('Failed to initialize WebGL');
        mapsBuilt.push(this);
        this.sources = new Set();
        setTimeout(() => (handlers.load || []).forEach((cb) => cb()), 0);
      }
      on(ev, cb) { (handlers[ev] ||= []).push(cb); }
      addControl() {}
      addSource(id) { this.sources.add(id); }
      addLayer(d) { if (d.source && !this.sources.has(d.source)) throw new Error('missing source ' + d.source); }
      getSource() { return { setData() {} }; }
      setFilter() {}
      setLayoutProperty(id, k, v) { (this.layout ||= {})[id] = { ...(this.layout?.[id] || {}), [k]: v }; }
      setPaintProperty() {}
      flyTo() {} fitBounds() {} easeTo() {}
      getZoom() { return 12; }
      getCanvas() { return { style: {} }; }
    },
    NavigationControl: class {},
    ScaleControl: class {},
    LngLatBounds: class { extend() {} },
  };
};

async function render({ maplibre, label, url = 'http://localhost/', type = '', clicks = [], narrow = false }) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdom: ' + (e.message || e)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const dom = new JSDOM(indexHtml, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  window.fetch = fileFetch;
  window.caches = { open: async () => ({ add: async () => {} }) };
  window.addEventListener('unhandledrejection', (e) => errors.push('unhandled: ' + (e.reason?.message || e.reason)));
  /* pretend this is a phone. 'media' means the browser has matchMedia,
     'width' means it does not and we fall back to innerWidth. */
  if (narrow) {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true });
    if (narrow === 'media') {
      window.matchMedia = (q) => ({
        matches: /max-width/.test(q), media: q,
        addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
      });
    }
  }
  if (maplibre) window.maplibregl = maplibre;
  mapsBuilt.length = 0;
  window.eval(bundle);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 2000));

  const d = window.document;
  /* type into the search box, the way a visitor would */
  if (type) {
    const input = d.querySelector('#q');
    input.value = type;
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  const result = {
    label,
    suggests: [...d.querySelectorAll('#suggest .suggest-item')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()),
    toggleLabel: (d.querySelector('#panel-toggle-label')?.textContent || '').slice(0, 40),
    collapsed: d.querySelector('.panel-head')?.classList.contains('collapsed') === true,
    photo: (d.querySelector('.card .photo img')?.getAttribute('src') || ''),
    photoCredit: (d.querySelector('.card .photo figcaption')?.textContent || '').slice(0, 90),
    pageText: (d.querySelector('#page')?.textContent || '').replace(/\s+/g, ' ').trim(),
    items: d.querySelectorAll('#list .item').length,
    count: d.querySelector('#count')?.textContent || '',
    chips: d.querySelectorAll('#chips .chip').length,
    mapNote: d.querySelector('.map-note p')?.textContent || '',
    drawer: {
      hidden: d.querySelector('#drawer')?.hasAttribute('hidden') === true,
      body: (d.querySelector('#drawer-body')?.innerHTML || '').length,
    },
    cardHidden: d.querySelector('#card')?.hasAttribute('hidden') === true,
    pageHidden: d.querySelector('#page')?.hasAttribute('hidden') === true,
    legendHidden: d.querySelector('#map-legend')?.hasAttribute('hidden') === true,
    realErrors: errors.filter((e) => !/map failed to start/.test(e)),
  };
  /* things a visitor can press, in order */
  for (const sel of clicks) {
    const el = d.querySelector(sel);
    if (!el) { errors.push('nothing to click for ' + sel); continue; }
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
  }
  if (clicks.length) {
    const m = mapsBuilt[mapsBuilt.length - 1];
    result.after = {
      collapsed: d.querySelector('.panel-head')?.classList.contains('collapsed') === true,
      toggleLabel: (d.querySelector('#panel-toggle-label')?.textContent || '').slice(0, 40),
      toggleAria: d.querySelector('#panel-toggle')?.getAttribute('aria-expanded'),
      linesPressed: d.querySelector('#map-lines')?.getAttribute('aria-pressed'),
      linesVisibility: String((m?.layout || {})['metro-lines']?.visibility || ''),
      stored: String(window.localStorage.getItem('pujaguide.headCollapsed')),
      legendHidden: d.querySelector('#map-legend')?.hasAttribute('hidden') === true,
      realErrors: errors.filter((e) => !/map failed to start/.test(e)),
    };
  }
  window.close();
  return result;
}

let failures = 0;
const expect = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { failures++; console.log('  ✗ ' + msg); } };

console.log('the page with a working map');
{
  const r = await render({ maplibre: mapStub(), label: 'ok' });
  expect(r.items > 40, `${r.items} pandals listed (expected more than 40)`);
  expect(/pandals/.test(r.count), `count line reads "${r.count}"`);
  expect(r.chips >= 5, `${r.chips} filter chips`);
  expect(!r.mapNote, 'no map warning shown');
  expect(r.realErrors.length === 0, r.realErrors.length ? 'unexpected errors: ' + r.realErrors.join(' | ') : 'no unexpected errors');
}

console.log('\nthe page when the map cannot start (no WebGL, blocked worker)');
{
  const r = await render({ maplibre: mapStub({ failOnMap: true }), label: 'throws' });
  expect(r.items > 40, `${r.items} pandals still listed`);
  expect(/pandals/.test(r.count), `count line still reads "${r.count}"`);
  expect(/could not start/.test(r.mapNote), 'the map area explains itself');
  expect(r.realErrors.length === 0, r.realErrors.length ? 'unexpected errors: ' + r.realErrors.join(' | ') : 'no unexpected errors');
}

console.log('\nthe page when the map library never loads (/vendor missing, blocked script)');
{
  const r = await render({ maplibre: null, label: 'missing' });
  expect(r.items > 40, `${r.items} pandals still listed`);
  expect(r.chips >= 5, `${r.chips} filter chips`);
  expect(/did not load/.test(r.mapNote), 'the map area explains itself');
  expect(r.realErrors.length === 0, r.realErrors.length ? 'unexpected errors: ' + r.realErrors.join(' | ') : 'no unexpected errors');
}

console.log('\npanels that must stay shut until asked for');
{
  /* The bug this guards: the route drawer carries the `hidden` attribute, but
     `.drawer { display: flex }` is an author rule and therefore beats the
     browser's built-in [hidden] { display: none }. The drawer was simply
     always on screen — open, empty, over the whole app — which is what a
     visitor saw instead of the map. */
  const css = read('public/style.css');
  const guard = /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/i.test(css);
  expect(guard, 'style.css forces [hidden] to display:none !important (author display rules otherwise win)');

  const r = await render({ maplibre: mapStub(), label: 'panels' });
  expect(r.drawer.hidden, 'the route drawer starts hidden');
  expect(r.drawer.body > 0, 'the route drawer has its explanation written into it (never a blank slab)');
  expect(r.cardHidden, 'the pandal card starts hidden');
  expect(r.pageHidden, 'the page overlay starts hidden');
  expect(r.legendHidden, 'the crowd legend starts hidden');
  expect(r.realErrors.length === 0, r.realErrors.length ? 'unexpected errors: ' + r.realErrors.join(' | ') : 'no unexpected errors');
}

console.log('\nsearch suggestions');
{
  const r = await render({ maplibre: mapStub(), label: 'search', type: 'dum' });
  expect(r.suggests.length > 0, `typing "dum" suggests ${r.suggests.length} things`);
  expect(r.suggests.some((t) => /Dum Dum Park/i.test(t)), 'the Dum Dum Park pujas are among them');
  expect(r.suggests.some((t) => /Dum Dum Park Yubak Brinda/i.test(t)), 'including Yubak Brinda, added from the visitor report');
  expect(r.suggests.some((t) => /Sarbojanin/i.test(t)), 'including Dum Dum Park Sarbojanin');
}

console.log('\nthe heading folds away on a phone');
{
  const r = await render({ maplibre: mapStub(), label: 'narrow', url: 'http://localhost/' });
  expect(typeof r.toggleLabel === 'string' && r.toggleLabel.length > 0, `the toggle is labelled "${r.toggleLabel}"`);
}

console.log('\na pandal with a photograph');
{
  const r = await render({ maplibre: mapStub(), label: 'photo', url: 'http://localhost/p/chalta-bagan' });
  expect(r.items > 40, 'the list is still there behind the card');
  expect(/Special:FilePath/.test(r.photo), r.photo ? 'the card shows a Commons photograph' : 'the card shows no photograph');
  expect(/CC BY-SA 4\.0/.test(r.photoCredit), `credited with its licence: ${r.photoCredit}`);
  expect(/Wikimedia Commons/.test(r.photoCredit), 'and says where it came from');
  expect(r.realErrors.length === 0, r.realErrors.length ? 'unexpected errors: ' + r.realErrors.join(' | ') : 'no unexpected errors');
}

console.log('\nthe buttons a visitor presses');
{
  const r = await render({ maplibre: mapStub(), label: 'buttons', clicks: ['#panel-toggle', '#panel-toggle', '#map-lines'] });
  const a = r.after || {};
  expect(a.collapsed === false, 'pressing the heading toggle twice leaves the heading open again');
  expect(a.stored === 'false', `the choice is remembered (headCollapsed=${a.stored})`);
  expect(a.toggleAria === 'true', 'the toggle tells a screen reader the panel is expanded');
  expect(typeof a.toggleLabel === 'string' && a.toggleLabel.length > 0, `still labelled "${a.toggleLabel}"`);
  expect(a.linesPressed === 'false', 'the metro lines button reports the lines as hidden after one press');
  expect(a.linesVisibility === 'none', 'and the map layer is actually switched off');
  expect(a.realErrors.length === 0, a.realErrors.length ? 'unexpected errors: ' + a.realErrors.join(' | ') : 'no unexpected errors');
}

console.log('\ncollapse is the default on a phone');
for (const [mode, how] of [['media', 'with matchMedia'], ['width', 'without matchMedia']]) {
  const r = await render({ maplibre: mapStub(), label: 'phone-' + mode, narrow: mode, clicks: ['#panel-toggle'] });
  const a = r.after || {};
  expect(r.collapsed === true, `the heading starts folded ${how}`);
  expect(a.collapsed === false, `and opens when the visitor presses the toggle (${how})`);
  expect(a.stored === 'false', `the open choice is remembered (${how})`);
  expect(a.realErrors.length === 0, a.realErrors.length ? 'unexpected errors: ' + a.realErrors.join(' | ') : `no unexpected errors (${how})`);
}

console.log('\nthe numbers on the pages match the data');
{
  const meta = JSON.parse(read('data/meta.json'));
  /* table cells butt against their headers in textContent ("Pandals mapped283"),
     so look for a number that is not part of a longer one */
  const has = (t, n) => new RegExp('(^|[^0-9])' + n + '([^0-9]|$)').test(t);
  const pages = {
    about: [[meta.pandalCount, 'pandals'], [meta.stationCount, 'metro stations'],
            [meta.lineCount, 'metro lines'], [meta.photoCount, 'photographs']],
    press: [[meta.lineCount, 'metro lines'], [meta.routeCount, 'walking routes'], [meta.photoCount, 'photographs']],
    contact: [[meta.photoCount, 'photographs']],
  };
  for (const [page, numbers] of Object.entries(pages)) {
    const r = await render({ maplibre: mapStub(), label: page, url: 'http://localhost/' + page });
    expect(r.pageText.length > 400, `/${page} has content`);
    for (const [n, what] of numbers) {
      expect(has(r.pageText, n), `/${page} says ${n} ${what}, as the data does`);
    }
    if (page === 'about' || page === 'contact') {
      expect(!/does not display photographs yet/.test(r.pageText), `/${page} no longer claims photographs are not shown`);
    }
  }
}

console.log(failures ? `\n${failures} check(s) failed` : '\nrender test passed');
process.exit(failures ? 1 : 0);
