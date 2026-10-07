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

const mapStub = ({ failOnMap = false } = {}) => {
  const handlers = {};
  return {
    Map: class {
      constructor() {
        if (failOnMap) throw new Error('Failed to initialize WebGL');
        this.sources = new Set();
        setTimeout(() => (handlers.load || []).forEach((cb) => cb()), 0);
      }
      on(ev, cb) { (handlers[ev] ||= []).push(cb); }
      addControl() {}
      addSource(id) { this.sources.add(id); }
      addLayer(d) { if (d.source && !this.sources.has(d.source)) throw new Error('missing source ' + d.source); }
      getSource() { return { setData() {} }; }
      setFilter() {}
      flyTo() {} fitBounds() {} easeTo() {}
      getZoom() { return 12; }
      getCanvas() { return { style: {} }; }
    },
    NavigationControl: class {},
    ScaleControl: class {},
    LngLatBounds: class { extend() {} },
  };
};

async function render({ maplibre, label }) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdom: ' + (e.message || e)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const dom = new JSDOM(indexHtml, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  window.fetch = fileFetch;
  window.caches = { open: async () => ({ add: async () => {} }) };
  window.addEventListener('unhandledrejection', (e) => errors.push('unhandled: ' + (e.reason?.message || e.reason)));
  if (maplibre) window.maplibregl = maplibre;
  window.eval(bundle);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 2000));

  const d = window.document;
  const result = {
    label,
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

console.log(failures ? `\n${failures} check(s) failed` : '\nrender test passed');
process.exit(failures ? 1 : 0);
