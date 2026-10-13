/**
 * PujaHop Kolkata — app core.
 *
 * Everything the app says about a pandal comes from data/pandals.json; the
 * only live thing it adds is what visitors report about queues, which is
 * labelled as visitor-reported wherever it is shown.
 */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const DATA_VERSION = '20261013-odbl-3';

const state = {
  pandals: [],
  stations: [],
  routes: [],
  lines: [],
  meta: {},
  bySlug: new Map(),
  stationBySlug: new Map(),
  routeBySlug: new Map(),
  lineBySlug: new Map(),
  visibleLines: new Set(),
  suggestIndex: -1,
  crowd: {},
  q: '',
  sort: 'suggested',
  crowdFilter: '',
  area: null,
  quickFilter: null,
  vipOnly: false,
  metro: null,
  neighbourhood: null,
  active: null,
  userLoc: null,
  shown: 45,
  displayMode: 'map',
  locale: 'en',
  plan: [],
  realDistances: false,
  legs: {},
  map: null,
  mapReady: false,
  sheet: 'collapsed',
  view: { name: 'map', slug: null },
};

/* ------------------------------------------------------------------ geo */
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
function dist(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const la1 = rad(a.lat), la2 = rad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/* straight line x 1.28 — the usual correction for walking Kolkata's streets.
   Always labelled an estimate; real walking routes come from OSRM. */
const walkMeters = (a, b) => Math.round(dist(a, b) * 1.28);
const fmtM = (m) => (m == null ? '—' : m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
const fmtKm = (m) => `${(m / 1000).toFixed(1)} km`;
const fmtMin = (m) => `${Math.max(1, Math.round(m / 78))} min`;
const fmtAgo = (t) => {
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} h ago`;
};
const LEVEL_LABEL = { easy: 'Easy', busy: 'Busy', packed: 'Very crowded' };
const LEVELS = ['easy', 'busy', 'packed'];
const YEAR = 2026;
const t = (en, bn) => state.locale === 'bn' ? bn : en;
const displayName = (p) => state.locale === 'bn' && p.nameBn ? p.nameBn : p.name;

const searchText = (p) =>
  [p.name, p.nameBn, p.alsoKnownAs, p.formerName, p.neighbourhood, p.nearStreet, p.zoneName, p.areaName, p.nearestMetro.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), ms);
}

const drawerIds = ['drawer', 'nav-drawer', 'metro-drawer'];
let drawerCloseTimer;
let drawerTrigger;

function openOverlayDrawer(id, trigger = document.activeElement) {
  clearTimeout(drawerCloseTimer);
  drawerIds.filter((other) => other !== id).forEach((other) => {
    const drawer = $(`#${other}`);
    drawer.classList.remove('open');
    drawer.hidden = true;
  });
  const drawer = $(`#${id}`);
  drawerTrigger = trigger;
  drawer.hidden = false;
  $('#drawer-backdrop').hidden = false;
  window.requestAnimationFrame(() => drawer.classList.add('open'));
  drawer.querySelector('.drawer-close')?.focus();
  if (id === 'nav-drawer') $('#menu-toggle').setAttribute('aria-expanded', 'true');
  if (id === 'drawer') updatePlanCount();
}

function closeOverlayDrawer(restoreFocus = true) {
  const open = drawerIds.map((id) => $(`#${id}`)).find((drawer) => !drawer.hidden);
  if (!open) return;
  open.classList.remove('open');
  if (open.id === 'nav-drawer') $('#menu-toggle').setAttribute('aria-expanded', 'false');
  if (open.id === 'metro-drawer') $('#map-lines').setAttribute('aria-expanded', 'false');
  if (open.id === 'drawer') updatePlanCount();
  $('#drawer-backdrop').hidden = true;
  clearTimeout(drawerCloseTimer);
  drawerCloseTimer = setTimeout(() => { open.hidden = true; }, 240);
  if (restoreFocus && drawerTrigger?.isConnected) drawerTrigger.focus();
}

/* ----------------------------------------------------------------- load */
async function boot() {
  const [pandals, stations, routes, lines, meta] = await Promise.all(
    ['pandals', 'stations', 'routes', 'lines', 'meta'].map((n) =>
      fetch(`/data/${n}.json?v=${DATA_VERSION}`).then((r) => (r.ok ? r.json() : [])).catch(() => [])
    )
  );
  state.lines = Array.isArray(lines) ? lines : [];
  state.visibleLines = new Set(state.lines.map((line) => line.slug));
  state.pandals = pandals.map((p) => ({ ...p, _search: searchText(p) }));
  state.stations = stations;
  state.routes = routes;
  state.meta = meta;
  state.bySlug = new Map(state.pandals.map((p) => [p.slug, p]));
  state.stationBySlug = new Map(stations.map((s) => [s.slug, s]));
  state.routeBySlug = new Map(routes.map((r) => [r.slug, r]));
  state.lineBySlug = new Map(state.lines.map((l) => [l.slug, l]));
  state.plan = readJSON('pujaguide.plan', []);
  state.realDistances = readJSON('pujaguide.realDistances', false) === true;
  state.displayMode = readJSON('pujaguide.view', 'map') === 'list' ? 'list' : 'map';
  state.locale = readJSON('pujaguide.locale', 'en') === 'bn' ? 'bn' : 'en';
  if (document.documentElement) document.documentElement.lang = state.locale;
  state.theme = readTheme();
  applyTheme(state.theme);

  document.title = `PujaHop Kolkata — ${state.pandals.length} Kolkata Durga Puja pandals on one map`;

  /* The list, the cards, the routes and every page must work whether or not
     the 3D map can start: a blocked tile server, a browser without WebGL or a
     missing map library must not take the site down with them. So the usable
     parts are wired first, and the map is the last thing to try. */
  wireChrome();
  wirePlan();
  route();

  startMap();

  /* The intro preloader can hand over now the list, the cards and the map
     area are on screen. Guarded with a typeof check because the test DOM
     stub has no dispatchEvent. */
  window.__pujahopReady = true;
  if (typeof window.dispatchEvent === 'function') {
    try { window.dispatchEvent(new Event('pujahop:reveal')); } catch {}
  }

  refreshCrowd().catch(() => {});
  setInterval(() => refreshCrowd().catch(() => {}), 120000);
  window.addEventListener('popstate', route);
  window.addEventListener('online', () => ($('#offline-bar').hidden = true));
  window.addEventListener('offline', () => ($('#offline-bar').hidden = false));
  if (!navigator.onLine) $('#offline-bar').hidden = false;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

const readJSON = (k, d) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; }
};
const writeJSON = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

/* --------------------------------------------------------------- theme */
/* Two themes: the bright paper one (the default) and a dark one. The choice is
   stored as a raw 'dark'/'light' string — the inline head script and
   preloader.js read the same key before app.js runs, so a returning visitor
   gets the right background on the very first paint, with no flash. */
const THEME_KEY = 'pujahop.theme';
function readTheme() {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}
function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : null;
  if (!next) return;
  state.theme = next;
  const root = document.documentElement;
  if (root) {
    if (next === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
  }
  try { localStorage.setItem(THEME_KEY, next); } catch {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', next === 'dark' ? '#0a0709' : '#7b1f18');
  const toggle = $('#theme-toggle');
  if (toggle) {
    const dark = next === 'dark';
    toggle.textContent = t(dark ? 'Bright' : 'Dark', dark ? 'উজ্জ্বল' : 'অন্ধকার');
    toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    toggle.setAttribute('aria-label', dark ? 'Switch to the bright theme' : 'Switch to the dark theme');
  }
}

/* ------------------------------------------------------------------ map */
const selectedSource = () => ({
  type: 'FeatureCollection',
  features: state.active && state.bySlug.has(state.active)
    ? [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [state.bySlug.get(state.active).lon, state.bySlug.get(state.active).lat] },
        properties: { name: state.bySlug.get(state.active).name },
      }]
    : [],
});

function pandalFeatures(list) {
  return {
    type: 'FeatureCollection',
    features: list.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: {
        slug: p.slug,
        name: p.name,
        crowd: (state.crowd[p.slug] || {}).level || 'none',
        verified: p.position.verified ? 1 : 0,
        vip: p.isVIP ? 1 : 0,
      },
    })),
  };
}

function startMap() {
  if (typeof maplibregl === 'undefined') {
    return mapUnavailable('The map library did not load, so the 3D map is off. The list, the pandal cards, the routes and every page still work.');
  }
  try {
    buildMap();
  } catch (err) {
    console.error('map failed to start:', err);
    return mapUnavailable('The 3D map could not start in this browser. The list, the pandal cards, the routes and every page still work.');
  }
  /* If the style never loads, the tile server is unreachable — usually a
     blocked domain rather than a broken page. Say so, and keep the rest. */
  setTimeout(() => {
    if (!state.mapReady) {
      mapUnavailable('No map tiles have arrived, so the tile server is probably blocked on this network. The list, the pandal cards, the routes and every page still work.');
    }
  }, 12000);
}

function mapUnavailable(message) {
  state.mapFailed = true;
  for (const id of ['#map-zoom-in', '#map-zoom-out', '#map-3d', '#map-fit', '#map-locate']) {
    const b = $(id);
    if (b) { b.disabled = true; b.title = 'The map is not available in this browser'; }
  }
  const wrap = $('.mapwrap');
  if (!wrap || wrap.querySelector('.map-note')) return;
  const note = document.createElement('div');
  note.className = 'map-note';
  note.innerHTML = `<strong>No 3D map here.</strong><p>${esc(message)}</p>`;
  wrap.insertBefore(note, wrap.firstChild);
}

function buildMap() {
  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [88.3639, 22.5726],
    zoom: 11.4,
    pitch: 48,
    bearing: -12,
    maxPitch: 72,
    attributionControl: false,
    dragRotate: true,
  });
  state.map = map;
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');

  map.on('load', () => {
    map.addSource('pandals', { type: 'geojson', data: pandalFeatures(state.pandals) });
    map.addSource('stations', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: state.stations.map((s) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
          properties: { name: s.name, slug: s.slug, count: s.pandalCount },
        })),
      },
    });
    map.addSource('selected', { type: 'geojson', data: selectedSource() });
    map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('userloc', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('walk', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: 'route-line', type: 'line', source: 'route',
      paint: { 'line-color': '#b8321f', 'line-width': 3.2, 'line-opacity': .9 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
    map.addLayer({
      id: 'walk-line', type: 'line', source: 'walk',
      paint: { 'line-color': '#1c4c7d', 'line-width': 3, 'line-dasharray': [1.4, 1.4] },
      layout: { 'line-cap': 'round' },
    });
    map.addSource('metro-lines', { type: 'geojson', data: lineFeatures() });
    map.addLayer({
      id: 'metro-lines', type: 'line', source: 'metro-lines',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      filter: ['in', ['get', 'slug'], ['literal', [...state.visibleLines]]],
      paint: {
        'line-color': ['get', 'colour'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4.5],
        'line-opacity': 0.72,
      },
    });
    map.addLayer({
      id: 'stations', type: 'circle', source: 'stations',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.6, 14, 5.5],
        'circle-color': '#1f2933', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.4,
        'circle-opacity': .85,
      },
    });
    map.addLayer({
      id: 'pandals', type: 'circle', source: 'pandals',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.4, 15, 8],
        'circle-color': [
          'match', ['get', 'crowd'],
          'easy', '#2e7d32', 'busy', '#ed6c02', 'packed', '#c62828',
          '#d2461f',
        ],
        'circle-stroke-color': '#fff', 'circle-stroke-width': ['case', ['==', ['get', 'verified'], 1], 1.8, 1],
        'circle-opacity': .96,
      },
    });
    /* A slim gold ring on the owner's pass pandals only. The ordinary circle
       keeps its design, so VIP never changes how a marker reads, clusters or
       reports its crowd level — it just gets a ring. */
    map.addLayer({
      id: 'pandals-vip', type: 'circle', source: 'pandals',
      filter: ['==', ['get', 'vip'], 1],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6.4, 15, 12.6],
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-color': '#e0a020',
        'circle-stroke-width': ['case', ['==', ['get', 'verified'], 1], 2.4, 2],
        'circle-opacity': 1,
      },
    });
    map.addLayer({
      id: 'selected', type: 'circle', source: 'selected',
      paint: { 'circle-radius': 13, 'circle-color': 'rgba(224,160,32,.30)', 'circle-stroke-color': '#e0a020', 'circle-stroke-width': 2.5 },
    });
    map.addLayer({
      id: 'userloc', type: 'circle', source: 'userloc',
      paint: { 'circle-radius': 6, 'circle-color': '#1c4c7d', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
    });

    try {
      map.addLayer({
        id: 'station-labels', type: 'symbol', source: 'stations', minzoom: 12,
        layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-font': ['Noto Sans Regular'] },
        paint: { 'text-color': '#1f2933', 'text-halo-color': 'rgba(255,255,255,.9)', 'text-halo-width': 1.3 },
      });
      map.addLayer({
        id: 'pandal-labels', type: 'symbol', source: 'pandals', minzoom: 13.2,
        layout: { 'text-field': ['get', 'name'], 'text-size': 11.5, 'text-offset': [0, 1.15], 'text-anchor': 'top', 'text-font': ['Noto Sans Regular'] },
        paint: { 'text-color': '#3b2a12', 'text-halo-color': 'rgba(255,255,255,.92)', 'text-halo-width': 1.5 },
      });
    } catch {
      /* labels are a nicety; the map works without them */
    }

    map.on('click', 'pandals', (e) => {
      const f = e.features[0];
      select(f.properties.slug, { fromMap: true });
    });
    map.on('click', 'stations', (e) => {
      const s = state.stationBySlug.get(e.features[0].properties.slug);
      if (s) openPage({ name: 'metro', slug: s.slug });
    });
    for (const id of ['pandals', 'stations']) {
      map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''));
    }

    state.mapReady = true;
    renderLineLegend();
    /* the map got there in the end: take back any "no tiles" warning */
    const note = $('.map-note');
    if (note) note.remove();
    for (const id of ['#map-3d', '#map-fit', '#map-locate']) {
      const b = $(id);
      if (b) { b.disabled = false; b.removeAttribute('title'); }
    }
    fitFiltered();
    render();
    map.resize();
  });
}
const map = () => state.map;

/* ---------------------------------------------------------------- filter */
function filtered() {
  const q = state.q.trim().toLowerCase();
  let list = state.pandals.filter((p) => {
    if (state.area && p.area !== state.area) return false;
    if (state.neighbourhood && p.neighbourhood !== state.neighbourhood) return false;
    if (state.metro && p.nearestMetro.name !== state.metro) return false;
    if (state.vipOnly && !p.isVIP) return false;
    if (state.crowdFilter) {
      const c = state.crowd[p.slug];
      if (state.crowdFilter === 'reported') { if (!c) return false; }
      else if (!c || c.level !== state.crowdFilter) return false;
    }
    if (q && !p._search.includes(q)) return false;
    return true;
  });

  const order = { easy: 0, busy: 1, packed: 2 };
  const sorters = {
    suggested: (a, b) => (a.nearestMetro.walkMeters ?? 9e9) - (b.nearestMetro.walkMeters ?? 9e9) || a.name.localeCompare(b.name),
    walk: (a, b) => (a.nearestMetro.walkMeters ?? 9e9) - (b.nearestMetro.walkMeters ?? 9e9),
    name: (a, b) => a.name.localeCompare(b.name, 'en'),
    area: (a, b) => a.areaName.localeCompare(b.areaName) || (a.neighbourhood || '').localeCompare(b.neighbourhood || '') || a.name.localeCompare(b.name),
    neighbourhood: (a, b) => (a.neighbourhood || 'zz').localeCompare(b.neighbourhood || 'zz') || a.name.localeCompare(b.name),
    crowd: (a, b) => {
      const ca = state.crowd[a.slug], cb = state.crowd[b.slug];
      if (!ca && !cb) return a.name.localeCompare(b.name);
      if (!ca) return 1;
      if (!cb) return -1;
      return order[ca.level] - order[cb.level] || cb.at - ca.at;
    },
  };
  if (state.sort === 'distance' && state.userLoc) {
    list.sort((a, b) => dist(state.userLoc, a) - dist(state.userLoc, b));
  } else if (state.sort === 'distance') {
    list.sort(sorters.walk);
  } else {
    list.sort(sorters[state.sort] || sorters.suggested);
  }
  if (state.quickFilter === 'closest10') {
    list = list
      .slice()
      .sort((a, b) => a.nearestMetro.walkMeters - b.nearestMetro.walkMeters || a.name.localeCompare(b.name))
      .slice(0, 10);
  }
  return list;
}

const subtitleFor = (p) => {
  const bits = [];
  const para = p.neighbourhood || p.areaName;
  if (para && para !== p.nearestMetro.name) bits.push(para);
  if (p.nearestMetro.name) bits.push(`${p.nearestMetro.name} metro · ${fmtM(p.nearestMetro.walkMeters)} walk`);
  return bits.join(' · ');
};

/* ---------------------------------------------------------------- render */
function render() {
  const list = filtered();
  const done = list.slice(0, state.shown);

  $('#count').textContent = list.length === state.pandals.length
    ? t(`${list.length} pandals`, `${list.length}টি প্যান্ডেল`)
    : t(`${list.length} of ${state.pandals.length} pandals`, `${state.pandals.length}টির মধ্যে ${list.length}টি প্যান্ডেল`);
  $('#panel-toggle-label').textContent = state.sheet === 'collapsed' ? $('#count').textContent : t('Pandal results', 'প্যান্ডেলের তালিকা');

  const ol = $('#list');
  ol.innerHTML = done.map((p) => {
    const c = state.crowd[p.slug];
    return `<li class="item" data-slug="${p.slug}" data-active="${state.active === p.slug}">
      <button type="button">
        <span class="item-name"><strong>${esc(displayName(p))}</strong>${state.locale === 'en' && p.nameBn ? `<span class="item-bn" lang="bn">${esc(p.nameBn)}</span>` : ''}</span>
        <span class="item-meta">${esc(subtitleFor(p))}</span>
        <span>${p.isVIP ? '<span class="badge vip">★ VIP</span> ' : ''}${p.reviewStatus ? `<span class="badge review">${t('Needs review', 'যাচাই প্রয়োজন')}</span> ` : p.position.verified ? `<span class="badge verified">${t('Position checked', 'অবস্থান যাচাই')}</span> ` : ''}${c ? `<span class="badge ${c.level}">${t(LEVEL_LABEL[c.level], { easy: 'সহজ', busy: 'ভিড়', packed: 'অত্যন্ত ভিড়' }[c.level])} · ${fmtAgo(c.at)}</span>` : ''}${state.plan.includes(p.slug) ? `<span class="badge">${t('In your route', 'আপনার রুটে আছে')}</span>` : ''}</span>
      </button>
    </li>`;
  }).join('');
  $('#list-empty').hidden = list.length !== 0;
  $('#load-more').hidden = list.length <= state.shown;

  ol.onclick = (e) => {
    const li = e.target.closest('.item');
    if (li) select(li.dataset.slug);
  };

  if (state.mapReady) {
    map().getSource('pandals').setData(pandalFeatures(list));
    map().getSource('selected').setData(selectedSource());
    drawPlanLine();
  }
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fitFiltered() {
  if (!state.mapReady) return;
  const list = filtered();
  if (!list.length) return;
  if (list.length === 1) {
    map().flyTo({ center: [list[0].lon, list[0].lat], zoom: 15, pitch: 55, duration: 900 });
    return;
  }
  const b = new maplibregl.LngLatBounds();
  for (const p of list) b.extend([p.lon, p.lat]);
  map().fitBounds(b, { padding: { top: 70, bottom: 70, left: 70, right: 70 }, pitch: 45, duration: 900 });
}

/* -------------------------------------------------------------- selection */
function select(slug, opts = {}) {
  state.active = slug;
  const p = state.bySlug.get(slug);
  if (!p) return;
  render();
  if (state.mapReady && !opts.noFly) {
    map().flyTo({ center: [p.lon, p.lat], zoom: Math.max(map().getZoom(), 15), pitch: 55, duration: 800 });
  }
  showCard(p);
  if (!opts.fromMap) history.replaceState({}, '', `/p/${slug}`);
}

function showCard(p) {
  const c = state.crowd[p.slug];
  const reports = (state.recentReports || []).filter((r) => r.slug === p.slug).slice(-3).reverse();
  const nearby = state.pandals
    .filter((o) => o.slug !== p.slug)
    .map((o) => ({ o, m: walkMeters(p, o) }))
    .sort((a, b) => a.m - b.m)
    .slice(0, 6)
    .filter((x) => x.m <= 1600);

  const el = $('#card');
  el.hidden = false;
  el.innerHTML = `
    <div class="card-head">
      <button class="btn ghost small card-close" type="button" aria-label="Close" id="card-close">×</button>
      <h2>${esc(displayName(p))}${p.isVIP ? ' <span class="badge vip">★ VIP</span>' : ''}</h2>
      ${p.nameBn ? `<div class="faint" lang="bn">${esc(p.nameBn)}</div>` : ''}
      <div class="tagline">${esc([p.areaName, p.neighbourhood].filter(Boolean).join(' · '))}</div>
    ${p.reviewStatus ? '<p class="review-note" role="note">This existing placeholder entry is retained, but its official pandal name and location need manual verification.</p>' : ''}
    ${p.isVIP && p.vipReview ? '<p class="review-note vip" role="note">This pandal is on your VIP pass list, but its identity or map pin still needs a human check — please verify before trusting it.</p>' : ''}
    </div>
    <div class="card-body">
      ${p.photo ? `<figure class="photo">
        <img src="${esc(p.photo.thumb)}" alt="${esc(p.name)}, ${p.photo.year}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
        <figcaption>${esc(p.photo.artist)} · ${p.photo.licenceUrl ? `<a href="${esc(p.photo.licenceUrl)}" target="_blank" rel="noopener">${esc(p.photo.licence)}</a>` : esc(p.photo.licence)} · ${p.photo.year} · <a href="${esc(p.photo.page)}" target="_blank" rel="noopener">Wikimedia Commons</a>${p.photo.fromPinMeters != null ? ` · photographed ${p.photo.fromPinMeters} m from this pin` : ''}. Each year the pandal is rebuilt on a new theme, so this is not what is standing now.</figcaption>
      </figure>` : ''}
      <div class="crowd-row">
        ${LEVELS.map((l) => `<button class="crowd-btn ${l}" data-level="${l}" type="button">${t(LEVEL_LABEL[l], { easy: 'সহজ', busy: 'ভিড়', packed: 'অত্যন্ত ভিড়' }[l])}</button>`).join('')}
      </div>
      ${c ? `<div class="report ${c.level}"><strong>${LEVEL_LABEL[c.level]}</strong> at this pandal, reported ${fmtAgo(c.at)}${c.note ? ` — “${esc(c.note)}”` : ''}. ${c.count > 1 ? `${c.count} reports in the last 90 minutes.` : ''}</div>`
          : `<div class="faint" style="font-size:12.5px">No queue report in the last 90 minutes. Tell the next person what it is like.</div>`}
      ${reports.length > 1 ? `<details class="more"><summary>Earlier reports</summary>${reports.map((r) => `<div class="report ${r.level}">${LEVEL_LABEL[r.level]} — ${fmtAgo(r.at)}</div>`).join('')}</details>` : ''}

      <dl class="kv">
        ${state.userLoc ? `<dt>${t('From you', 'আপনার থেকে')}</dt><dd>${fmtM(dist(state.userLoc, p))} ${t('straight-line distance', 'সরলরেখার দূরত্ব')}</dd>` : ''}
        <dt>${t('Walk from', 'হেঁটে')}</dt><dd>${metroLink(p.nearestMetro.name)} · ${fmtM(p.nearestMetro.walkMeters)} (${fmtMin(p.nearestMetro.walkMeters)})</dd>
        <dt>${t('Address / street', 'ঠিকানা / রাস্তা')}</dt><dd>${esc(p.nearStreet || '—')}</dd>
        <dt>${t('Zone / area', 'অঞ্চল')}</dt><dd>${esc(p.zoneName || p.areaName)} · ${esc(p.areaName)}${p.neighbourhood ? ` · ${esc(p.neighbourhood)}${p.neighbourhoodInferred ? ' <span class="faint">(nearest para, inferred)</span>' : ''}` : ''}</dd>
        <dt>Position</dt><dd>${positionNote(p)}</dd>
        ${p.nearestMetro.estimated ? '<dt>Walk</dt><dd><span class="badge">estimated</span> this puja was added from a visitor report, so the walk to the station is worked out from the position rather than published.</dd>' : ''}
        ${p.alsoKnownAs ? `<dt>Also known as</dt><dd>${esc(p.alsoKnownAs)}</dd>` : ''}
        ${p.formerName ? `<dt>Formerly</dt><dd>${esc(p.formerName)}</dd>` : ''}
      </dl>

      <div class="card-actions">
        <button class="btn primary small" type="button" data-act="add">${state.plan.includes(p.slug) ? t('In your route', 'আপনার রুটে আছে') : t('Add to route', 'রুটে যোগ করুন')}</button>
        <button class="btn small" type="button" data-act="directions">${t('Walking directions', 'হাঁটার দিকনির্দেশ')}</button>
        <button class="btn small" type="button" data-act="been">${isBeen(p.slug) ? t('Been there ✓', 'গিয়েছি ✓') : t('Been there', 'গিয়েছি')}</button>
        <button class="btn small" type="button" data-act="share">${t('Share', 'শেয়ার')}</button>
        <a class="btn small" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=walking" target="_blank" rel="noopener">Open in Maps</a>
        <button class="btn small" type="button" data-act="wrong">Something wrong here?</button>
      </div>

      ${nearby.length ? `<div>
        <p class="section-title">Within a few minutes on foot</p>
        <ul class="nearby">
          ${nearby.map(({ o, m }) => `<li><a href="/p/${o.slug}" data-slug="${o.slug}">${esc(o.name)}</a><span class="faint">${fmtM(m)} · ${fmtMin(m)}</span></li>`).join('')}
        </ul>
        <p class="fine">Straight-line distance × 1.28, so treat it as an estimate.</p>
      </div>` : ''}
      <div class="note">Coordinates ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}. ${positionNote(p)}</div>
    </div>`;

  $('#card-close').onclick = () => { el.hidden = true; state.active = null; render(); history.replaceState({}, '', '/'); };
  el.querySelectorAll('.nearby a').forEach((a) => a.onclick = (e) => { e.preventDefault(); select(a.dataset.slug); });
  el.querySelectorAll('.crowd-btn').forEach((b) => b.onclick = () => report(p.slug, b.dataset.level));
  el.querySelector('[data-act="add"]').onclick = () => { togglePlan(p.slug); showCard(state.bySlug.get(p.slug)); };
  el.querySelector('[data-act="been"]').onclick = () => { toggleBeen(p.slug); showCard(p); };
  el.querySelector('[data-act="share"]').onclick = () => sharePandal(p);
  el.querySelector('[data-act="directions"]').onclick = () => directionsTo(p);
  el.querySelector('[data-act="wrong"]').onclick = () => {
    const subject = encodeURIComponent(`Correction: ${p.name}`);
    const body = encodeURIComponent(`Pandal: ${p.name} (${p.slug})\nCoordinates shown: ${p.lat}, ${p.lon}\nArea: ${p.areaName}${p.neighbourhood ? ' / ' + p.neighbourhood : ''}\n\nWhat is wrong:\n\nWhere it should be (if you know):\n`);
    location.href = `mailto:hello@pujahop.in?subject=${subject}&body=${body}`;
  };
}

function metroLink(name) {
  const s = state.stations.find((x) => x.name === name);
  return s ? `<a href="/metro/${s.slug}">${esc(name)} metro</a>` : `${esc(name)} metro`;
}

function positionNote(p) {
  if (p.reviewStatus) {
    return '<span class="badge review">Needs review</span> placeholder name and location retained unchanged pending manual verification.';
  }
  const m = p.position.method;
  const map = {
    verified: 'confirmed with the puja committee or checked on the ground',
    osm: 'matched to a surveyed place in OpenStreetMap',
    'neighbourhood-anchor': 'placed at the para centre, so it may be a street or two out',
    'neighbourhood-anchor+fallback': 'placed at the para centre as a fallback, so it may be a street or two out',
    geocoded: 'geocoded from the street address, so it may be out by a street',
    'street-snapped': 'snapped to the named street',
  };
  const label = {
    verified: 'position checked', osm: 'matched in OSM', geocoded: 'geocoded',
    'street-snapped': 'snapped to street', 'neighbourhood-anchor': 'para centre',
    'neighbourhood-anchor+fallback': 'para centre (fallback)',
  }[m] || 'from the published list';
  return `<span class="badge${p.position.verified ? ' verified' : ''}">${esc(label)}</span> ${map[m] ? esc(map[m]) : 'placed from the published puja list'}.`;
}

/* not every environment has matchMedia (some test runners do not) */
const isNarrowScreen = () =>
  typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 900px)').matches : window.innerWidth <= 900;

const isBeen = (slug) => readJSON('pujaguide.been', []).includes(slug);
function toggleBeen(slug) {
  const list = readJSON('pujaguide.been', []);
  const i = list.indexOf(slug);
  if (i >= 0) list.splice(i, 1); else list.push(slug);
  writeJSON('pujaguide.been', list);
  toast(i >= 0 ? 'Removed from your list' : 'Marked as been there');
}

/* ------------------------------------------------------------ directions */
async function directionsTo(p) {
  if (!state.userLoc) {
    const ok = await locate();
    if (!ok) return;
  }
  const from = state.userLoc;
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${from.lon},${from.lat};${p.lon},${p.lat}?overview=full&geometries=geojson`;
  setWalk({ type: 'FeatureCollection', features: [{
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[from.lon, from.lat], [p.lon, p.lat]] },
    properties: {},
  }] });
  try {
    const r = await fetch(url);
    const j = await r.json();
    const route = j.routes && j.routes[0];
    if (route) {
      setWalk({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: route.geometry, properties: {} }] });
      toast(`Walking route from OSM: ${fmtKm(route.distance)} · about ${Math.round(route.duration / 60)} min`);
      return;
    }
  } catch {}
  toast(`Could not reach the routing service. Straight line ${fmtM(dist(from, p))}, about ${fmtMin(walkMeters(from, p))} on foot.`);
}

const setWalk = (fc) => state.mapReady && map().getSource('walk').setData(fc);

/* ---------------------------------------------------------- metro lines */
function lineFeatures() {
  return {
    type: 'FeatureCollection',
    features: (state.lines || []).map((l) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: l.coordinates },
      properties: { slug: l.slug, name: l.name, colour: l.colour },
    })),
  };
}

function renderLineLegend() {
  const el = $('#metro-line-options');
  if (!el) return;
  el.innerHTML = `${state.lines.map((line) => `<label class="metro-line-option">
    <input type="checkbox" data-line="${esc(line.slug)}" ${state.visibleLines.has(line.slug) ? 'checked' : ''}>
    <i class="swatch" style="background:${esc(line.colour)}"></i>
    <span><strong>${esc(line.name)}</strong><small>${esc(line.route || '')}</small></span>
  </label>`).join('')}
  <p class="fine">Alignment joins published station coordinates; it is not a survey.</p>`;
  const allVisible = state.lines.length > 0 && state.visibleLines.size === state.lines.length;
  $('#map-lines').setAttribute('aria-pressed', String(state.visibleLines.size > 0));
  $('#map-lines').textContent = allVisible ? 'Metro' : `Metro ${state.visibleLines.size}/${state.lines.length}`;
}

function locate() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.userLoc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (state.mapReady) {
          map().getSource('userloc').setData({ type: 'FeatureCollection', features: [{
            type: 'Feature', geometry: { type: 'Point', coordinates: [state.userLoc.lon, state.userLoc.lat] }, properties: {},
          }] });
        }
        toast('Location is only used in your browser.');
        resolve(true);
      },
      () => { toast('No location. Sorting by the walk from each puja\'s metro instead.'); resolve(false); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

function sharePandal(p) {
  const url = `${location.origin}/p/${p.slug}`;
  const data = { title: `${p.name} — PujaHop Kolkata`, text: `${p.name}, ${p.areaName}. Walk from ${p.nearestMetro.name} metro: ${fmtM(p.nearestMetro.walkMeters)}.`, url };
  if (navigator.share) navigator.share(data).catch(() => {});
  else { navigator.clipboard?.writeText(url); toast('Link copied'); }
}

/* ----------------------------------------------------------------- crowd */
async function refreshCrowd() {
  try {
    const [summary, recent] = await Promise.all([
      fetch('/api/crowd/summary').then((r) => r.json()),
      fetch('/api/crowd').then((r) => r.json()),
    ]);
    state.crowd = summary.summary || {};
    state.recentReports = (recent.reports || []).slice().sort((a, b) => b.at - a.at);
    /* the legend only explains colours that are actually on the map */
    $('#map-legend').hidden = Object.keys(state.crowd).length === 0;
    if (state.mapReady) map().getSource('pandals').setData(pandalFeatures(filtered()));
    render();
    if (state.active && !$('#card').hidden) showCard(state.bySlug.get(state.active));
    if (state.view.name === 'live') openPage(state.view);
  } catch {
    /* offline: keep whatever we had */
  }
}

async function report(slug, level) {
  try {
    const r = await fetch('/api/crowd', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client': clientId() },
      body: JSON.stringify({ slug, level }),
    });
    const j = await r.json();
    if (!r.ok) return toast(j.error || 'Could not send that');
    toast(`Thanks — ${LEVEL_LABEL[level]} at ${state.bySlug.get(slug).name}. It fades in 90 minutes.`);
    await refreshCrowd();
  } catch {
    toast('No connection — the report was not sent.');
  }
}

function clientId() {
  let id = readJSON('pujaguide.client', null);
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); writeJSON('pujaguide.client', id); }
  return id;
}

/* ------------------------------------------------------------------ plan */
function togglePlan(slug) {
  const i = state.plan.indexOf(slug);
  if (i >= 0) state.plan.splice(i, 1);
  else state.plan.push(slug);
  if (state.plan.length > 30) state.plan = state.plan.slice(-30);
  writeJSON('pujaguide.plan', state.plan);
  state.legs = {};
  if (state.plan.length) {
    const ordered = orderPlan();
    localStorage.setItem('pujaguide.plan.data', JSON.stringify(ordered.map((s) => {
      const p = state.bySlug.get(s);
      return { slug: p.slug, name: p.name, lat: p.lat, lon: p.lon, walk: p.nearestMetro.walkMeters, metro: p.nearestMetro.name };
    })));
  }
  renderPlan();
  updatePlanCount();
  if (state.mapReady) drawPlanLine();
}

/* nearest-neighbour ordering from where the visitor starts: their first pick,
   or where they are if they shared a location. */
function orderPlan() {
  if (state.plan.length < 2) return [...state.plan];
  const start = state.userLoc ? null : state.bySlug.get(state.plan[0]);
  const pool = state.userLoc ? [...state.plan] : state.plan.filter((s) => s !== state.plan[0]);
  const ordered = state.userLoc ? [] : [state.plan[0]];
  let cursor = state.userLoc || start;
  while (pool.length) {
    let best = 0, bd = Infinity;
    pool.forEach((s, i) => {
      const d = dist(cursor, state.bySlug.get(s));
      if (d < bd) { bd = d; best = i; }
    });
    const next = pool.splice(best, 1)[0];
    ordered.push(next);
    cursor = state.bySlug.get(next);
  }
  return ordered;
}

const planLegMeters = (aSlug, bSlug) => {
  const key = `${aSlug}|${bSlug}`;
  return state.legs[key] || walkMeters(state.bySlug.get(aSlug), state.bySlug.get(bSlug));
};

function drawPlanLine() {
  if (!state.mapReady) return;
  const ordered = orderPlan();
  if (ordered.length < 2) {
    map().getSource('route').setData({ type: 'FeatureCollection', features: [] });
    return;
  }
  map().getSource('route').setData({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: ordered.map((s) => { const p = state.bySlug.get(s); return [p.lon, p.lat]; }) },
      properties: {},
    }],
  });
}

function updatePlanCount() {
  const pill = $('#plan-count');
  pill.textContent = state.plan.length;
  pill.hidden = state.plan.length === 0;
  $('#plan-open').setAttribute('aria-expanded', String(!$('#drawer').hidden));
}

function renderPlan() {
  const body = $('#drawer-body');
  const ordered = orderPlan();
  if (!ordered.length) {
    body.innerHTML = `<p class="plan-empty">Add pandals from the map or the list and they will be put in a walking order — nearest next, from your first pick (or from where you are, if you share your location).</p>
      <p class="fine">Saved routes stay in your browser and work with no signal.</p>`;
    return;
  }
  let total = 0;
  const rows = ordered.map((slug, i) => {
    const p = state.bySlug.get(slug);
    let leg = '';
    if (i > 0) {
      const m = planLegMeters(ordered[i - 1], slug);
      total += m;
      leg = `<div class="plan-leg">↓ ${fmtM(m)} · ${fmtMin(m)}${state.legs[`${ordered[i - 1]}|${slug}`] ? ' (walking route)' : ' estimated'}</div>`;
    }
    return `${leg}<div class="plan-stop">
      <span class="idx">${i + 1}</span>
      <span class="grow">
        <strong>${esc(p.name)}</strong>
        <span class="faint" style="font-size:12px">${esc(p.neighbourhood || p.areaName)} · ${esc(p.nearestMetro.name)} ${fmtM(p.nearestMetro.walkMeters)}</span>
      </span>
      <button class="btn ghost small" type="button" data-rm="${slug}" aria-label="Remove ${esc(p.name)}">×</button>
      <button class="btn ghost small" type="button" data-go="${slug}" aria-label="Show ${esc(p.name)}">→</button>
    </div>`;
  }).join('');

  const savedOffline = !!readJSON('pujaguide.plan.data', null);
  body.innerHTML = `
    ${rows}
    <div class="plan-total">
      <strong>${ordered.length} stops · ${fmtKm(total)} on foot</strong><br>
      <span class="faint">About ${Math.round((total / 1000) * 13 + ordered.length * 5 + 25)} minutes with a look at each and a queue at two. Metro between stops when the legs get long.</span>
    </div>
    <div class="plan-actions">
      <button class="btn small" type="button" id="plan-real">${state.realDistances ? 'Using real walking routes ✓' : 'Measure real walking routes'}</button>
      <button class="btn small" type="button" id="plan-share">Share this route</button>
      <button class="btn small" type="button" id="plan-offline">${savedOffline ? 'Saved for offline ✓' : 'Save for offline'}</button>
      <button class="btn small" type="button" id="plan-print">Print</button>
      <button class="btn ghost small" type="button" id="plan-clear">Clear</button>
    </div>
    <p class="fine">Legs are straight-line distance × 1.28 unless you ask for real walking routes, which come from the OSM foot router. ${savedOffline ? 'This route and a copy of the map around it are on this device.' : ''}</p>`;

  body.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => togglePlan(b.dataset.rm));
  body.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => { select(b.dataset.go); showCard(state.bySlug.get(b.dataset.go)); });
  $('#plan-clear').onclick = () => { state.plan = []; state.legs = {}; writeJSON('pujaguide.plan', []); updatePlanCount(); renderPlan(); drawPlanLine(); render(); };
  $('#plan-print').onclick = () => window.print();
  $('#plan-share').onclick = sharePlan;
  $('#plan-offline').onclick = saveOffline;
  $('#plan-real').onclick = measureReal;
}

async function measureReal() {
  if (state.plan.length < 2) return;
  toast('Measuring the legs on the OSM foot router…');
  const ordered = orderPlan();
  let failed = 0;
  for (let i = 1; i < ordered.length; i++) {
    const a = state.bySlug.get(ordered[i - 1]), b = state.bySlug.get(ordered[i]);
    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
    try {
      const j = await (await fetch(url)).json();
      if (j.routes && j.routes[0]) state.legs[`${ordered[i - 1]}|${ordered[i]}`] = Math.round(j.routes[0].distance);
      else failed++;
    } catch { failed++; }
  }
  state.realDistances = true;
  writeJSON('pujaguide.realDistances', true);
  renderPlan();
  drawPlanLine();
  toast(failed ? `Measured most legs; ${failed} kept as estimates.` : 'All legs measured on real streets.');
}

async function sharePlan() {
  const ordered = orderPlan();
  const params = new URLSearchParams({ plan: ordered.join(',') });
  const link = `${location.origin}/?${params}`;
  if (navigator.share) { navigator.share({ title: 'A Durga Puja route', url: link }).catch(() => {}); return; }
  try { await navigator.clipboard.writeText(link); toast('Route link copied'); }
  catch { toast(link); }
}

async function saveOffline() {
  try {
    const cache = await caches.open('pujahop-offline-v1');
    await Promise.all([
      cache.add('/data/pandals.json'),
      cache.add('/data/stations.json'),
      cache.add('/data/routes.json'),
      cache.add('/'),
    ]);
    writeJSON('pujaguide.offlineRoute', orderPlan());
    toast('Saved. This route works with no signal.');
    renderPlan();
  } catch {
    toast('Could not save offline in this browser.');
  }
}

function wirePlan() {
  const open = () => { renderPlan(); openOverlayDrawer('drawer', $('#plan-open')); };
  renderPlan();   // so the drawer always has its explanation in it, never a blank slab
  $('#plan-open').onclick = () => ($('#drawer').hidden ? open() : closeOverlayDrawer());
  $('#plan-close').onclick = () => closeOverlayDrawer();
  updatePlanCount();
}

/* ------------------------------------------------------------- chrome */
function wireChrome() {
  $('#search-form').onsubmit = (e) => e.preventDefault();
  $('#q-clear').onclick = () => { $('#q').value = ''; state.q = ''; $('#q-clear').hidden = true; render(); closeSuggest(); };
  $('#q').addEventListener('input', (e) => {
    state.q = e.target.value;
    state.shown = 45;
    $('#q-clear').hidden = !state.q;
    if (state.q && state.sheet === 'collapsed') setSheet('half');
    render();
    renderSuggest();
  });
  $('#q').addEventListener('focus', () => { if (state.q.trim().length > 1) renderSuggest(); });
  $('#q').addEventListener('keydown', (e) => {
    const items = $$('#suggest .suggest-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); state.suggestIndex = Math.min(state.suggestIndex + 1, items.length - 1); paintSuggestActive(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); state.suggestIndex = Math.max(state.suggestIndex - 1, 0); paintSuggestActive(); }
    else if (e.key === 'Enter') {
      if (state.suggestIndex >= 0) { e.preventDefault(); items[state.suggestIndex].click(); }
      else closeSuggest();
    } else if (e.key === 'Escape') closeSuggest();
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) closeSuggest(); });
  $('#sort').onchange = (e) => { state.sort = e.target.value; render(); };
  $('#crowd-filter').onchange = (e) => { state.crowdFilter = e.target.value; render(); };
  $('#load-more').onclick = () => { state.shown += 60; render(); };
  $('#view-map').onclick = () => {
    setDisplayMode('map');
    setSheet(isNarrowScreen() ? 'half' : 'collapsed');
  };
  $('#view-list').onclick = () => {
    setDisplayMode('list');
    setSheet('full');
  };
  $('#language-toggle').onclick = () => setLocale(state.locale === 'en' ? 'bn' : 'en');
  const themeToggle = $('#theme-toggle');
  if (themeToggle) themeToggle.onclick = () => applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  $('#location-select').onchange = (e) => {
    const value = e.target.value;
    state.area = value.startsWith('area:') ? value.slice(5) : null;
    state.neighbourhood = value.startsWith('para:') ? decodeURIComponent(value.slice(5)) : null;
    state.quickFilter = null;
    state.metro = null;
    state.shown = 45;
    renderChips();
    render();
    fitFiltered();
  };
  $('#near-me').onclick = async () => {
    const ok = await locate();
    if (ok) {
      state.sort = 'distance';
      $('#sort').value = 'distance';
      state.quickFilter = null;
      renderChips();
      render();
      if (state.active && !$('#card').hidden) showCard(state.bySlug.get(state.active));
    }
  };
  $('#map-lines').onclick = (e) => {
    renderLineLegend();
    e.currentTarget.setAttribute('aria-expanded', 'true');
    openOverlayDrawer('metro-drawer', e.currentTarget);
  };
  $('#metro-line-options').onchange = (e) => {
    const input = e.target.closest('input[data-line]');
    if (!input) return;
    if (input.checked) state.visibleLines.add(input.dataset.line);
    else state.visibleLines.delete(input.dataset.line);
    if (state.mapReady) {
      map().setFilter('metro-lines', ['in', ['get', 'slug'], ['literal', [...state.visibleLines]]]);
    }
    renderLineLegend();
  };
  $('#map-fit').onclick = () => { if (state.mapReady) fitFiltered(); else toast('There is no map to fit in this browser — the list is all ' + state.pandals.length + ' pandals.'); };
  $('#map-locate').onclick = async () => {
    if (!(await locate())) return;
    if (state.mapReady) map().easeTo({ center: [state.userLoc.lon, state.userLoc.lat], zoom: Math.max(map().getZoom(), 14), duration: 700 });
    else toast('Sorted by how far you are.');
  };
  $('#map-zoom-in').onclick = () => state.mapReady && map().zoomIn();
  $('#map-zoom-out').onclick = () => state.mapReady && map().zoomOut();
  $('#map-3d').onclick = (e) => {
    if (!state.mapReady) return;
    const on = e.currentTarget.getAttribute('aria-pressed') === 'true';
    e.currentTarget.setAttribute('aria-pressed', String(!on));
    map().easeTo({ pitch: on ? 0 : 48, duration: 500 });
  };
  $('#menu-toggle').onclick = (e) => {
    if ($('#nav-drawer').hidden) openOverlayDrawer('nav-drawer', e.currentTarget);
    else closeOverlayDrawer();
  };
  $('#nav-filters').onclick = () => {
    closeOverlayDrawer(false);
    setSheet('full');
    $('.filter-disclosure').open = true;
    $('#crowd-filter').focus();
  };
  $('#drawer-backdrop').onclick = () => closeOverlayDrawer();
  $$('.drawer-close').forEach((button) => button.addEventListener('click', () => closeOverlayDrawer()));
  document.addEventListener('keydown', (e) => {
    const drawer = drawerIds.map((id) => $(`#${id}`)).find((item) => !item.hidden);
    if (!drawer) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeOverlayDrawer();
    } else if (e.key === 'Tab') {
      const focusable = $$('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled)', drawer)
        .filter((item) => item.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  const sheet = $('#panel');
  const handle = $('#panel-toggle');
  const setSheet = (snap) => {
    state.sheet = snap;
    sheet.dataset.sheet = snap;
    handle.setAttribute('aria-expanded', String(snap !== 'collapsed'));
    handle.setAttribute('aria-label', `${snap === 'collapsed' ? 'Expand' : 'Collapse'} pandal results, currently ${snap}`);
    $('#panel-toggle-label').textContent = snap === 'collapsed' ? $('#count').textContent : t('Pandal results', 'প্যান্ডেলের তালিকা');
    sheet.style.height = '';
    window.requestAnimationFrame(() => state.mapReady && map().resize());
  };
  setDisplayMode(state.displayMode);
  setSheet(state.displayMode === 'list' ? 'full' : 'collapsed');
  const nextSnap = { collapsed: 'half', half: 'full', full: 'collapsed' };
  let drag = null;
  let suppressSheetClick = false;
  handle.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    drag = { y: e.clientY, height: sheet.getBoundingClientRect().height, moved: false };
    sheet.classList.add('dragging');
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  handle.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const delta = drag.y - e.clientY;
    if (Math.abs(delta) > 4) drag.moved = true;
    const maximum = window.innerHeight - $('.top').offsetHeight - 12;
    sheet.style.height = `${Math.max(60, Math.min(maximum, drag.height + delta))}px`;
  });
  const endDrag = (e) => {
    if (!drag) return;
    const maximum = window.innerHeight - $('.top').offsetHeight - 12;
    const current = sheet.getBoundingClientRect().height;
    const mobile = isNarrowScreen();
    const snaps = mobile
      ? { collapsed: 66, half: window.innerHeight * 0.50, full: maximum }
      : { collapsed: 66, half: window.innerHeight * 0.53, full: maximum };
    const nearest = Object.entries(snaps).sort((a, b) => Math.abs(a[1] - current) - Math.abs(b[1] - current))[0][0];
    suppressSheetClick = drag.moved;
    drag = null;
    sheet.classList.remove('dragging');
    setSheet(nearest);
    if (e && handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
  handle.onclick = () => {
    if (suppressSheetClick) { suppressSheetClick = false; return; }
    setSheet(nextSnap[state.sheet]);
  };
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setSheet(e.key === 'Home' || e.key === 'ArrowDown' ? 'collapsed' : e.key === 'End' ? 'full' : 'half');
    }
  });
  sheet.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'height' && state.mapReady) map().resize();
  });
  window.addEventListener('resize', () => state.mapReady && map().resize());

  /* internal links navigate without a reload */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    const known = /^\/(p\/[^/]+|area\/[^/]+|metro(\/[^/]+)?|route\/[^/]+|routes|pandals|guide|help|about|legal|contact|press|live)?\/?$/.test(href.split('#')[0].split('?')[0]);
    if (!known) return;
    e.preventDefault();
    closeOverlayDrawer(false);
    history.pushState({}, '', href);
    route();
    window.scrollTo(0, 0);
  });

  renderChips();
  syncLocationSelect();
  renderLineLegend();
  setLocale(state.locale);
}

/* ----------------------------------------------------- search suggestions */
/* Type two letters and the names come to you: pandals (English and Bengali),
   streets, paras, areas and stations, in that order of confidence. */
function suggestionsFor(q) {
  const raw = q.trim();
  const s = raw.toLowerCase();
  if (s.length < 2) return [];
  const rank = (text) => {
    const t = text.toLowerCase();
    return t.startsWith(s) ? 0 : t.includes(' ' + s) ? 1 : 2;
  };
  const out = [];
  for (const p of state.pandals) {
    const hit = p.name.toLowerCase().includes(s)
      || (p.nameBn || '').includes(raw)
      || (p.neighbourhood || '').toLowerCase().includes(s)
      || (p.nearStreet || '').toLowerCase().includes(s);
    if (!hit) continue;
    out.push({
      kind: 'pandal', slug: p.slug, label: p.name, bn: p.nameBn,
      meta: `${p.neighbourhood || p.areaName} · ${p.nearestMetro.name} ${fmtM(p.nearestMetro.walkMeters)}`,
      rank: rank(p.name),
    });
  }
  for (const st of state.stations) {
    if (!st.name.toLowerCase().includes(s)) continue;
    out.push({ kind: 'metro', slug: st.slug, label: `${st.name} metro`, meta: `${st.pandalCount} pandals within walking range`, rank: rank(st.name) + 1 });
  }
  for (const [slug, name] of [...new Map(state.pandals.map((p) => [p.area, p.areaName])).entries()]) {
    if (!name.toLowerCase().includes(s)) continue;
    out.push({ kind: 'area', slug, label: name, meta: 'area', rank: rank(name) + 1 });
  }
  for (const nb of [...new Set(state.pandals.map((p) => p.neighbourhood).filter(Boolean))]) {
    if (!nb.toLowerCase().includes(s)) continue;
    const count = state.pandals.filter((p) => p.neighbourhood === nb).length;
    out.push({ kind: 'neighbourhood', slug: nb, label: nb, meta: `para · ${count} pandal${count === 1 ? '' : 's'}`, rank: rank(nb) + 1 });
  }
  return out.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label)).slice(0, 8);
}

function renderSuggest() {
  const box = $('#suggest');
  if (!box) return;
  const items = suggestionsFor(state.q);
  state.suggestIndex = -1;
  if (!items.length) return closeSuggest();
  box.innerHTML = items.map((it) => `<li><button type="button" class="suggest-item" data-kind="${it.kind}" data-slug="${esc(it.slug)}">
      <span class="suggest-label">${esc(it.label)}${it.bn ? ` <span class="faint" lang="bn">${esc(it.bn)}</span>` : ''}</span>
      <span class="suggest-meta">${esc(it.meta)}</span>
    </button></li>`).join('');
  box.hidden = false;
  box.querySelectorAll('.suggest-item').forEach((b) => { b.onclick = () => chooseSuggestion(b.dataset.kind, b.dataset.slug); });
}

function paintSuggestActive() {
  $$('#suggest .suggest-item').forEach((b, i) => {
    const on = i === state.suggestIndex;
    b.classList.toggle('active', on);
    if (on && typeof b.scrollIntoView === 'function') b.scrollIntoView({ block: 'nearest' });
  });
}

function closeSuggest() {
  const box = $('#suggest');
  if (box) { box.hidden = true; box.innerHTML = ''; }
  state.suggestIndex = -1;
}

function chooseSuggestion(kind, slug) {
  closeSuggest();
  const input = $('#q');
  if (kind === 'pandal') {
    input.value = ''; state.q = ''; $('#q-clear').hidden = true;
    render();
    select(slug);
  } else if (kind === 'metro') {
    input.blur();
    openPage({ name: 'metro', slug });
  } else if (kind === 'area') {
    state.area = slug; state.neighbourhood = null; state.shown = 45;
    state.quickFilter = null;
    renderChips(); syncLocationSelect(); render(); if (state.mapReady) fitFiltered();
  } else if (kind === 'neighbourhood') {
    state.neighbourhood = slug; state.area = null; state.shown = 45;
    state.quickFilter = null;
    renderChips(); syncLocationSelect(); render(); if (state.mapReady) fitFiltered();
  }
}

function renderChips() {
  const areas = [...new Map(state.pandals.map((p) => [p.area, p.areaName])).entries()];
  const vipCount = state.pandals.filter((p) => p.isVIP).length;
  const chips = [
    ['area', null, 'All areas'],
    ['vip', null, `VIP Pandals (${vipCount})`],
    ['quick', 'closest10', 'Closest 10 by metro walk'],
    ...areas.map(([slug, name]) => ['area', slug, name]),
  ];
  $('#chips').innerHTML = chips.map(([kind, slug, label]) => {
    const on = kind === 'quick'
      ? state.quickFilter === slug
      : kind === 'vip'
        ? state.vipOnly
        : kind === 'area' && slug == null
          ? !state.area && !state.neighbourhood && !state.quickFilter
          : state[kind] === slug;
    const text = label === 'All areas' ? t('All areas', 'সব এলাকা')
      : label === 'Closest 10 by metro walk' ? t('Closest 10 by metro walk', 'মেট্রোর সবচেয়ে কাছে ১০টি')
        : label.startsWith('VIP Pandals') ? `${t('VIP Pandals', 'ভিআইপি প্যান্ডেল')} (${vipCount})`
          : label;
    return `<button class="chip" type="button" data-kind="${kind}" data-slug="${slug ?? ''}" aria-pressed="${on}">${esc(text)}</button>`;
  }).join('');
  $('#chips').onclick = (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    if (b.dataset.kind === 'vip') {
      state.vipOnly = !state.vipOnly;
    } else if (b.dataset.kind === 'quick') {
      state.quickFilter = b.dataset.slug || null;
      state.area = null;
      state.neighbourhood = null;
      state.metro = null;
    } else {
      state.area = b.dataset.slug || null;
      state.neighbourhood = null;
      state.quickFilter = null;
    }
    state.shown = 45;
    renderChips();
    syncLocationSelect();
    render();
    fitFiltered();
  };
}

function syncLocationSelect() {
  const select = $('#location-select');
  if (!select) return;
  const areas = [...new Map(state.pandals.map((p) => [p.area, p.areaName])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));
  const neighbourhoods = [...new Set(state.pandals.map((p) => p.neighbourhood).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  select.innerHTML = `<option value="">${t('All Kolkata', 'সমগ্র কলকাতা')}</option>
    <optgroup label="${t('Areas', 'এলাকা')}">${areas.map(([slug, name]) => `<option value="area:${esc(slug)}">${esc(name)}</option>`).join('')}</optgroup>
    <optgroup label="${t('Neighbourhoods', 'পাড়া')}">${neighbourhoods.map((name) => `<option value="para:${encodeURIComponent(name)}">${esc(name)}</option>`).join('')}</optgroup>`;
  select.value = state.area ? `area:${state.area}`
    : state.neighbourhood ? `para:${encodeURIComponent(state.neighbourhood)}`
      : '';
}

function setDisplayMode(mode) {
  state.displayMode = mode === 'list' ? 'list' : 'map';
  $('#layout').dataset.mode = state.displayMode;
  $('#view-map').setAttribute('aria-pressed', String(state.displayMode === 'map'));
  $('#view-list').setAttribute('aria-pressed', String(state.displayMode === 'list'));
  writeJSON('pujaguide.view', state.displayMode);
  window.requestAnimationFrame(() => state.mapReady && map().resize());
}

function setLocale(locale) {
  state.locale = locale === 'bn' ? 'bn' : 'en';
  if (document.documentElement) document.documentElement.lang = state.locale;
  writeJSON('pujaguide.locale', state.locale);
  const toggle = $('#language-toggle');
  toggle.textContent = state.locale === 'bn' ? 'English' : 'বাংলা';
  toggle.setAttribute('aria-label', state.locale === 'bn' ? 'Switch interface language to English' : 'বাংলায় দেখুন');
  $('#q').placeholder = t('Search a pandal, street or neighbourhood…', 'প্যান্ডেল, রাস্তা বা পাড়া খুঁজুন…');
  $('#near-me').textContent = t('Near me', 'আমার কাছে');
  $('#near-me').title = t('Sort by your location', 'আপনার অবস্থান অনুযায়ী সাজান');
  $('#location-label').textContent = t('Change location', 'এলাকা বেছে নিন');
  const sortLabels = [['Suggested', 'প্রস্তাবিত'], ['Distance from me', 'আমার থেকে দূরত্ব'], ['Walk from its metro', 'মেট্রো থেকে হাঁটা'], ['Name', 'নাম'], ['Area', 'এলাকা'], ['Neighbourhood', 'পাড়া'], ['Live queue', 'বর্তমান ভিড়']];
  $('#sort').querySelectorAll('option').forEach((option, i) => { option.textContent = t(...sortLabels[i]); });
  const crowdLabels = [['Any', 'যে কোনও'], ['Reported right now', 'সাম্প্রতিক রিপোর্ট'], ['Easy', 'সহজ'], ['Busy', 'ভিড়'], ['Very crowded', 'অত্যন্ত ভিড়']];
  $('#crowd-filter').querySelectorAll('option').forEach((option, i) => { option.textContent = t(...crowdLabels[i]); });
  $('#filter-summary').textContent = t('Filter pandals', 'প্যান্ডেল বাছুন');
  $('#view-map').textContent = t('Map', 'মানচিত্র');
  $('#view-list').textContent = t('List', 'তালিকা');
  syncLocationSelect();
  renderChips();
  render();
  if (state.active && !$('#card').hidden) showCard(state.bySlug.get(state.active));
  applyTheme(state.theme);
}

/* ------------------------------------------------------------ router */
function route() {
  const parts = location.pathname.split('/').filter(Boolean);
  const params = new URLSearchParams(location.search);

  /* a shared plan in the query string */
  if (params.get('plan')) {
    const stops = params.get('plan').split(',').filter((s) => state.bySlug.has(s));
    if (stops.length) {
      state.plan = stops;
      writeJSON('pujaguide.plan', stops);
      state.legs = {};
      openOverlayDrawer('drawer', $('#plan-open'));
      renderPlan();
      updatePlanCount();
      drawPlanLine();
      toast('Route loaded from the link.');
    }
  }

  $('#page').hidden = true;
  $('#card').hidden = true;
  state.active = null;

  const nav = (name) => {
    $$('.mainnav a').forEach((a) => a.removeAttribute('aria-current'));
    const el = $(`.mainnav a[data-nav="${name}"]`);
    if (el) el.setAttribute('aria-current', 'page');
  };

  if (!parts.length) {
    state.view = { name: 'map', slug: null };
    nav('map');
    applyScope({}, 'All pandals', `Kolkata Durga Puja ${YEAR} pandal map`);
    render(); fitFiltered();
    return;
  }

  const [a, b] = parts;
  if (a === 'p' && b && state.bySlug.has(b)) {
    state.view = { name: 'pandal', slug: b };
    nav('map');
    applyScope({}, 'All pandals', `Kolkata Durga Puja ${YEAR} pandal map`);
    render();
    select(b, { noFly: false });
    const p = state.bySlug.get(b);
    if (state.mapReady) map().flyTo({ center: [p.lon, p.lat], zoom: 15.5, pitch: 55, duration: 700 });
    document.title = `${p.name} — PujaHop Kolkata`;
    return;
  }
  if (a === 'area' && b) { openPage({ name: 'area', slug: b }); return; }
  if (a === 'metro' && b) { openPage({ name: 'metro', slug: b }); return; }
  if (a === 'metro') { openPage({ name: 'metroIndex' }); return; }
  if (a === 'route' && b) { openPage({ name: 'route', slug: b }); return; }
  if (a === 'p' && b) { openPage({ name: 'missing' }); return; }
  if (a === 'pandals') { openPage({ name: 'pandals' }); return; }
  if (a === 'routes') { openPage({ name: 'routes' }); return; }
  if (a === 'live') { openPage({ name: 'live' }); return; }
  if (['guide', 'about', 'legal', 'contact', 'press', 'help'].includes(a)) { openPage({ name: a }); return; }
  openPage({ name: 'missing' });
}

function setScopeMetroArea({ area, neighbourhood, areaSlug }) {
  state.area = areaSlug || null;
  state.neighbourhood = neighbourhood || null;
  state.shown = 45;
  state.view = { name: 'map', slug: areaSlug || null };
  renderChips(); render(); fitFiltered();
}

function applyScope(_scope, eyebrow, title) {
  $('#panel-eyebrow').textContent = eyebrow;
  $('#panel-title').textContent = title;
}

window.addEventListener('DOMContentLoaded', () => {
  boot().catch((err) => {
    console.error(err);
    document.body.insertAdjacentHTML('afterbegin', '<p style="padding:14px">The data did not load. Reload when you have a connection.</p>');
  });
});

/* ==========================================================================
   Pages: the list-and-index side of the site. Everything here is generated
   from the data files — no page carries a claim the data cannot support.
   ========================================================================== */
const CONTACT = 'hello@pujahop.in'; // ← set your own address before deploying
const YEAR_V = 2026;

const stationFor = (name) => state.stations.find((s) => s.name === name);

function openPage(view) {
  state.view = view;
  const inner = $('#page-inner');
  const { html, wire } = PAGES[view.name] ? PAGES[view.name](view) : PAGES.missing(view);
  inner.innerHTML = html;
  $('#page').hidden = false;
  $('#page').scrollTop = 0;
  $$('.mainnav a').forEach((a) => a.removeAttribute('aria-current'));
  const navKey = { metro: 'metro', metroIndex: 'metro', routes: 'routes', route: 'routes', guide: 'guide', help: 'help', pandals: 'pandals' }[view.name];
  if (navKey) $(`.mainnav a[data-nav="${navKey}"]`)?.setAttribute('aria-current', 'page');
  document.title = (view.title || defaultTitle(view));
  if (wire) wire(inner);
}

const defaultTitle = (view) => {
  const t = {
    pandals: 'Every pandal', routes: 'Walking routes', metroIndex: 'Pandals by metro',
    guide: 'Puja guide', help: 'Emergency and help', about: 'About', legal: 'Privacy and terms', contact: 'Contact',
    press: 'Press', live: 'Live queue reports', missing: 'Not found',
  }[view.name];
  return t ? `${t} — PujaHop Kolkata` : 'PujaHop Kolkata';
};

const backToMap = '<p class="back"><a href="/">← Back to the pandal map</a></p>';
const closePage = (e) => { e.preventDefault(); $('#page').hidden = true; history.pushState({}, '', '/'); route(); };

function scopeToMap({ area = null, neighbourhood = null, metro = null, slugs = null }, label) {
  state.area = area; state.neighbourhood = neighbourhood; state.metro = metro;
  state.quickFilter = null;
  state.shown = 45;
  $('#page').hidden = true;
  history.pushState({}, '', '/');
  $('#panel-eyebrow').textContent = 'Filtered';
  $('#panel-title').textContent = label;
  renderChips(); syncLocationSelect(); render(); fitFiltered();
  if (slugs && slugs.length) {
    const list = slugs.map((s) => state.bySlug.get(s)).filter(Boolean);
    const b = new maplibregl.LngLatBounds();
    list.forEach((p) => b.extend([p.lon, p.lat]));
    map()?.fitBounds(b, { padding: { top: 90, bottom: 90, left: 90, right: 90 }, pitch: 45, duration: 900 });
  }
}

const stopRow = (p, i, walk) => `<tr>
  <td>${i}</td>
  <td><a href="/p/${p.slug}">${esc(displayName(p))}</a>${state.locale === 'en' && p.nameBn ? `<br><span class="faint" lang="bn">${esc(p.nameBn)}</span>` : ''}</td>
  <td>${esc(p.neighbourhood || p.areaName)}</td>
  <td>${walk == null ? '—' : `${fmtM(walk)}<br><span class="faint">${fmtMin(walk)}</span>`}</td>
  <td>${esc(p.nearestMetro.name)}<br><span class="faint">${fmtM(p.nearestMetro.walkMeters)}</span></td>
</tr>`;

const PAGES = {};

/* ------------------------------------------------------------- every pandal */
PAGES.pandals = () => {
  const byArea = new Map();
  for (const p of state.pandals) {
    if (!byArea.has(p.areaName)) byArea.set(p.areaName, []);
    byArea.get(p.areaName).push(p);
  }
  const sections = [...byArea.entries()].map(([area, list]) => {
    list.sort((a, b) => (a.neighbourhood || '').localeCompare(b.neighbourhood || '') || a.name.localeCompare(b.name));
    return `<h2>${esc(area)} <span class="faint">· ${list.length}</span></h2>
      <table><thead><tr><th>#</th><th>Pandal</th><th>Para</th><th>Walk from its metro</th><th>Nearest metro</th></tr></thead><tbody>
      ${list.map((p, i) => stopRow(p, i + 1, p.nearestMetro.walkMeters)).join('')}
      </tbody></table>`;
  }).join('');
  return {
    html: `${backToMap}
      <h1>Every mapped pandal</h1>
      <p class="lede">${state.pandals.length} Durga Puja pandals, with the para each one is in and the walk from the nearest metro. Sorted by area, then by para.</p>
      <p class="fine">A pin is either matched to a surveyed place in OpenStreetMap, placed at the para centre, or snapped to its street. Each card says which, so you can judge how precise it is.</p>
      ${sections}`,
  };
};

/* ------------------------------------------------------------------ routes */
PAGES.routes = () => {
  const cards = state.routes.map((r) => `<a href="/route/${r.slug}">
      <strong>${esc(r.name)}</strong>
      <span>${r.stopCount} stops · ${fmtKm(r.walkingMeters)} on foot · about ${Math.round(r.minutesWithStops / 5) * 5} min</span>
    </a>`).join('');
  return {
    html: `${backToMap}
      <h1>Walking routes</h1>
      <p class="lede">Each route starts at one pandal and takes the stops nearest it, put in an order that keeps every leg short. They are worked out from the coordinates, so they change when the map does.</p>
      <div class="cards">${cards}</div>
      <p class="fine">Distances are straight-line × 1.28 unless you open a route and measure it on real streets. On Saptami, Ashtami and Navami evenings add a long queue at the big pandals.</p>`,
  };
};

PAGES.route = (view) => {
  const r = state.routeBySlug.get(view.slug);
  if (!r) return PAGES.missing(view);
  const stops = r.stops.map((s) => state.bySlug.get(s)).filter(Boolean);
  const rows = stops.map((p, i) => stopRow(p, i + 1, i === 0 ? null : r.legs[i - 1]?.walkMeters)).join('');
  const start = stops[0], end = stops[stops.length - 1];
  return {
    html: `${backToMap}
      <h1>${esc(r.name)}</h1>
      <p class="lede">${r.stopCount} stops · ${fmtKm(r.walkingMeters)} on foot · about ${Math.round(r.minutesWithStops / 5) * 5} minutes with a look at each.</p>
      <p><button class="btn primary" type="button" id="route-start">Start from this route</button>
         <button class="btn" type="button" id="route-map">Show on the map</button>
         <button class="btn" type="button" id="route-print">Print</button></p>
      <table><thead><tr><th>#</th><th>Pandal</th><th>Para</th><th>Walk from the one before</th><th>Nearest metro</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <h2>Getting there and back</h2>
      <p>Start at ${esc(start.name)}: ${esc(start.nearestMetro.name)} metro is ${fmtM(start.nearestMetro.walkMeters)} away. Finish at ${esc(end.name)}: ${esc(end.nearestMetro.name)} metro is ${fmtM(end.nearestMetro.walkMeters)} away. On Saptami–Navami nights the Blue and Green lines have in past years run until about 4 am, which is what makes a route like this possible.</p>
      <p class="fine">Legs are straight-line × 1.28. Open the route in “Your route” to measure the real walking distances on the OSM foot router, or to rearrange it.</p>`,
    wire: (root) => {
      $('#route-start').onclick = () => {
        state.plan = r.stops.slice();
        state.legs = {};
        r.legs.forEach((l) => (state.legs[`${l.from}|${l.to}`] = l.walkMeters));
        writeJSON('pujaguide.plan', state.plan);
        updatePlanCount();
        $('#page').hidden = true;
        history.pushState({}, '', '/');
        openOverlayDrawer('drawer', $('#plan-open'));
        renderPlan(); render(); drawPlanLine();
        select(r.stops[0]);
        toast('Route loaded into your route — edit it as you like.');
      };
      $('#route-map').onclick = () => scopeToMap({ slugs: r.stops }, r.name);
      $('#route-print').onclick = () => window.print();
    },
  };
};

/* ------------------------------------------------------------------- metro */
PAGES.metroIndex = () => {
  const rows = state.stations
    .map((s) => `<tr><td><a href="/metro/${s.slug}">${esc(s.name)}${s.nameBn ? ` <span class="faint" lang="bn">${esc(s.nameBn)}</span>` : ''}</a></td>
      <td>${s.pandalCount} pandal${s.pandalCount === 1 ? '' : 's'}</td>
      <td>${fmtM(s.nearestWalkMeters)}</td></tr>`)
    .join('');
  return {
    html: `${backToMap}
      <h1>Pandals by metro station</h1>
      <p class="lede">On Puja nights the metro is the only thing in Kolkata still moving at a predictable speed. These are the ${state.stations.length} stations the mapped pandals name as their nearest, and what is within walking range of each.</p>
      ${state.lines.length ? `<h2>By line</h2>
      ${state.lines.map((l) => {
        const list = l.stations.map((st) => {
          const s = state.stations.find((x) => x.name === st.name);
          const name = esc(st.name);
          const body = s
            ? `<a href="/metro/${s.slug}">${name}</a> <span class="faint">${s.pandalCount} pandal${s.pandalCount === 1 ? '' : 's'}</span>`
            : `${name} <span class="faint">no mapped pandal</span>`;
          const gap = st.mapped === false ? ' <span class="faint">· not drawn</span>' : '';
          return `<li>${body}${gap}</li>`;
        }).join('');
        return `<h3><i class="swatch" style="background:${esc(l.colour)}"></i> ${esc(l.name)} <span class="faint">· ${esc(l.route)}</span></h3>
          ${list ? `<ul class="stationlist">${list}</ul>` : '<p class="faint">No mapped pandal names a station on this line.</p>'}`;
      }).join('')}
      <p class="fine">A station is listed under every line it is on. The alignment drawn on the map joins published station coordinates, so it is an approximation of the track, not a survey.${state.lines.some((l) => (l.stationsNotDrawn || []).length) ? ` One station, ${state.lines.flatMap((l) => l.stationsNotDrawn || []).join(', ')}, has no coordinate we trust and is not drawn.` : ''}</p>` : ''}
      <h2>Every station</h2>
      <table><thead><tr><th>Station</th><th>Pandals naming it</th><th>Closest</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="fine">Station pins sit on published station coordinates; the walk against each pandal is the distance the dataset publishes. The two agree to a median of about ${fmtM(state.meta.stationWalkResidualMedian || 0)}, which is the honest size of the error you should expect.</p>`,
  };
};

PAGES.metro = (view) => {
  const s = state.stationBySlug.get(view.slug);
  if (!s) return PAGES.missing(view);
  const rows = s.pandals.map((x, i) => {
    const p = state.bySlug.get(x.slug);
    return stopRow(p, i + 1, x.walkMeters);
  }).join('');
  return {
    html: `${backToMap}
      <h1>${esc(s.name)} metro</h1>
      <p class="lede">${s.pandalCount} mapped pandal${s.pandalCount === 1 ? '' : 's'} name this station as their nearest, the closest ${fmtM(s.nearestWalkMeters)} away. Sorted by the walk from the station.</p>
      ${(s.lines || []).length ? `<p>${(s.lines || []).map((slug) => {
        const l = state.lineBySlug.get(slug);
        return l ? `<span class="badge" style="border-color:${esc(l.colour)};color:${esc(l.colour)}">${esc(l.name)}</span> ${esc(l.route)}` : '';
      }).join('<br>')}</p><p class="fine">Line alignment on the map joins published station coordinates, not a survey.</p>` : ''}
      <p><button class="btn primary" type="button" id="metro-map">Show on the map</button></p>
      <table><thead><tr><th>#</th><th>Pandal</th><th>Para</th><th>Walk from the station</th><th>Nearest metro</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="fine">The pin is the station's published coordinate, not a survey; the walks are as published per pandal.</p>`,
    wire: () => {
      $('#metro-map').onclick = () => scopeToMap({ metro: s.name }, `${s.name} metro`);
    },
  };
};

/* -------------------------------------------------------------------- area */
PAGES.area = (view) => {
  const list = state.pandals.filter((p) => p.area === view.slug);
  if (!list.length) return PAGES.missing(view);
  const byNb = new Map();
  for (const p of list) {
    const k = p.neighbourhood || 'Elsewhere in the area';
    if (!byNb.has(k)) byNb.set(k, []);
    byNb.get(k).push(p);
  }
  const sections = [...byNb.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([nb, group]) => `<h2>${esc(nb)} <span class="faint">· ${group.length}</span></h2>
      <table><thead><tr><th>#</th><th>Pandal</th><th>Para</th><th>Walk from its metro</th><th>Nearest metro</th></tr></thead>
      <tbody>${group.sort((a, b) => a.name.localeCompare(b.name)).map((p, i) => stopRow(p, i + 1, p.nearestMetro.walkMeters)).join('')}</tbody></table>`)
    .join('');
  return {
    html: `${backToMap}
      <h1>${esc(list[0].areaName)}</h1>
      <p class="lede">${list.length} mapped pandals across ${byNb.size} neighbourhoods.</p>
      <p><button class="btn primary" type="button" id="area-map">Show on the map</button></p>
      ${sections}`,
    wire: () => { $('#area-map').onclick = () => scopeToMap({ area: view.slug }, list[0].areaName); },
  };
};

/* ------------------------------------------------------------------- guide */
PAGES.guide = () => {
  const dates = tithiRows
    .map((r) => `<tr><td>${esc(r.day)}</td><td>${esc(r.date)}</td><td>${esc(r.note)}</td></tr>`)
    .join('');
  const routeCards = state.routes.slice(0, 6).map((r) => `<a href="/route/${r.slug}"><strong>${esc(r.name)}</strong><span>${r.stopCount} stops · ${fmtKm(r.walkingMeters)}</span></a>`).join('');
  return {
    html: `${backToMap}
      <h1>Kolkata Durga Puja ${YEAR_V}: dates, routes and getting around</h1>
      <p class="lede">Pick a route, go on a Saptami, Ashtami or Navami evening, and take the metro home. Everything here is on the <a href="/">map</a>, with live queue reports and walking directions.</p>

      <h2>The dates</h2>
      <table><thead><tr><th>Day</th><th>${YEAR_V}</th><th></th></tr></thead><tbody>${dates}</tbody></table>
      <p class="fine">Panchangs do not agree on ${YEAR_V}: some place Shashthi on 17 October, Ashtami on 18 and Dashami on 20; others put Shashthi on 16, Ashtami on 19 and Dashami on 21. The tithi boundaries run Shashthi until about 5:54 am on 17 October, Ashtami until about 10:51 am on 19 October and Navami until about 12:50 pm on 20 October, with Sandhi Puja in the morning of 19 October. Sources disagree in the same way —
        <a href="https://www.divinehindu.in/blogs/news/durga-puja-2026-dates-sandhi-puja-rituals" target="_blank" rel="noopener">this panjika reckoning</a> puts Shashthi on 17 October,
        <a href="https://www.walkanothermile.com/blog/durga-puja-2026-guide.html" target="_blank" rel="noopener">this one</a> on 16. Confirm the days with your own panjika or the puja committee before travelling.</p>

      <h2>Pick a route</h2>
      <p>Each route is a walkable evening — the stops in order, the distance between them, and the total on foot. Treat the times as an allowance, not a promise: on the big nights a single queue can eat an hour.</p>
      <div class="cards">${routeCards}</div>
      <p><a href="/routes">All ${state.routes.length} routes →</a></p>

      <h2>Getting around</h2>
      <p>Use the metro between the far-apart parts of a route and walk the rest. Tap <strong>Near me</strong> and the whole catalogue sorts by how far you actually are, so you can see what is worth walking to before you set off. Each pandal card shows its nearest station and the walk from it, and <strong>Walking directions</strong> draws a real route on the map, from the OSM foot router.</p>
      <p class="fine">Puja-week metro timings are announced by Kolkata Metro each year. In 2025 the Blue and Green lines ran until about 4 am on Saptami to Navami nights; nothing about ${YEAR_V} is confirmed until they publish it. Check the <a href="https://mtp.indianrailways.gov.in/" target="_blank" rel="noopener">Metro Railway</a> notices, or ask at the station.</p>

      <h2>What the queue reports are</h2>
      <p>Visitors tap <strong>Easy</strong>, <strong>Busy</strong> or <strong>Very crowded</strong> at a pandal. The reports show on the map and on the card, and they fade after ninety minutes, because a queue described two hours ago tells you nothing. They are what other people reported; nobody checks them.</p>

      <h2>Plan it before you leave</h2>
      <p>Add pandals to <strong>Your route</strong> and they get put in a walking order. Save it for offline and it works with no signal: the walk, its stops and the map you already opened stay on your phone. Share the link and whoever opens it gets the same route.</p>`,
  };
};

const tithiRows = [
  { day: 'Mahalaya', date: 'Sat 10 Oct', note: 'Devi Paksha begins; the idols get their eyes at Kumartuli' },
  { day: 'Shashthi', date: 'Fri 16 Oct (some panchangs: Sat 17)', note: 'Bodhon — the puja begins, pandals open' },
  { day: 'Saptami', date: 'Sat 17 – Sun 18 Oct', note: 'Nabapatrika snan at dawn; the first full evening of hopping' },
  { day: 'Mahashtami', date: 'Mon 19 Oct (some panchangs: Sun 18)', note: 'Pushpanjali, Kumari Puja; Sandhi Puja in the morning' },
  { day: 'Mahanavami', date: 'Tue 20 Oct', note: 'Navami homa, dhunuchi naach; the last full night' },
  { day: 'Bijoya Dashami', date: 'Wed 21 Oct (some panchangs: Tue 20)', note: 'Sindoor Khela, then bisarjan' },
];

/* ------------------------------------------------------------------- live */
PAGES.live = () => {
  const reports = (state.recentReports || []).slice(0, 60);
  const body = reports.length
    ? `<table><thead><tr><th>When</th><th>Pandal</th><th>Queue</th><th>Note</th></tr></thead><tbody>
      ${reports.map((r) => {
        const p = state.bySlug.get(r.slug);
        if (!p) return '';
        return `<tr><td class="faint">${fmtAgo(r.at)}</td><td><a href="/p/${p.slug}">${esc(p.name)}</a><br><span class="faint">${esc(p.neighbourhood || p.areaName)}</span></td>
          <td><span class="badge ${r.level}">${LEVEL_LABEL[r.level]}</span></td><td>${r.note ? esc(r.note) : '<span class="faint">—</span>'}</td></tr>`;
      }).join('')}</tbody></table>`
    : `<p class="plan-empty">Nothing reported in the last ninety minutes. Stand at a pandal, open it on the map, and tap Easy, Busy or Very crowded — the next person gets to see it.</p>`;
  return {
    html: `${backToMap}
      <h1>Live queue reports</h1>
      <p class="lede">What visitors have said about the queues, newest first. Every report fades ninety minutes after it was made.</p>
      ${body}
      <p class="fine">Reports are what other visitors said, unverified. A queue changes within minutes of being described.</p>`,
  };
};

PAGES.help = () => ({
  html: `${backToMap}
    <h1>Emergency &amp; help</h1>
    <p class="lede">Quick access to public emergency numbers and official city resources. For immediate danger or a medical emergency, call the relevant service directly.</p>
    <section class="help-emergency" aria-label="Emergency numbers">
      <h2>Emergency numbers in India</h2>
      <p><a class="help-number" href="tel:112">112</a> National emergency response</p>
      <p><a class="help-number" href="tel:100">100</a> Police</p>
      <p><a class="help-number" href="tel:102">102</a> Ambulance / medical help</p>
      <p class="fine">If a number does not connect, use 112 for emergency assistance. Verify local availability and current details before relying on non-emergency services.</p>
    </section>
    <h2>Official city resources</h2>
    <div class="help-links">
      <a href="https://www.kolkatapolice.gov.in/" target="_blank" rel="noopener"><strong>Kolkata Police</strong><br><span class="faint">Official website and public contacts</span></a>
      <a href="https://www.kmcgov.in/" target="_blank" rel="noopener"><strong>Kolkata Municipal Corporation</strong><br><span class="faint">City services and public information</span></a>
      <a href="https://mtp.indianrailways.gov.in/" target="_blank" rel="noopener"><strong>Metro Railway Kolkata</strong><br><span class="faint">Official metro notices and passenger information</span></a>
    </div>
    <p class="fine">This guide is not an emergency service. We do not maintain verified live locations for police stations, hospitals, medical camps or festival help desks; use official services for current directions.</p>`,
});

/* ------------------------------------------------------------------ about */
PAGES.about = () => {
  const s = state.meta;
  return {
    html: `${backToMap}
      <h1>About PujaHop Kolkata</h1>
      <p class="lede">A free, independent map of Durga Puja in Kolkata. It shows where the pandals are, the nearest metro to each, walking routes for an evening, and directions from wherever you are. No account, no ads, no trackers.</p>

      <h2>What is here</h2>
      <table><tbody>
        <tr><th>Pandals mapped</th><td>${s.pandalCount}</td></tr>
        <tr><th>Metro stations with pandals in range</th><td>${s.stationCount}</td></tr>
        <tr><th>Metro lines drawn</th><td>${s.lineCount}</td></tr>
        <tr><th>Pandals with a freely licensed photograph</th><td>${s.photoCount}</td></tr>
        <tr><th>Walking routes</th><td>${s.routeCount}</td></tr>
        <tr><th>Neighbourhoods</th><td>${new Set(state.pandals.map((p) => p.neighbourhood).filter(Boolean)).size}</td></tr>
        <tr><th>Data built</th><td>${new Date(s.builtAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
        <tr><th>Licence</th><td>Data: ODbL 1.0, © OpenStreetMap contributors. App code: MIT.</td></tr>
      </tbody></table>

      <h2>Where the data comes from</h2>
      <p>The base map and the walking directions are <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, rendered by <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> with <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> styles. The pandal catalogue is built from the open dataset that <a href="https://www.pujomap.com/data/LICENSE.txt" target="_blank" rel="noopener">pujomap.com publishes under ODbL</a> — names, zones, streets, coordinates and the nearest metro to each — rebuilt, de-duplicated and extended here. Walking routes are worked out from those coordinates. Metro station positions and line alignments come from Wikipedia's list of Kolkata Metro stations, whose coordinates are OpenStreetMap and Wikidata (CC BY-SA / CC0); the pandal dataset never carried station coordinates.</p>
      <p>This site is not affiliated with pujomap.com; their dataset is reused under its licence, with credit, and their application code is not used or copied. See <a href="/about#credits">credits</a> below.</p>

      <h2 id="credits">Credits and licence</h2>
      <ul>
        <li>Pandal data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>, ODbL 1.0. Republished here under the same licence; the file is served at <a href="/data/pandals.json">/data/pandals.json</a> so anyone can take it onward.</li>
        <li>Upstream catalogue: pujomap.com, which publishes its pandal rows and states plainly which rows it cannot license onward. Those rows are not present here.</li>
        <li>Map tiles: OpenFreeMap and OpenMapTiles. Walking routes: the public OSRM foot router run by <a href="https://routing.openstreetmap.de/" target="_blank" rel="noopener">FOSSGIS</a>.</li>
        <li>Metro station coordinates and line membership: Wikipedia's <em>List of Kolkata Metro stations</em> and the individual station articles, CC BY-SA 4.0, themselves sourced from OpenStreetMap and Wikidata.</li>
        <li>Photographs: Wikimedia Commons, each under the licence printed on the card next to the photographer's name.</li>
      </ul>

      <h2>Principles</h2>
      <ul>
        <li><strong>No invented ratings.</strong> There are no stars here. The only crowd information is what visitors report, and it says so.</li>
        <li><strong>No guesses presented as fact.</strong> Every card says how its pin was placed; the metro lines say they join published station coordinates rather than a survey; every estimated walk says it is estimated.</li>
        <li><strong>Nothing that follows you.</strong> Browsing needs no account, and what you save stays in your browser.</li>
      </ul>

      <h2>Corrections</h2>
      <p>Use <em>Something wrong here?</em> on a pandal's card, or <a href="/contact">write to us</a>. Puja committees: send the location, the year's theme and the opening night, and it goes in at the top of the queue.</p>`,
  };
};

/* ------------------------------------------------------------------ legal */
PAGES.legal = () => ({
  html: `${backToMap}
    <h1>Privacy and terms</h1>
    <p class="lede">The short version: looking at the map needs no account and collects nothing about you personally. What you save stays in your browser. Queue reports are what visitors say, and nobody checks them.</p>

    <h2>What is collected</h2>
    <p><strong>If you only look at the map:</strong> nothing. There is no analytics script on this site and no cookie that follows you.</p>
    <p><strong>Your location</strong>, if you tap <em>Near me</em> or ask for directions, is used in your browser to sort the list and draw a route. It is not sent to this server and not stored.</p>
    <p><strong>Queue reports.</strong> When you report a queue, this site stores the pandal, the level you chose, an optional note, the time, and a random id kept in your browser so one person cannot flood the map. No name, no email, no IP address is stored. Reports are deleted ninety minutes after they are made.</p>
    <p><strong>Your route, your “been there” list and your saved offline copy</strong> live in your browser's local storage and are never uploaded. A route you share travels as a link you send yourself.</p>

    <h2>Terms</h2>
    <p><strong>Nothing here is guaranteed.</strong> Pandal details come from open data and from corrections sent in; they are not verified. A pandal is a temporary structure, and a pin is often placed by hand.</p>
    <p><strong>Walking distances are estimates</strong> unless a route has been measured on the OSM foot router, and even then they are a machine's idea of a walk, not a promise about a Puja-night street.</p>
    <p><strong>Crowd levels are what other visitors reported.</strong> A queue changes within minutes of being described.</p>
    <p><strong>Opening hours and metro timings are not ours.</strong> The dates and timings shown come from panchangs and from published metro notices, and they change. Check before you travel.</p>
    <p><strong>The base map is OpenStreetMap</strong>, served by OpenFreeMap, and walking directions are calculated by the public OSRM service run by FOSSGIS. Both see the requests your browser makes to them.</p>
    <p><strong>Data licence:</strong> ODbL 1.0, © OpenStreetMap contributors — reuse it, credit it, keep it open. <strong>App code:</strong> MIT.</p>`,
});

/* ---------------------------------------------------------------- contact */
PAGES.contact = () => ({
  html: `${backToMap}
    <h1>Contact</h1>
    <p class="lede">One address, read by a person: <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>

    <h2>Report a wrong location</h2>
    <p>Use <em>Something wrong here?</em> on the pandal's card. It fills in the puja and asks you where the pin should be, and you can drag the pin in the mail — or just tell us the landmark.</p>

    <h2>Puja committees</h2>
    <p>If you organise a puja, write with its location, this year's theme and the opening night. Information from organisers goes in ahead of anything derived from published lists, and there is no charge.</p>

    <h2>Contributing photographs</h2>
    <p>${state.meta.photoCount} pandals carry a photograph here, all of them freely licensed on Wikimedia Commons and credited on the card with the photographer, the licence and the year. Every pandal is rebuilt each year, so a photograph records a past edition, not what is standing now — the cards say so.</p>
    <p>Most pandals still have no photograph. If you have one you took yourself and are willing to license it for reuse (CC BY, CC BY-SA or CC0), send it and we will add it with your name. Do not send other people's pictures.</p>

    <h2>Press</h2>
    <p>See the <a href="/press">press page</a> for a description and the key numbers.</p>`,
});

/* ------------------------------------------------------------------ press */
PAGES.press = () => ({
  html: `${backToMap}
    <h1>Press</h1>
    <p class="lede"><strong>PujaHop Kolkata</strong> is a free, independent map of Durga Puja in Kolkata: where the pandals are, the nearest metro to each, what is within walking distance, and what visitors are reporting about the queues right now.</p>
    <h2>Key numbers</h2>
    <ul>
      <li>${state.meta.pandalCount} pandals mapped across Kolkata and Howrah</li>
      <li>${state.meta.stationCount} metro stations with pandals in walking range</li>
      <li>${state.meta.lineCount} metro lines drawn between ${state.meta.stationCount} stations, so you can see which pujas sit on one line</li>
      <li>${state.meta.routeCount} walking routes, each with leg-by-leg distances</li>
      <li>${state.meta.photoCount} pandals with a freely licensed photograph on their card</li>
      <li>Free, no account, no advertising, no trackers</li>
    </ul>
    <h2>What makes it different</h2>
    <p>Every card discloses how its pin was placed — matched to OpenStreetMap, placed at the para centre, or snapped to the street — so a reader can judge how precise it is. Queue reports come from visitors and fade after ninety minutes. Metro lines join published station coordinates rather than a survey, and each page says which walk distances are estimated.</p>
    <h2>Screenshots</h2>
    <p>Open <a href="/">the map</a> and take your own, or ask and we will send a set. Data is ODbL, © OpenStreetMap contributors; reuse it with credit.</p>
    <h2>Contact</h2>
    <p><a href="mailto:${CONTACT}">${CONTACT}</a></p>`,
});

/* ---------------------------------------------------------------- missing */
PAGES.missing = () => ({
  html: `${backToMap}
    <h1>Not on this map</h1>
    <p class="lede">That page does not exist here. Try the <a href="/">pandal map</a>, <a href="/pandals">every pandal</a>, <a href="/metro">pandals by metro</a> or the <a href="/routes">walking routes</a>.</p>`,
});
