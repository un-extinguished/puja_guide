// Phase 5 pre-check: does the catalogue already hold any of the 15 "missing" VIP pujas under a similar name?
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'data', 'raw');

const keys = ['karbagan','hatibagan','sikdar','telipukur','chinar','aswini','masterda','kestopur',
  'prafull','attarpara','attapara','ec block','ecblock','db block','dbblock','sandhani','thakurpukur',
  'bidhan','lakepally','lake pally','nabin pally','state bank park','ultadanga','telengabagan','khudiram','nischinta'];

const files = fs.readdirSync(RAW).filter((f) => f.endsWith('.jsonl')).sort();
const all = [];
for (const f of files) {
  for (const l of fs.readFileSync(path.join(RAW, f), 'utf8').split('\n')) {
    if (!l.trim()) continue;
    const o = JSON.parse(l);
    o._src = f;
    all.push(o);
  }
}
console.log('RAW ROWS:', all.length);

for (const k of keys) {
  const m = all.filter((o) => {
    const blob = [o.n, o.s, o.h, o.k, o.b].filter(Boolean).join(' | ').toLowerCase();
    return blob.includes(k);
  });
  if (m.length) {
    console.log(`\n### ${k.toUpperCase()} (${m.length})`);
    for (const o of m) {
      console.log(`   ${o._src} n=${o.n} s=${o.s} h=${o.h} la=${o.la} lo=${o.lo} g=${o.g} k=${o.k || ''}`);
    }
  }
}

console.log('\n=== PANDALS.JSON — records matching any keyword ===');
const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pandals.json'), 'utf8'));
for (const p of Object.values(d)) {
  const blob = [p.name, p.nameBn, p.neighbourhood, p.nearStreet, p.alsoKnownAs].filter(Boolean).join('|').toLowerCase();
  if (keys.some((k) => blob.includes(k))) {
    console.log(`   ${p.slug} | ${p.name} | ${p.neighbourhood} | ${p.nearStreet} | ${p.lat},${p.lon} | vip=${!!p.isVIP} review=${!!p.vipReview}`);
  }
}