# Puja Guide

A Durga Puja pandal map for Kolkata: **280 pandals** on a 3D map, each with the
nearest metro and the walk from the station, the pujas within a few minutes on
foot, 20 walking routes with leg-by-leg distances, and live queue reports that
fade after ninety minutes.

No account, no ads, no trackers. Nothing you save leaves your browser except a
queue report, which is stored without a name, an email or an IP address.

## Run it

```bash
npm install          # installs maplibre-gl; public/vendor is committed already
npm start            # http://localhost:8080
npm test             # both test suites, no browser needed
```

Two test suites, because there is no browser here:

- `npm run smoke` — runs the real `app.js` against a stub DOM and opens every
  page, checking that none of them throw or print a hole.
- `npm run test:render` — loads the real `index.html` and `app.js` in jsdom and
  checks the failure that bit once: **the map must never take the site down
  with it.** The page is run three times — map working, map failing to start,
  map library missing — and the list, the count and the filters must be there
  every time. Needs `npm i -D jsdom esbuild`.

Node 18+ and nothing else. There is no build step: the front end is plain ES
modules, the server is `node:http`.

```bash
npm run build:data   # rebuild data/*.json from data/raw/*.jsonl
```

## What is in the app

| | |
| --- | --- |
| **Map** | MapLibre GL + OpenFreeMap tiles, pitched 3D, pandal pins coloured by live queue, station pins, walking routes drawn on the map. |
| **List** | Search across names (English and Bengali), streets, paras and stations; sort by suggested, distance from you, walk from the puja's metro, name, area, para, or live queue; filter by area and by queue. |
| **Pandal card** | Nearest metro and the walk to it, street, area, how the pin was placed and how precise that is, the pujas within a few minutes on foot, directions, share, "been there", and a correction mail. |
| **Your route** | Pick pandals, get them in a walking order, see every leg, measure the legs on the real OSM foot router, share the route as a link, save it for offline use, print it. |
| **Live queue** | Visitors report Easy / Busy / Very crowded at a pandal. Reports show on the map, on the card and on the live page, and expire after 90 minutes. |
| **Pages** | Every pandal, by area, by metro station, by route, the guide, about, privacy and terms, contact, press. |
| **Offline** | A service worker keeps the app shell, the data and a saved route on the device. |

## Offline and location

The service worker caches the shell and the data, so a map you have already
opened and a route you have saved work with no signal. Tiles and real walking
routes come from the network and degrade gracefully when there is none — the
app falls back to straight-line × 1.28 estimates and says so.

Location is used only in your browser, for the **Near me** sort and for
directions. It is never sent to the server.

## Data and licence

The catalogue is built from the open dataset that
[pujomap.com publishes under ODbL](https://www.pujomap.com/data/LICENSE.txt) —
its pandal rows for Kolkata, which in turn come from OpenStreetMap — rebuilt
here with de-duplication, area groupings, estimated station positions and
generated walking routes. Full provenance, including what is derived and how,
is in [`data/README.md`](data/README.md) and
[`data/LICENSE.txt`](data/LICENSE.txt).

- **Data:** © OpenStreetMap contributors, ODbL 1.0. Served at `/data/` so
  anyone can take it onward.
- **Map tiles:** OpenFreeMap, OpenMapTiles.
- **Walking directions:** the public OSRM foot router run by FOSSGIS.
- **Application code:** MIT (see `LICENSE`).

This site is not affiliated with pujomap.com. Their dataset is reused under the
licence it is published with, with credit; their application code and design are
neither used nor copied.

## Before you deploy

1. Set your own address in `public/app.js` (`const CONTACT = ...`) — it is the
   only place a contact address appears.
2. **When you change `public/app.js` or `public/style.css`, bump the `?v=` on
   their URLs in `public/index.html`** (and in the `SHELL` list in
   `public/sw.js`). A visitor's already-installed service worker is
   cache-first, and a changed URL is the one request that always reaches the
   network. Skipping this is how a page ends up with new HTML and last week's
   script — which looks exactly like a broken site.
2. Queue reports are written to `data/crowd.json` on the server. That is fine for
   one instance; for more, point the four `/api/crowd*` handlers in `server.js`
   at a shared store.
4. Nothing else. There is no secret, no API key and no build.

## Layout

```
server.js                 static files, SPA routes, the crowd and plan API
scripts/build-data.mjs    raw rows -> the catalogue in data/
data/                     the catalogue, the source rows, the licence
public/index.html         the shell
public/app.js             map, list, card, plan, crowd, pages
public/style.css          all of the styling
public/sw.js              offline
public/vendor/            maplibre-gl, vendored so the app needs no CDN
```
