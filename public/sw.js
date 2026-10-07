/* Service worker.
 *
 * Two rules, learned the hard way:
 *   1. The app itself must never be served stale. A cached app.js beside a
 *      fresh index.html is a broken page, so the shell is network-first and
 *      the cache is only a fallback for when there is no network.
 *   2. The data may be served from cache first, because it changes rarely,
 *      but it is refreshed in the background on every load.
 *
 * The API is never cached: a queue report from twenty minutes ago is not
 * information.
 */
const VERSION = 'pujaguide-v7';
const SHELL = [
  '/',
  '/style.css?v=9',
  '/app.js?v=9',
  '/vendor/maplibre-gl.css?v=4.7.1',
  '/vendor/maplibre-gl.js?v=4.7.1',
  '/data/pandals.json',
  '/data/stations.json',
  '/data/routes.json',
  '/data/lines.json', '/data/photos.json',
  '/manifest.webmanifest',
  '/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const put = (request, response) => {
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(VERSION).then((c) => c.put(request, copy)).catch(() => {});
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;            // tiles and routing go straight out
  if (url.pathname.startsWith('/api/')) return;          // live reports are never cached

  /* navigations and the app shell: network first, cache as the safety net */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => put(request, res))
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
        .then((res) => res || new Response(
          '<!doctype html><meta charset="utf-8"><title>Offline — Puja Guide</title>' +
          '<p style="font:16px/1.6 system-ui;padding:12vh 1rem;max-width:34rem;margin:auto">You are offline and this page was not saved. ' +
          'The map you opened before and any route you saved for offline will still work.</p>',
          { headers: { 'content-type': 'text/html; charset=utf-8' } }
        ))
    );
    return;
  }

  /* the catalogue: instant from cache, refreshed behind you */
  if (url.pathname.startsWith('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((res) => put(request, res)).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  /* everything else in the shell (scripts, styles, icons): network first */
  event.respondWith(
    fetch(request)
      .then((res) => put(request, res))
      .catch(() => caches.match(request))
      .then((res) => res || Response.error())
  );
});
