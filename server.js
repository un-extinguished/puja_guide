/**
 * Puja Guide server.
 *
 * Deliberately dependency-free apart from the static map library: no build
 * step, no framework. It serves the app, serves the open data, and runs the
 * four small API routes the app needs.
 *
 *   GET  /api/crowd?slug=...     recent queue reports for one pandal
 *   POST /api/crowd              add a queue report  {slug, level, note?}
 *   GET  /api/crowd/summary      latest report for every pandal
 *   GET  /api/stats              counts shown on the about page
 *   POST /api/plan               store a plan, returns a share id
 *   GET  /api/plan/:id           read a shared plan
 */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';

/* Crowd reports expire: a queue described two hours ago is not information. */
const CROWD_TTL_MS = 90 * 60 * 1000;
const CROWD_FILE = path.join(DATA, 'crowd.json');
const LEVELS = ['easy', 'busy', 'packed'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

/* --------------------------------------------------------------- storage */
let crowd = [];
try {
  crowd = JSON.parse(fs.readFileSync(CROWD_FILE, 'utf8'));
  if (!Array.isArray(crowd)) crowd = [];
} catch {
  crowd = [];
}
let plans = new Map();

let writing = false;
async function persistCrowd() {
  if (writing) return;
  writing = true;
  try {
    const live = crowd.filter((c) => Date.now() - c.at < CROWD_TTL_MS);
    crowd = live;
    await fsp.writeFile(CROWD_FILE, JSON.stringify(live));
  } catch (err) {
    console.error('crowd persist failed:', err.message);
  } finally {
    writing = false;
  }
}

const liveCrowd = () => crowd.filter((c) => Date.now() - c.at < CROWD_TTL_MS);

function latestBySlug() {
  const map = new Map();
  for (const c of liveCrowd()) map.set(c.slug, c);
  return map;
}

/* ----------------------------------------------------------------- utils */
const json = (res, code, body) => {
  const text = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text),
  });
  res.end(text);
};

async function readBody(req, limit = 8 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function sendFile(res, file) {
  try {
    const stat = await fsp.stat(file);
    if (stat.isDirectory()) return false;
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
    });
    fs.createReadStream(file).pipe(res);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ app */
const SPA_ROUTES = [
  /^\/$/,
  /^\/pandals\/?$/,
  /^\/p\/[^/]+\/?$/,
  /^\/area\/[^/]+\/?$/,
  /^\/metro\/?$/,
  /^\/metro\/[^/]+\/?$/,
  /^\/routes\/?$/,
  /^\/route\/[^/]+\/?$/,
  /^\/guide\/?$/,
  /^\/about\/?$/,
  /^\/legal\/?$/,
  /^\/contact\/?$/,
  /^\/press\/?$/,
  /^\/live\/?$/,
];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = decodeURIComponent(url.pathname);

  try {
    /* ---------------------------------------------------------- api */
    if (p === '/api/crowd' && req.method === 'GET') {
      const slug = url.searchParams.get('slug');
      const all = liveCrowd().filter((c) => !slug || c.slug === slug);
      return json(res, 200, { reports: all.slice(-200), levels: LEVELS, ttlMinutes: 90 });
    }

    if (p === '/api/crowd/summary' && req.method === 'GET') {
      const summary = {};
      for (const [slug, c] of latestBySlug()) {
        summary[slug] = { level: c.level, at: c.at, note: c.note || null, count: liveCrowd().filter((x) => x.slug === slug).length };
      }
      return json(res, 200, { summary, ttlMinutes: 90 });
    }

    if (p === '/api/crowd' && req.method === 'POST') {
      const body = await readBody(req);
      const slug = String(body.slug || '').trim();
      const level = String(body.level || '').trim();
      if (!slug || !LEVELS.includes(level)) {
        return json(res, 400, { error: 'slug and level (easy|busy|packed) are required' });
      }
      const note = body.note ? String(body.note).slice(0, 200) : null;
      /* one report per pandal per browser per 10 minutes */
      const key = req.headers['x-client'] || req.socket.remoteAddress || 'anon';
      const recent = liveCrowd().find((c) => c.slug === slug && c.key === key && Date.now() - c.at < 10 * 60 * 1000);
      if (recent) return json(res, 429, { error: 'You reported this pandal a few minutes ago.' });
      const report = { slug, level, note, at: Date.now(), key };
      crowd.push(report);
      persistCrowd();
      return json(res, 201, { ok: true, report });
    }

    if (p === '/api/plan' && req.method === 'POST') {
      const body = await readBody(req);
      const stops = Array.isArray(body.stops) ? body.stops.slice(0, 40).map(String) : [];
      if (stops.length < 2) return json(res, 400, { error: 'at least two stops' });
      const id = crypto.randomBytes(5).toString('hex');
      plans.set(id, { stops, name: String(body.name || '').slice(0, 80), at: Date.now() });
      if (plans.size > 500) plans = new Map([...plans].slice(-400));
      return json(res, 201, { id });
    }

    if (p.startsWith('/api/plan/') && req.method === 'GET') {
      const plan = plans.get(p.slice('/api/plan/'.length));
      if (!plan) return json(res, 404, { error: 'not found' });
      return json(res, 200, plan);
    }

    if (p === '/api/stats' && req.method === 'GET') {
      let meta = {};
      try { meta = JSON.parse(await fsp.readFile(path.join(DATA, 'meta.json'), 'utf8')); } catch {}
      return json(res, 200, {
        ...meta,
        liveReports: liveCrowd().length,
        sharedPlans: plans.size,
        uptimeSeconds: Math.round(process.uptime()),
      });
    }

    if (p.startsWith('/api/')) return json(res, 404, { error: 'no such endpoint' });

    /* ------------------------------------------------------- static */
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json(res, 405, { error: 'method not allowed' });
    }

    const rel = p.replace(/^\/+/, '');
    if (rel.startsWith('data/') || rel.startsWith('vendor/')) {
      const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
      if (await sendFile(res, path.join(PUBLIC, safe))) return;
      if (await sendFile(res, path.join(ROOT, safe))) return;
    }
    if (await sendFile(res, path.join(PUBLIC, rel || 'index.html'))) return;

    if (SPA_ROUTES.some((re) => re.test(p))) {
      if (await sendFile(res, path.join(PUBLIC, 'index.html'))) return;
    }

    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(
      '<!doctype html><meta charset="utf-8"><title>Not found — Puja Guide</title>' +
      '<style>body{font:16px/1.6 system-ui;margin:12vh auto;max-width:34rem;padding:0 1rem;color:#1d1d1f}</style>' +
      '<h1>Not found</h1><p>That page is not on this map. <a href="/">Back to the pandal map</a>.</p>'
    );
  } catch (err) {
    console.error(err);
    json(res, 500, { error: 'server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Puja Guide on http://${HOST}:${PORT}`);
});
