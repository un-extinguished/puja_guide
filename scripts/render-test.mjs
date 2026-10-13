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
    return { ok: true, status: 200, json: async () => JSON.parse(read('data/' + p.slice('/data/'.length).split('?')[0])) };
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
      setFilter(id, filter) { (this.filters ||= {})[id] = filter; }
      setLayoutProperty(id, k, v) { (this.layout ||= {})[id] = { ...(this.layout?.[id] || {}), [k]: v }; }
      setPaintProperty() {}
      flyTo() {} fitBounds() {} easeTo() {} resize() {}
      getZoom() { return 12; }
      getCanvas() { return { style: {} }; }
    },
    NavigationControl: class {},
    ScaleControl: class {},
    LngLatBounds: class { extend() {} },
  };
};

async function render({ maplibre, label, url = 'http://localhost/', type = '', clicks = [], narrow = false, storage = null, uncheckMetro = false }) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdom: ' + (e.message || e)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const dom = new JSDOM(indexHtml, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  window.fetch = fileFetch;
  window.caches = { open: async () => ({ add: async () => {} }) };
  if (storage) for (const [k, v] of Object.entries(storage)) window.localStorage.setItem(k, v);
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
    sheet: d.querySelector('#panel')?.dataset.sheet || '',
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
    theme: d.documentElement.getAttribute('data-theme') || '',
    realErrors: errors.filter((e) => !/map failed to start/.test(e)),
  };
  /* things a visitor can press, in order */
  for (const sel of clicks) {
    const el = d.querySelector(sel);
    if (!el) { errors.push('nothing to click for ' + sel); continue; }
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
  }
  if (uncheckMetro) {
    const line = d.querySelector('#metro-line-options input[data-line]');
    line.checked = false;
    line.dispatchEvent(new window.Event('change', { bubbles: true }));
  }
  if (clicks.length) {
    const m = mapsBuilt[mapsBuilt.length - 1];
    result.after = {
      sheet: d.querySelector('#panel')?.dataset.sheet || '',
      toggleLabel: (d.querySelector('#panel-toggle-label')?.textContent || '').slice(0, 40),
      toggleAria: d.querySelector('#panel-toggle')?.getAttribute('aria-expanded'),
      linesPressed: d.querySelector('#map-lines')?.getAttribute('aria-pressed'),
      linesExpanded: d.querySelector('#map-lines')?.getAttribute('aria-expanded'),
      metroDrawerHidden: d.querySelector('#metro-drawer')?.hasAttribute('hidden') === true,
      visibleLineCount: d.querySelectorAll('#metro-line-options input:checked').length,
      lineFilter: JSON.stringify((m?.filters || {})['metro-lines'] || ''),
      legendHidden: d.querySelector('#map-legend')?.hasAttribute('hidden') === true,
      mode: d.querySelector('#layout')?.dataset.mode || '',
      viewListPressed: d.querySelector('#view-list')?.getAttribute('aria-pressed'),
      locale: d.documentElement.lang,
      count: d.querySelector('#count')?.textContent || '',
      listItems: d.querySelectorAll('#list .item').length,
      vipChipText: (d.querySelector('#chips button[data-kind="vip"]')?.textContent || '').replace(/\s+/g, ' ').trim(),
      theme: d.documentElement.getAttribute('data-theme') || '',
      themeLabel: (d.querySelector('#theme-toggle')?.textContent || '').trim(),
      themeStored: window.localStorage.getItem('pujahop.theme'),
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

console.log('\nthe pandal sheet has a labelled collapsed state');
{
  const r = await render({ maplibre: mapStub(), label: 'narrow', url: 'http://localhost/' });
  expect(typeof r.toggleLabel === 'string' && r.toggleLabel.length > 0, `the toggle is labelled "${r.toggleLabel}"`);
  expect(r.sheet === 'collapsed', 'the map opens with its pandal sheet collapsed');
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

console.log('\nthe sheet snaps and metro layers toggle');
{
  const r = await render({ maplibre: mapStub(), label: 'buttons', clicks: ['#panel-toggle', '#panel-toggle', '#map-lines'], uncheckMetro: true });
  const a = r.after || {};
  expect(a.sheet === 'full', 'the results handle cycles from collapsed through half to full');
  expect(a.toggleAria === 'true', 'the toggle tells a screen reader the panel is expanded');
  expect(typeof a.toggleLabel === 'string' && a.toggleLabel.length > 0, `still labelled "${a.toggleLabel}"`);
  expect(a.linesPressed === 'true' && a.linesExpanded === 'true', 'the metro button opens its layer drawer without hiding routes');
  expect(a.metroDrawerHidden === false, 'the metro drawer is visible when opened');
  expect(a.visibleLineCount === 4, `toggling one line leaves ${a.visibleLineCount} of five metro lines visible`);
  expect(a.lineFilter.includes('"literal"'), 'the map layer filter is updated with the selected routes');
  expect(a.realErrors.length === 0, a.realErrors.length ? 'unexpected errors: ' + a.realErrors.join(' | ') : 'no unexpected errors');
}

console.log('\nthe sheet opens from its handle on a phone');
for (const [mode, how] of [['media', 'with matchMedia'], ['width', 'without matchMedia']]) {
  const r = await render({ maplibre: mapStub(), label: 'phone-' + mode, narrow: mode, clicks: ['#panel-toggle'] });
  const a = r.after || {};
  expect(r.sheet === 'collapsed', `the results sheet starts collapsed ${how}`);
  expect(a.sheet === 'half', `and opens to its half position when tapped (${how})`);
  expect(a.realErrors.length === 0, a.realErrors.length ? 'unexpected errors: ' + a.realErrors.join(' | ') : `no unexpected errors (${how})`);
}

console.log('\nmap/list, language, and quick-filter controls');
{
  const r = await render({
    maplibre: mapStub(),
    label: 'view-language-filter',
    clicks: ['#view-list', '#language-toggle', '#chips button[data-kind="quick"]'],
  });
  expect(r.after?.mode === 'list' && r.after?.viewListPressed === 'true', 'the list view is selectable and announced');
  expect(r.after?.locale === 'bn' && /প্যান্ডেল/.test(r.after?.count || ''), 'the Bengali switch translates the count and document language');
  expect(r.after?.listItems === 10 && /10/.test(r.after?.count || ''), 'the closest-ten filter returns exactly ten pandals');
  expect(r.after?.realErrors.length === 0, r.after?.realErrors.length ? 'unexpected errors: ' + r.after.realErrors.join(' | ') : 'new controls produce no unexpected errors');
}

console.log('\nthe VIP pass filter');
{
  const meta = JSON.parse(read('data/meta.json'));
  const r = await render({
    maplibre: mapStub(),
    label: 'vip-filter',
    clicks: ['#chips button[data-kind="vip"]', '#load-more'],
  });
  expect(new RegExp(`VIP Pandals \\(${meta.vipCount}\\)`).test(r.after?.vipChipText || ''), `the chip is labelled "${r.after?.vipChipText}"`);
  expect(r.after?.listItems === meta.vipCount && new RegExp(`${meta.vipCount} of ${meta.pandalCount}`).test(r.after?.count || ''), `the VIP filter keeps exactly the ${r.after?.listItems} pass pandals`);
  expect(r.after?.realErrors.length === 0, r.after?.realErrors.length ? 'unexpected errors: ' + r.after?.realErrors.join(' | ') : 'the VIP filter produces no errors');
}

console.log('\nthe VIP filter toggles off and composes with other filters');
{
  const meta = JSON.parse(read('data/meta.json'));
  const r = await render({
    maplibre: mapStub(),
    label: 'vip-toggle-off',
    clicks: ['#chips button[data-kind="vip"]', '#chips button[data-kind="vip"]'],
  });
  expect(r.after?.listItems > 40, `toggling the VIP chip off restores the full ${r.after?.listItems}-pandal list`);
  expect(new RegExp(`VIP Pandals \\(${meta.vipCount}\\)`).test(r.after?.vipChipText || ''), 'the chip keeps showing the live count while off');
  expect(r.after?.realErrors.length === 0, r.after?.realErrors.length ? 'unexpected errors: ' + r.after.realErrors.join(' | ') : 'toggling the VIP chip produces no errors');
}
{
  const meta = JSON.parse(read('data/meta.json'));
  const r = await render({
    maplibre: mapStub(),
    label: 'vip-combined',
    clicks: ['#chips button[data-kind="vip"]', '#chips button[data-kind="quick"]'],
  });
  expect(r.after?.listItems === 10, `VIP + closest-ten compose: ${r.after?.listItems} of ${meta.vipCount} VIP pandals appear`);
  expect(r.after?.realErrors.length === 0, r.after?.realErrors.length ? 'unexpected errors: ' + r.after?.realErrors.join(' | ') : 'combined filters produce no errors');
}

console.log('\nthe metro page, line by line');
{
  const r = await render({ maplibre: mapStub(), label: 'metro', url: 'http://localhost/metro' });
  const t = r.pageText;
  expect(/Blue Line/.test(t) && /Green Line/.test(t) && /Yellow Line/.test(t), 'the lines are listed with their stations');
  expect(/Jai Hind/.test(t), 'the Yellow Line lists Jai Hind, the airport station');
  expect(/Dum Dum Cantonment/.test(t), 'and Dum Dum Cantonment');
  expect(!/Michael Nagar/.test(t), 'but not Michael Nagar, which is not open');
  expect(/Barun Sengupta/.test(t) && /not drawn/.test(t), 'a station with no coordinate we trust is named and marked as not drawn');
  expect(/published station coordinates/.test(t), 'the page says the lines join published coordinates, not a survey');
  expect(r.realErrors.length === 0, r.realErrors.length ? 'unexpected errors: ' + r.realErrors.join(' | ') : 'no unexpected errors');
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
    help: [],
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

console.log('\nthe intro preloader');
{
  const preloaderCode = read('public/preloader.js');
  const makeDom = () => new JSDOM(indexHtml, {
    url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true,
  });

  /* fresh session: it shows, locks scroll, rains gold, and Skip Intro clears it */
  {
    const w = makeDom().window;
    w.eval(preloaderCode);
    const d = w.document;
    const particles = d.querySelectorAll('.ph-particle').length;
    expect(!!d.getElementById('ph-preloader'), 'the overlay is present on a fresh session');
    expect(d.documentElement.classList.contains('ph-lock'), 'scroll is locked while the intro plays');
    expect(particles > 0, `${particles} golden particles were generated`);
    expect(!!d.getElementById('ph-skip'), 'the Skip Intro button exists');
    expect(/PujaHop/.test(d.querySelector('.ph-intro-title')?.textContent || ''), 'the overlay is branded PujaHop Kolkata');
    d.getElementById('ph-skip').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 850));
    expect(!d.getElementById('ph-preloader'), 'Skip Intro removes the overlay');
    expect(!d.documentElement.classList.contains('ph-lock'), 'scroll is unlocked after skipping');
    expect(w.sessionStorage.getItem('pujahop.introSeen') === '1', 'the session is marked as seen');
    w.close();
  }

  /* a second view in the same session goes straight to the app */
  {
    const w = makeDom().window;
    w.sessionStorage.setItem('pujahop.introSeen', '1');
    w.eval(preloaderCode);
    expect(!w.document.getElementById('ph-preloader'), 'a second view in the same session skips the intro');
    expect(!w.document.documentElement.classList.contains('ph-lock'), 'and never locks scroll');
    w.close();
  }

  /* reduced motion: no particles, and the app hand-over clears it at once */
  {
    const w = makeDom().window;
    w.matchMedia = (q) => ({ matches: /reduce/.test(q), addEventListener() {}, removeEventListener() {} });
    w.eval(preloaderCode);
    expect(w.document.querySelectorAll('.ph-particle').length === 0, 'reduced motion drops the particles');
    w.__pujahopReady = true;
    w.dispatchEvent(new w.Event('pujahop:reveal'));
    await new Promise((r) => setTimeout(r, 120));
    expect(!w.document.getElementById('ph-preloader'), 'the app hand-over removes the overlay (reduced motion)');
    w.close();
  }

  /* the ordinary hand-over respects a short minimum beat before revealing */
  {
    const w = makeDom().window;
    w.eval(preloaderCode);
    w.__pujahopReady = true;
    w.dispatchEvent(new w.Event('pujahop:reveal'));
    await new Promise((r) => setTimeout(r, 300));
    expect(!!w.document.getElementById('ph-preloader'), 'the overlay holds for its cinematic beat before the app appears');
    await new Promise((r) => setTimeout(r, 2600));
    expect(!w.document.getElementById('ph-preloader'), 'and then hands over to the map');
    w.close();
  }
}

console.log('\nthe dark and bright themes');
{
  const r = await render({ maplibre: mapStub(), label: 'theme', clicks: ['#theme-toggle'] });
  expect(r.theme === '', 'the page opens in the bright theme');
  expect(r.after.theme === 'dark', 'the theme button switches to the dark theme');
  expect(r.after.themeStored === 'dark', 'the choice is remembered in localStorage');
  expect(r.after.themeLabel === 'Bright', 'and the button now offers the bright theme');
  expect(r.after.realErrors.length === 0, r.after.realErrors.length ? 'unexpected errors: ' + r.after.realErrors.join(' | ') : 'no unexpected errors');

  const back = await render({ maplibre: mapStub(), label: 'theme-back', clicks: ['#theme-toggle', '#theme-toggle'] });
  expect(back.after.theme === '', 'a second press returns to the bright theme');
  expect(back.after.themeStored === 'light', 'and that is remembered too');

  const saved = await render({ maplibre: mapStub(), label: 'theme-saved', storage: { 'pujahop.theme': 'dark' } });
  expect(saved.theme === 'dark', 'a saved dark choice comes back on the next visit');
  expect(saved.realErrors.length === 0, saved.realErrors.length ? 'unexpected errors: ' + saved.realErrors.join(' | ') : 'no unexpected errors');
}

console.log(failures ? `\n${failures} check(s) failed` : '\nrender test passed');
process.exit(failures ? 1 : 0);
