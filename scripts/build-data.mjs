/**
 * build-data.mjs — turn the transcribed upstream rows into the app's catalogue.
 *
 * Input : data/raw/chunk*.jsonl   (reconstructed from the ODbL dataset that
 *                                  pujomap.com publishes at /data/pandals.json)
 * Output: data/pandals.json, data/stations.json, data/routes.json, data/meta.json
 *
 * Everything derived here (areas, neighbourhoods where upstream is silent,
 * station positions, walking routes) is marked as derived in the output, so
 * the app can say which numbers it computed and which it was given.
 *
 * Run: node scripts/build-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'data', 'raw');
const OUT = path.join(ROOT, 'data');

/* ------------------------------------------------------------------ zones */
const ZONES = {
  I: { code: 'I', name: 'North & Central Kolkata' },
  II: { code: 'II', name: 'South & South East Kolkata' },
  III: { code: 'III', name: 'Port Area' },
  IV: { code: 'IV', name: 'South Suburban & South West (Jadavpur & Behala Division)' },
};

/* Bengali station names: 26 taken from the upstream /metro/ index, the rest
   read from the nearestMetro blocks of the dataset. */
const STATION_BN = {
  'Girish Park': 'গিরিশ পার্ক',
  'Rabindra Sarobar': 'রবীন্দ্র সরোবর',
  'Jatin Das Park': 'যতীন দাস পার্ক',
  Kalighat: 'কালীঘাট',
  Shyambazar: 'শ্যামবাজার',
  'Shobhabazar Sutanuti': 'শোভাবাজার সুতানুটি',
  'Netaji Bhavan': 'নেতাজি ভবন',
  'Central Park': 'সেন্ট্রাল পার্ক',
  'Behala Chowrasta': 'বেহালা চৌরাস্তা',
  Netaji: 'নেতাজি',
  Taratala: 'তারাতলা',
  'Behala Bazar': 'বেহালা বাজার',
  Sealdah: 'শিয়ালদহ মেট্রো স্টেশন',
  'Mahatma Gandhi Road': 'মহাত্মা গান্ধী রোড',
  'VIP Bazar': 'ভি আই পি বাজার',
  Majerhat: 'মাঝেরহাট',
  'Kavi Sukanta': 'কবি সুকান্ত',
  Belgachia: 'বেলগাছিয়া',
  'Sakher Bazar': 'সখের বাজার',
  'Satyajit Ray': 'সত্যজিৎ রায়',
  Karunamoyee: 'করুণাময়ী',
  'Salt Lake Sector V': 'সল্টলেক সেক্টর V',
  'Howrah Maidan': 'হাওড়া ময়দান',
  'Dum Dum': 'দমদম',
  'Masterda Surya Sen': 'মাস্টারদা সূর্য সেন',
  'City Centre': 'সিটি সেন্টার',
  Central: 'সেন্ট্রাল',
  Maidan: 'ময়দান',
  'Chandni Chowk': 'চাঁদনি চক',
  Phoolbagan: 'ফুলবাগান',
  'Bengal Chemical': 'বেঙ্গল কেমিক্যালস',
  'Rabindra Sadan': 'রবীন্দ্র সদন',
  'Jessore Road': 'যশোহর রোড',
  'Mahanayak Uttam Kumar': 'মহানায়ক উত্তমকুমার',
  'Kavi Nazrul': 'কবি নজরুল',
  'Jyotirindra Nandi': 'জ্যোতিরিন্দ্র নন্দী',
  'Hemanta Mukhopadhyay': 'হেমন্ত মুখোপাধ্যায়',
  Joka: 'জোকা',
};

/* ------------------------------------------------------------------ helpers */
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
const dist = (a, b) => {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const la1 = rad(a.lat);
  const la2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
/* Street distance is longer than the straight line. 1.28 is the usual
   Kolkata-grid correction; the app labels anything computed this way as an
   estimate and offers a real walking route on top. */
const WALK_FACTOR = 1.28;
const walkEstimate = (a, b) => Math.round(dist(a, b) * WALK_FACTOR);

const slugify = (s) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);

/* Only the generic festival words are dropped. Words like "sangha",
   "pally" and the pally numbers are kept, because "74 Pally" and
   "75 Pally" are different pujas on the same street. */
const norm = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(sarbojanin|sarbojonin|sarbajanin|sarbojanine|durgotsav|durgotsab|durgapuja|durgapujo|durga|puja|pujo)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/* every number in a name is significant: "Bhowanipore 76 Pally" is not
   "Bhowanipore 75 Pally" */
const numbers = (s) => (s.match(/\d+/g) || []).sort().join(',');

function dice(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  };
  const A = bigrams(a), B = bigrams(b);
  let inter = 0, total = 0;
  for (const [g, n] of A) { total += n; if (B.has(g)) inter += Math.min(n, B.get(g)); }
  for (const [, n] of B) total += n;
  return (2 * inter) / total;
}

/* ------------------------------------------------------------------ load */
const rows = [];
for (const f of fs.readdirSync(RAW).filter((f) => f.endsWith('.jsonl')).sort()) {
  const text = fs.readFileSync(path.join(RAW, f), 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const r = JSON.parse(t);
    if (typeof r.la !== 'number' || typeof r.lo !== 'number') continue;
    rows.push({ ...r, _src: f });
  }
}
console.log(`read ${rows.length} rows from data/raw`);

/* --------------------------------------------------------------- dedupe */
/* The upstream file carries a second pass of rows over ground already
   covered: "Trinayani" next to "Trinayanee", "Bhowanipore 76 Pally" next to
   "Agradut 76 Palli". Same puja, two spellings. We merge them, keeping the
   richer row, so a visitor does not see the same pandal twice. */
const richer = (a, b) => {
  const score = (r) =>
    (r.b ? 2 : 0) + (r.h ? 2 : 0) + (r.s ? 1 : 0) +
    (r.g === 'verified' ? 3 : r.g === 'osm' ? 2 : 1) +
    (r._src >= 'chunk11' ? -1 : 0); // later pass is usually poorer
  return score(a) >= score(b) ? a : b;
};

const kept = [];
let merged = 0;
for (const r of rows) {
  const nr = norm(r.n);
  const hit = kept.find((k) => {
    /* a row this project added is never a duplicate of an upstream row */
    if (r.g === 'community-report' || k.g === 'community-report') return false;
    const kr = norm(k.n);
    const d = dist({ lat: r.la, lon: r.lo }, { lat: k.la, lon: k.lo });
    const nrNum = numbers(r.n), krNum = numbers(k.n);
    if (nrNum && krNum && nrNum !== krNum) return false; // 74 Pally != 75 Pally
    if (d > 1500) return false;
    if (kr === nr) return d < 600;
    const sim = dice(kr, nr);
    return (sim >= 0.85 && d < 400) || (sim >= 0.7 && d < 120);
  });
  if (hit) {
    merged++;
    const win = richer(hit, r);
    const lose = win === hit ? r : hit;
    for (const key of ['b', 'k', 'f', 'h', 's', 'm', 'd', 'g']) {
      if (win[key] == null && lose[key] != null) win[key] = lose[key];
    }
    win.dupNames = [...new Set([...(win.dupNames || []), hit.n, r.n])];
    win.dupRows = (win.dupRows || 1) + 1;
  } else {
    kept.push({ ...r });
  }
}
console.log(`merged ${merged} duplicate rows -> ${kept.length} pandals`);

/* --------------------------------------------------- neighbourhood fill */
const named = kept.filter((p) => p.h);
for (const p of kept) {
  if (p.h) continue;
  let best = null, bd = 1200;
  for (const q of named) {
    const d = dist({ lat: p.la, lon: p.lo }, { lat: q.la, lon: q.lo });
    if (d < bd) { bd = d; best = q; }
  }
  if (best) { p.h = best.h; p.hInferred = true; }
}

/* ------------------------------------------------------------ area split */
function areaOf(p) {
  if (p.z === 'I') {
    return p.la >= 22.575
      ? { slug: 'north-kolkata', name: 'North Kolkata' }
      : { slug: 'central-kolkata', name: 'Central Kolkata' };
  }
  if (p.z === 'II') return { slug: 'south-kolkata', name: 'South & South East Kolkata' };
  if (p.z === 'III') return { slug: 'port-area', name: 'Khidderpore & the Port' };
  return { slug: 'south-west', name: 'Behala, Haridevpur & Jadavpur' };
}

/* ------------------------------------------------------------- assemble */
const usedSlugs = new Map();
const pandals = kept.map((p) => {
  const area = areaOf(p);
  let slug = slugify(p.n) || 'pandal';
  if (usedSlugs.has(slug)) {
    const n = usedSlugs.get(slug) + 1;
    usedSlugs.set(slug, n);
    slug = `${slug}-${n}`;
  } else usedSlugs.set(slug, 1);

  return {
    slug,
    name: p.n,
    nameBn: p.b || null,
    alsoKnownAs: p.k || null,
    formerName: p.f || null,
    zone: p.z,
    zoneName: ZONES[p.z] ? ZONES[p.z].name : null,
    area: area.slug,
    areaName: area.name,
    neighbourhood: p.h || null,
    neighbourhoodInferred: !!p.hInferred,
    nearStreet: p.s || null,
    lat: p.la,
    lon: p.lo,
    /* "geocodeMethod" is upstream's disclosure of how the pin was placed —
       otu, "osm" means it matches a surveyed place; "geocoded",
       "neighbourhood-anchor" and "street-snapped" mean it is approximate. */
    source: p.g === 'community-report' ? 'community' : 'catalogue',
    position: {
      method: p.g,
      verified: p.g === 'verified',
      approximate: !['verified', 'osm'].includes(p.g),
      community: p.g === 'community-report',
    },
    /* a row added from a visitor report carries no published walk, so it is
       left empty here and filled in below from the solved station positions */
    nearestMetro: p.g === 'community-report' ? null : {
      name: p.m,
      nameBn: STATION_BN[p.m] || null,
      walkMeters: p.d,
    },
    aliases: p.dupNames ? [...new Set(p.dupNames.filter((n) => n !== p.n))] : [],
  };
});

/* ------------------------------------------------- published station coordinates
   The pandal data never carried station positions, only the walk from a pandal
   to its nearest station. Solving for those positions from the walks gives a
   rough answer — good enough to say "this pandal is near that station", bad
   enough to draw a line through (one solve landed 5 km off, another put the
   Green Line's terminus the wrong side of the Hooghly). So the map uses
   published coordinates instead, and the solve is kept only as a fallback for
   stations nobody has published a position for.

   Source: Wikipedia's "List of Kolkata Metro stations" and the individual
   station articles, whose coordinates come from OpenStreetMap and Wikidata
   (CC BY-SA 4.0 / CC0), read 7 October 2026. Metro status as of 22 August 2025:
   Blue 26 stations, Green 12, Purple 7, Orange 9, Yellow 4. */
const STATION_COORDS = {
  'Dakshineswar': [22.653971, 88.363724],
  'Baranagar': [22.653529, 88.378873],
  'Noapara': [22.639722, 88.393889],
  'Dum Dum': [22.621111, 88.392778],
  'Dum Dum Cantonment': [22.638, 88.4123],
  'Belgachia': [22.605833, 88.386389],
  'Shyambazar': [22.601313, 88.372586],
  'Shobhabazar Sutanuti': [22.596029, 88.365285],
  'Girish Park': [22.587143, 88.363083],
  'Mahatma Gandhi Road': [22.580858, 88.361401],
  'Central': [22.57247, 88.358788],
  'Chandni Chowk': [22.566796, 88.354137],
  'Esplanade': [22.564444, 88.351667],
  'Park Street': [22.555, 88.350278],
  'Maidan': [22.549444, 88.348889],
  'Rabindra Sadan': [22.541389, 88.347222],
  'Netaji Bhavan': [22.533333, 88.346111],
  'Jatin Das Park': [22.524262, 88.346489],
  'Kalighat': [22.516652, 88.346003],
  'Rabindra Sarobar': [22.507222, 88.345556],
  'Mahanayak Uttam Kumar': [22.494722, 88.345],
  'Netaji': [22.480976, 88.346],
  'Masterda Surya Sen': [22.473521, 88.360871],
  'Gitanjali': [22.469426, 88.369985],
  'Kavi Nazrul': [22.46417, 88.38055],
  'Shahid Khudiram': [22.465972, 88.391667],
  'Kavi Subhash': [22.471944, 88.398056],
  'Howrah Maidan': [22.581998, 88.332994],
  'Howrah': [22.584454, 88.340578],
  'Mahakaran': [22.571189, 88.350106],
  'Sealdah': [22.567207, 88.371497],
  'Phoolbagan': [22.57214, 88.390282],
  'Salt Lake Stadium': [22.573056, 88.403056],
  'Bengal Chemical': [22.580076, 88.401283],
  'City Centre': [22.587069, 88.407875],
  'Central Park': [22.590437, 88.415605],
  'Karunamoyee': [22.586435, 88.421515],
  'Salt Lake Sector V': [22.581318, 88.429822],
  'Joka': [22.452244, 88.301751],
  'Thakurpukur': [22.464261, 88.307555],
  'Sakher Bazar': [22.474611, 88.309991],
  'Behala Chowrasta': [22.487529, 88.313426],
  'Behala Bazar': [22.498929, 88.317354],
  'Taratala': [22.508165, 88.320563],
  'Majerhat': [22.5191, 88.3234],
  'Satyajit Ray': [22.4846, 88.3926],
  'Jyotirindra Nandi': [22.495915, 88.398667],
  'Kavi Sukanta': [22.505262, 88.400996],
  'Hemanta Mukhopadhyay': [22.514777, 88.401469],
  'VIP Bazar': [22.5255, 88.39586],
  'Ritwik Ghatak': [22.5328605, 88.3957647],
  'Beleghata': [22.550703, 88.404094],
  'Jessore Road': [22.6395137, 88.4297765],
  'Jai Hind': [22.64619, 88.43591],
};

/* -------------------------------------------------------------- stations */
/* Upstream gives, per pandal, the walk to its nearest station — never the
   station's own coordinates. We solve for those: for each station, find the
   point whose straight-line distance to every pandal that names it is as
   close as possible to that pandal's published walk divided by the street
   factor. Positions are therefore estimates, and are labelled as such. */
function solveStation(pts) {
  let lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  let lon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
  let bestErr = Infinity, bestLat = lat, bestLon = lon;
  let step = 0.004;
  const err = (la, lo) =>
    pts.reduce((s, p) => {
      const d = dist({ lat: la, lon: lo }, { lat: p.lat, lon: p.lon });
      const target = p.walkMeters / WALK_FACTOR;
      return s + (d - target) ** 2;
    }, 0);
  for (let i = 0; i < 4000; i++) {
    const e = err(lat, lon);
    if (e < bestErr) { bestErr = e; bestLat = lat; bestLon = lon; }
    const g1 = err(lat + step, lon) - err(lat - step, lon);
    const g2 = err(lat, lon + step) - err(lat, lon - step);
    lat -= g1 * 0.6;
    lon -= g2 * 0.6;
    if (i % 400 === 399) step *= 0.6;
  }
  return { lat: bestLat, lon: bestLon, rms: Math.sqrt(bestErr / pts.length) };
}

/* only the pandals with a published walk can place a station */
const byStation = new Map();
for (const p of pandals) {
  if (!p.nearestMetro) continue;
  const k = p.nearestMetro.name;
  if (!byStation.has(k)) byStation.set(k, []);
  byStation.get(k).push(p);
}

const solvedStations = new Map();
for (const [name, list] of byStation) {
  const solved = solveStation(list.map((p) => ({ lat: p.lat, lon: p.lon, walkMeters: p.nearestMetro.walkMeters })));
  solvedStations.set(name, { lat: solved.lat, lon: solved.lon, rms: solved.rms });
}

/* where a station has a published position, that is the position. The solve is
   only for stations nobody has published one for. */
const stationPos = new Map();
for (const [name, solved] of solvedStations) {
  const pub = STATION_COORDS[name];
  stationPos.set(name, pub
    ? { lat: pub[0], lon: pub[1], source: 'published' }
    : { lat: solved.lat, lon: solved.lon, source: 'derived' });
}

/* the pandals added from visitor reports have no published walk: they take the
   nearest station position, and the walk is worked out from that. Marked
   estimated, because it is. */
let estimatedWalks = 0;
for (const p of pandals) {
  if (p.nearestMetro) continue;
  let best = null, bd = Infinity;
  for (const [name, pos] of stationPos) {
    const d = dist(p, pos);
    if (d < bd) { bd = d; best = name; }
  }
  p.nearestMetro = {
    name: best,
    nameBn: STATION_BN[best] || null,
    walkMeters: Math.round(bd * WALK_FACTOR),
    estimated: true,
  };
  byStation.get(best).push(p);
  estimatedWalks++;
}
console.log(`pandals without a published walk: ${estimatedWalks} (station and walk estimated from position)`);

/* How well a station's position agrees with the walks the dataset publishes to
   it. For a published position this is a check on the data, not on us: a big
   number means the published walk and the real station disagree. */
function walkResidual(pts, pos) {
  let sum = 0;
  for (const p of pts) {
    const d = dist(pos, { lat: p.lat, lon: p.lon });
    sum += (d - p.walkMeters / WALK_FACTOR) ** 2;
  }
  return Math.sqrt(sum / pts.length);
}

const stations = [...byStation.entries()].map(([name, list]) => {
  const pos = stationPos.get(name);
  const walks = list.map((p) => p.nearestMetro.walkMeters).sort((a, b) => a - b);
  const fit = list.some((p) => p.nearestMetro.estimated)
    ? null
    : Math.round(walkResidual(list.map((p) => ({ lat: p.lat, lon: p.lon, walkMeters: p.nearestMetro.walkMeters })), pos));
  return {
    slug: slugify(name),
    name,
    nameBn: STATION_BN[name] || null,
    lat: Number(pos.lat.toFixed(6)),
    lon: Number(pos.lon.toFixed(6)),
    positionSource: pos.source,
    fitMeters: fit,
    pandalCount: list.length,
    nearestWalkMeters: walks[0],
    pandals: list
      .slice()
      .sort((a, b) => a.nearestMetro.walkMeters - b.nearestMetro.walkMeters)
      .map((p) => ({ slug: p.slug, walkMeters: p.nearestMetro.walkMeters, estimated: !!p.nearestMetro.estimated })),
  };
}).sort((a, b) => b.pandalCount - a.pandalCount || a.name.localeCompare(b.name));

const fits = stations.map((s) => s.fitMeters).filter((x) => x != null).sort((a, b) => a - b);
const derived = stations.filter((s) => s.positionSource === 'derived').length;
console.log(`stations: ${stations.length} (${derived} with no published position), median walk residual ${fits[Math.floor(fits.length / 2)]} m`);

/* ----------------------------------------------------------- metro lines */
/* The alignment is approximate and the app says so. It is traced through
   station positions: where a station is one of those solved above from
   published walks, the line runs through the same pin the map draws;
   everywhere else it uses a published station location, good to a hundred
   metres or so. Nothing here is a surveyed alignment, and nothing here should
   be read as one. A line on a map reads as a survey, so it is said plainly in
   the legend, on the metro pages and in data/README.md. */
/* The lines as they run today, station by station, from the same source as the
   coordinates above. 58 stations, five lines: Blue 26, Green 12, Purple 7,
   Orange 9, Yellow 4. Esplanade is counted once but carries Blue and Green,
   Noapara carries Blue and Yellow, Kavi Subhash carries Blue and Orange.
   Barun Sengupta is left out of the drawing: the published table gives it a
   longitude that puts it 6 km from both its neighbours, so the line is drawn
   as a straight run past it rather than through a coordinate we do not trust. */
const NO_TRUSTWORTHY_POSITION = new Set(['Barun Sengupta']);

const METRO_LINES = [
  { slug: 'blue', name: 'Blue Line', nameBn: 'নীল লাইন', colour: '#1f5fa8',
    route: 'Dakshineswar – Kavi Subhash', stations: [
    'Dakshineswar', 'Baranagar', 'Noapara', 'Dum Dum', 'Belgachia', 'Shyambazar',
    'Shobhabazar Sutanuti', 'Girish Park', 'Mahatma Gandhi Road', 'Central',
    'Chandni Chowk', 'Esplanade', 'Park Street', 'Maidan', 'Rabindra Sadan',
    'Netaji Bhavan', 'Jatin Das Park', 'Kalighat', 'Rabindra Sarobar',
    'Mahanayak Uttam Kumar', 'Netaji', 'Masterda Surya Sen', 'Gitanjali',
    'Kavi Nazrul', 'Shahid Khudiram', 'Kavi Subhash',
  ] },
  { slug: 'green', name: 'Green Line', nameBn: 'সবুজ লাইন', colour: '#1f8a4c',
    route: 'Howrah Maidan – Salt Lake Sector V', stations: [
    'Howrah Maidan', 'Howrah', 'Mahakaran', 'Esplanade', 'Sealdah', 'Phoolbagan',
    'Salt Lake Stadium', 'Bengal Chemical', 'City Centre', 'Central Park',
    'Karunamoyee', 'Salt Lake Sector V',
  ] },
  { slug: 'purple', name: 'Purple Line', nameBn: 'বেগুনি লাইন', colour: '#7b3fa0',
    route: 'Joka – Majerhat', stations: [
    'Joka', 'Thakurpukur', 'Sakher Bazar', 'Behala Chowrasta', 'Behala Bazar',
    'Taratala', 'Majerhat',
  ] },
  { slug: 'orange', name: 'Orange Line', nameBn: 'কমলা লাইন', colour: '#d2691e',
    route: 'Kavi Subhash – Beleghata', stations: [
    'Kavi Subhash', 'Satyajit Ray', 'Jyotirindra Nandi', 'Kavi Sukanta',
    'Hemanta Mukhopadhyay', 'VIP Bazar', 'Ritwik Ghatak', 'Barun Sengupta',
    'Beleghata',
  ] },
  { slug: 'yellow', name: 'Yellow Line', nameBn: 'হলুদ লাইন', colour: '#c9a227',
    route: 'Noapara – Jai Hind (Airport)', stations: [
    'Noapara', 'Dum Dum Cantonment', 'Jessore Road', 'Jai Hind',
  ] },
];

const lines = METRO_LINES.map((l) => {
  const coordinates = [];
  const stationList = l.stations.map((name) => {
    const pos = STATION_COORDS[name];
    const known = pos && !NO_TRUSTWORTHY_POSITION.has(name);
    /* GeoJSON is [lon, lat]. Getting this backwards puts the metro in the sea. */
    if (known) coordinates.push([pos[1], pos[0]]);
    return {
      name,
      nameBn: STATION_BN[name] || null,
      lon: known ? pos[1] : null,
      lat: known ? pos[0] : null,
      mapped: !!known,
    };
  });
  const notMapped = stationList.filter((x) => !x.mapped).map((x) => x.name);
  return {
    slug: l.slug, name: l.name, nameBn: l.nameBn, colour: l.colour, route: l.route,
    approximate: true,
    source: 'Wikipedia "List of Kolkata Metro stations", 22 August 2025 status',
    note: 'Alignment drawn through published station coordinates, not surveyed.',
    stationCount: stationList.length,
    stations: stationList,
    stationsNotDrawn: notMapped,
    coordinates,
  };
});
console.log(`metro lines: ${lines.length} (${lines.map((l) => l.name.split(' ')[0]).join(', ')})`);

/* --------------------------------------------------------- photographs */
/* Photographs are other people's work, held in data/photos.json with the
   licence they were published under. Where a photograph carries GPS
   coordinates, they are measured against our pin here: a photograph taken
   within a few metres of a pin is evidence about that pin, and one taken a
   kilometre away is evidence of something else. The distance travels with the
   record so the app can print it. */
let photos = { photos: {}, rejected: [] };
try { photos = JSON.parse(fs.readFileSync(path.join(OUT, 'photos.json'), 'utf8')); } catch {}
let photoCount = 0;
for (const [slug, ph] of Object.entries(photos.photos || {})) {
  const p = pandals.find((x) => x.slug === slug);
  if (!p) { console.warn(`  photograph for unknown pandal: ${slug}`); continue; }
  let fromPinMeters = null;
  if (Array.isArray(ph.gps) && ph.gps.length === 2) {
    fromPinMeters = Math.round(dist(p, { lat: ph.gps[0], lon: ph.gps[1] }));
  }
  p.photo = {
    file: ph.file, artist: ph.artist, licence: ph.licence, licenceUrl: ph.licenceUrl, year: ph.year,
    page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(ph.file.replace(/ /g, '_'))}`,
    thumb: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(ph.file.replace(/ /g, '_'))}?width=900`,
    fromPinMeters,
    corroborates: fromPinMeters == null ? null : fromPinMeters <= 500,
  };
  photoCount++;
}
console.log(`photographs: ${photoCount} attached, ${(photos.rejected || []).length} rejected`);

/* ---------------------------------------------------------------- routes */
/* A route is an evening that works: stand at a well-known puja, take the
   stops nearest it, then order them so each leg is as short as it can be.
   Built from the coordinates, so it stays true when the data changes — the
   app makes no claim about which puja is "best", only about what is near
   what. Every distance here is straight-line x 1.28 and is labelled an
   estimate in the app; tap a stop for a real walking route. */
const ROUTE_SEEDS = [
  'bagbazar-sarbojanin', 'chalta-bagan', 'md-ali-park', 'maddox-square',
  'deshapriya-park', 'chetla-agrani', '41-pally', 'dum-dum-park-tarun-sangha',
  'tala-prattoy', 'bd-block-durga-puja', 'sreebhumi-sporting-club',
  'college-square', 'santosh-mitra-square', 'ekdalia-evergreen',
  'suruchi-sangha', 'tridhara-sammilani', 'alipore-sarbojanin',
  'barisha-sarbojanin', 'jodhpur-park', 'singhi-park-sarbojanin',
];
const ROUTE_SHAPE = { stops: 8, radius: 2600, maxLeg: 2600 };

const bySlug = new Map(pandals.map((p) => [p.slug, p]));
const routes = [];
for (const seedSlug of ROUTE_SEEDS) {
  const seed = bySlug.get(seedSlug);
  if (!seed) { console.warn(`  route seed missing: ${seedSlug}`); continue; }

  const near = pandals
    .filter((p) => p.slug !== seed.slug)
    .map((p) => ({ p, d: dist(seed, p) }))
    .filter((x) => x.d <= ROUTE_SHAPE.radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, ROUTE_SHAPE.stops - 1)
    .map((x) => x.p);
  if (near.length < 3) { console.warn(`  route too thin: ${seedSlug}`); continue; }

  // nearest-neighbour ordering from the seed
  const pool = near.slice();
  const stops = [seed];
  let cursor = seed;
  while (pool.length) {
    pool.sort((a, b) => dist(cursor, a) - dist(cursor, b));
    const next = pool.shift();
    if (dist(cursor, next) > ROUTE_SHAPE.maxLeg) break;
    stops.push(next);
    cursor = next;
  }

  const legs = [];
  for (let i = 1; i < stops.length; i++) {
    legs.push({
      from: stops[i - 1].slug,
      to: stops[i].slug,
      straightMeters: Math.round(dist(stops[i - 1], stops[i])),
      walkMeters: walkEstimate(stops[i - 1], stops[i]),
    });
  }
  const walkingTotal = legs.reduce((s, l) => s + l.walkMeters, 0);
  routes.push({
    slug: `${seed.slug}-and-nearby`,
    name: `Around ${seed.name}`,
    nameBn: seed.nameBn,
    area: seed.area,
    areaName: seed.areaName,
    stopCount: stops.length,
    walkingMeters: walkingTotal,
    /* ~13 min/km on Puja-night pavements, plus 5 minutes at each stop and
       25 minutes for the two queues most likely to form. An allowance. */
    minutesWithStops: Math.round((walkingTotal / 1000) * 13 + stops.length * 5 + 25),
    stops: stops.map((p) => p.slug),
    legs,
    seed: seed.slug,
    generated: true,
  });
}
console.log(`routes: ${routes.length}`);

/* ----------------------------------------------------------------- write */
const meta = {
  builtAt: new Date().toISOString(),
  pandalCount: pandals.length,
  communityCount: pandals.filter((p) => p.source === 'community').length,
  stationCount: stations.length,
  lineCount: lines.length,
  routeCount: routes.length,
  photoCount: photoCount,
  upstreamRows: rows.length,
  mergedRows: merged,
  source: 'Reconstructed from the ODbL dataset published at https://www.pujomap.com/data/pandals.json',
  licence: 'ODbL 1.0 — © OpenStreetMap contributors',
  derivedFields: [
    'slug',
    'area / areaName',
    'neighbourhoodInferred',
    'position.verified / position.approximate',
      'stations[].lat / lon (published coordinates; a fallback solve by multi-lateration only where none is published)',
    'routes[] (generated from coordinates; distances are estimates)',
    'lines[].coordinates (drawn through published station coordinates, not surveyed)',
    'photo.fromPinMeters / photo.corroborates (photograph GPS measured against our pin)',
    'nearestMetro.estimated (true where a pandal had no published walk)',
  ],
};

fs.writeFileSync(path.join(OUT, 'pandals.json'), JSON.stringify(pandals, null, 0) + '\n');
fs.writeFileSync(path.join(OUT, 'stations.json'), JSON.stringify(stations, null, 0) + '\n');
fs.writeFileSync(path.join(OUT, 'routes.json'), JSON.stringify(routes, null, 0) + '\n');
fs.writeFileSync(path.join(OUT, 'lines.json'), JSON.stringify(lines, null, 0) + '\n');
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');

const areas = [...new Set(pandals.map((p) => p.area))];
console.log('areas:', areas.join(', '));
console.log(`neighbourhoods: ${new Set(pandals.map((p) => p.neighbourhood).filter(Boolean)).size}`);
console.log('wrote data/pandals.json, stations.json, routes.json, meta.json');
