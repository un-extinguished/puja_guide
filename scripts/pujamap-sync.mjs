/**
 * pujamap-sync.mjs — Phase 2/3/4 analysis for the PujaHop-Kolkata ↔ pujamap.com
 * synchronisation.
 *
 *  1. Loads the live pujamap.com catalogue (data/ref/pujamap-catalogue.json,
 *     74 entries pulled by scripts/fetch-pujamap.mjs).
 *  2. Fuzzy-matches every entry against the 296 PujaHop pandals
 *     (data/pandals.json) using English + Bengali + locality similarity, then
 *     applies a small, documented set of manual overrides where the reference
 *     is garbled but the identity is certain (and manual downgrades where a
 *     generic name could be a different para).
 *  3. Writes data/ref/pujamap-matches.json (raw match table).
 *  4. Writes data/pujamap-sync-report.md  (Phase 2 comparison report).
 *  5. Writes data/vip-reconciliation-report.md (Phase 4: all 54 VIP names
 *     classified MATCHED / MATCHED — LOCATION NEEDS REVIEW / NOT FOUND).
 *
 * Run: node scripts/pujamap-sync.mjs
 *
 * No pandals.json rows are mutated by this script — its job is analysis and
 * reporting. Any curation decision is applied by hand afterwards.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const catalogue = read('data/ref/pujamap-catalogue.json');
const pandals = read('data/pandals.json');
const vipList = read('data/vip-list.json');

/* ------------------------------------------------------------------ */
/* normalisation / similarity helpers                                  */
/* ------------------------------------------------------------------ */

const EN_STOP = new Set(['club', 'committee', 'samity', 'samiti', 'sangha', 'songho',
  'sarbojanin', 'sarbojonin', 'sarbojanin-durgotsav', 'durgotsav', 'durgotsab',
  'durgostav', 'puja', 'the', 'of', 'and', 'durga', 'palli', 'pally', 'palli-club']);

function enTokens(s) {
  return (s || '').toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim().split(/\s+/)
    .filter(Boolean);
}

function denoise(tokens) {
  const keep = tokens.filter((t) => !EN_STOP.has(t));
  return keep.length ? keep : tokens;
}

function bigrams(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) out.push(tokens[i] + ' ' + (tokens[i + 1] || ''));
  return out;
}

function dice(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return (2 * inter) / (A.size + B.size);
}

function bnNorm(s) {
  return (s || '').replace(/[\s\u200c\u200d\u00b7.,\-()'"“”‘’]/g, '').toLowerCase();
}

function bnDice(a, b) {
  const x = bnNorm(a), y = bnNorm(b);
  if (!x.length || !y.length) return 0;
  if (x === y) return 1;
  const big = (s) => { const o = new Set(); for (let i = 0; i < s.length - 1; i++) o.add(s.slice(i, i + 2)); return o; };
  const X = big(x), Y = big(y);
  let inter = 0;
  for (const t of X) if (Y.has(t)) inter++;
  return (2 * inter) / (X.size + Y.size);
}

const toR = (a) => (a * Math.PI) / 180;
function distM(lat1, lon1, lat2, lon2) {
  const dLat = toR(lat2 - lat1), dLon = toR(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

/* ------------------------------------------------------------------ */
/* index the PujaHop catalogue                                          */
/* ------------------------------------------------------------------ */

const pandalIdx = pandals.map((p) => ({
  slug: p.slug,
  name: p.name,
  nameBn: p.nameBn,
  nearStreet: p.nearStreet || '',
  neighbourhood: p.neighbourhood || '',
  areaName: p.areaName || '',
  lat: p.lat,
  lon: p.lon,
  position: p.position || {},
  enSets: [p.name, p.alsoKnownAs, p.formerName].filter(Boolean)
    .map((n) => n.toLowerCase().trim())
    .map((n) => enTokens(n)),
  bn: bnNorm(p.nameBn),
  locTokens: enTokens(`${p.nearStreet || ''} ${p.neighbourhood || ''} ${p.areaName || ''} ${p.zoneName || ''}`),
}));

const bySlug = (slug) => pandalIdx.find((c) => c.slug === slug);

/* ------------------------------------------------------------------ */
/* confidence tiers                                                     */
/* ------------------------------------------------------------------ */

function tier(score, en, bn) {
  if (en >= 0.85) return 'high';                                   // near-exact English name
  if (score >= 0.75 && en >= 0.55) return 'high';                 // strong composite with name support
  if (score >= 0.55 && en >= 0.45) return 'medium';
  if (score >= 0.42) return 'low';
  return 'none';
}

function matchEntry(ref) {
  const refEn = enTokens(ref.name);
  const refEnClean = denoise([...refEn]);
  const refBn = bnNorm(ref.nameBn);
  const refLoc = new Set(enTokens(ref.address));
  let best = null;
  for (const c of pandalIdx) {
    const enRaw = Math.max(...c.enSets.map((s) => dice(bigrams(refEn), bigrams(s))));
    const enClean = Math.max(...c.enSets.map((s) => dice(bigrams(refEnClean), bigrams(denoise([...s])))));
    const en = Math.max(enRaw, enClean);
    const bn = c.bn ? bnDice(refBn, c.bn) : 0;
    const loc = c.locTokens.some((t) => refLoc.has(t)) ? 1 : 0;
    const score = 0.55 * en + 0.3 * bn + 0.15 * loc;
    if (!best || score > best.score) best = { slug: c.slug, name: c.name, score, en, bn, loc };
  }
  const cand = bySlug(best.slug);
  return {
    slug: best.slug,
    name: best.name,
    score: best.score,
    en: best.en,
    bn: best.bn,
    loc: best.loc,
    distanceToPujamapM: Math.round(distM(ref.lat, ref.lng, cand.lat, cand.lon)),
    confidence: tier(best.score, best.en, best.bn),
    note: null,
  };
}

const rawMatches = catalogue.pandals.map((p) => ({
  id: p.id,
  refName: p.name,
  refNameBn: p.nameBn,
  refArea: p.area,
  refAddress: p.address,
  refLat: p.lat,
  refLng: p.lng,
  ...matchEntry(p),
}));

/* ------------------------------------------------------------------ */
/* manual overrides (documented identity decisions)                     */
/* ------------------------------------------------------------------ */

const MANUAL = {
  60: { slug: 'beleghata-33-pally', confidence: 'medium', note: 'Reference garbled: EN says "Belghoria" but the Bengali reads বেলঘাটা ৩৩ পল্লী — the same numbered "Beleghata 33 Pally".' },
  47: { slug: 'simla-bayam-samiti', confidence: 'medium', note: 'Byam/Bayam transliteration variant of Simla Bayam Samiti (same Jorasanko locality).' },
  23: { slug: 'naktala-udayan-sangha', confidence: 'medium', note: 'Udayan Palli/Sangha variant of the same Naktala para (locality matches).' },
  74: { slug: 'jagat-mukherjee-park-sadharan-durgotsab', confidence: 'medium', note: 'Identity match; pin confirmed in Phase 5 — the famous pandal is at 1 Jatindra Mohan Avenue, Bagbazar (est. 1936) and the OSM anchor is correct (the earlier Harish Mukherjee Road reading was rescinded).' },
};
const DOWNGRADE = {
  14: { confidence: 'low', note: '"22 Palli" is a very common name; the reference says Dhakuria 22 Palli while this PujaHop record is a generic "22 Palli" (Elgin Road) — identity of the specific para is unconfirmed.' },
  15: { confidence: 'low', note: '"23 Palli" is a common name; reference Dhakuria 23 Palli vs generic "23 Palli" (Hazra) — identity of the specific para is unconfirmed.' },
  54: { confidence: 'low', note: '"Lal Bazar" and "Ramlal Bazar" are different markets; match is token-based only, not identity.' },
  69: { confidence: 'low', note: '"More Bazar" and "Ramlal Bazar" are different markets; match is token-based only, not identity.' },
  39: { confidence: 'low', note: 'Same Behala locality, but "Shibtala Sarbojanin" and "Barisha Sarbojanin" are distinct committee names — token+locality overlap only.' },
};

const matched = rawMatches.map((m) => {
  const over = MANUAL[m.id];
  if (over) {
    const c = bySlug(over.slug);
    if (!c) return m;
    return { ...m, slug: c.slug, name: c.name, confidence: over.confidence, note: over.note, distanceToPujamapM: Math.round(distM(m.refLat, m.refLng, c.lat, c.lon)) };
  }
  const down = DOWNGRADE[m.id];
  if (down && (m.confidence === 'high' || m.confidence === 'medium')) {
    return { ...m, confidence: down.confidence, note: down.note };
  }
  return m;
});

/* ------------------------------------------------------------------ */
/* VIP reconciliation (Phase 4)                                         */
/* ------------------------------------------------------------------ */

function pinReliable(record) {
  if (!record) return false;
  const m = record.position?.method;
  return record.position?.verified === true || record.position?.verified === 1 || m === 'osm' || m === 'verified';
}

const bySlugInPandals = (slug) => pandals.find((p) => p.slug === slug);
const pujamapById = (id) => catalogue.pandals.find((p) => p.id === id) || null;

const OVERRIDE = {
  1:  { cls: 'MATCHED', ref: 35, reason: 'pujamap.com lists "Behala Club" (Behala). PujaHop `behala-club` is the same committee (OSM-anchored pin).' },
  9:  { cls: 'MATCHED', ref: 23, reason: 'pujamap.com "Naktala Udayan Palli" = Naktala Udayan Sangha (same para; PujaHop pin is OSM-anchored).' },
  14: { cls: 'MATCHED', ref: 2, reason: 'pujamap.com "Bosepukur Sitala Mandir" = Bose Pukur Sitala Mandir (PujaHop pin is OSM-anchored near the Bose Pukur crossing, Kasba).' },
  15: { cls: 'MATCHED', ref: 6, reason: 'pujamap.com "Hindusthan Park" = Hindustan Park Sarbojonin (PujaHop pin is OSM-anchored).' },
  17: { cls: 'MATCHED', ref: 19, reason: 'Phase 5 resolution: the VIP Shibmandir is the Lake Terrace (near Lake Market) puja; pin corrected to the thepujo.com published position (22.5107, 88.3525). pujamap.com\'s "Shib Mandir Palli" (Golpark) is name-adjacent only.' },
  20: { cls: 'MATCHED', ref: 4, reason: 'pujamap.com "Badamtala Ashar Sangha" (Kalighat) = Badamtala Ashar Sangha (PujaHop pin is OSM-anchored).' },
  26: { cls: 'MATCHED — LOCATION NEEDS REVIEW', ref: 60, reason: 'Phase 5: pin corrected to the thepujo.com pandal-level position (22.566563, 88.393852); still graded review because the pin is not OSM/verified — the final step is a ground check.' },
  38: { cls: 'MATCHED — LOCATION NEEDS REVIEW', ref: 45, reason: 'Phase 5 resolution: `kumartuli-park` (66B Rabindra Sarani, 22.5994, 88.3613) is a distinct puja from Kumartuli Sarbojanin; the pin is corroborated by the thepujo.com directory and durgapujopandals.com. The VIP entry now maps to this record, not to `kumartuli-sarbojanin`. Still graded review because the pin is a published-guide approximation, not an OSM survey.' },
  39: { cls: 'MATCHED', ref: 46, reason: 'pujamap.com lists "Ahiritola Sarbojanin" (its only Ahiritola entry) — corroborates the Ahiritola Sarbojanin Samity identity; PujaHop pin is OSM-anchored at Ahiritola.' },
  41: { cls: 'MATCHED', ref: 74, reason: 'Phase 5 resolution: the famous Jagat Mukherjee Park pandal is at 1 Jatindra Mohan Avenue, Bagbazar (est. 1936); the record\'s OSM "Jagat Mukherjee Park" anchor (22.5997, 88.3662) is correct. The earlier Harish Mukherjee Road (Bhowanipore) reading was incorrect.' },
  3:  { cls: 'NOT FOUND', ref: 36, reason: 'pujamap.com lists only "Thakurpukur Boro Mandap" (a different mandap), so this name is not on pujamap.com. Phase 5 added `thakurpukur-state-bank-park-sarbojanin` (50 State Bank Park, Diamond Harbour Rd) from committee and guide sources; its approximate pin keeps the review flag.' },
  40: { cls: 'MATCHED', ref: 46, reason: 'Phase 5, confirmed with the owner: "Sarodotsob" is the same committee as #39 "Ahiritola Sarbojanin Samity" — Samity / Sarodotsob Samity are suffix variants, and both entries now map to `ahiritola`. pujamap.com\'s single "Ahiritola Sarbojanin" corroborates the shared identity. `ahiritola-20-pally` stays in the catalogue but is not a VIP stop.' },
  50: { cls: 'NOT FOUND', ref: 73, reason: 'pujamap.com lists "Dum Dum Park Tarun Sangha" — a different association with its own record — so Dum Dum Tarun Dal is not on pujamap.com. Phase 5 moved the record to the thepujo.com published Dum Dum Park position (22.61173, 88.41874); the review flag is kept for a ground check.' },
};

function classifyVip(entry, number) {
  const record = entry.slug ? bySlugInPandals(entry.slug) : null;
  const o = OVERRIDE[number];
  if (o) {
    const ref = pujamapById(o.ref);
    return {
      classification: o.cls,
      pujamapRef: ref ? `${ref.name} (id ${ref.id}, ${ref.area})` : null,
      note: o.reason,
    };
  }
  if (entry.status === 'missing') {
    return { classification: 'NOT FOUND', note: 'No PujaHop record exists yet for this name (Phase 5 will research it).' };
  }
  // generic fallback
  const m = matched.find((x) => x.slug === entry.slug) || matched.find((x) => x.refName === record?.name);
  const hasPm = m && (m.confidence === 'high' || (m.confidence === 'medium' && m.en >= 0.5));
  if (hasPm) {
    return {
      classification: pinReliable(record) ? 'MATCHED' : 'MATCHED — LOCATION NEEDS REVIEW',
      pujamapRef: `${m.refName} (id ${m.id}, ${m.refArea})`,
      note: `Fuzzy match "${m.refName}" (${m.confidence}). ${pinReliable(record) ? 'PujaHop pin is OSM/verified-anchored.' : 'PujaHop pin is unverified — location needs a check.'}`,
    };
  }
  return {
    classification: 'NOT FOUND',
    note: `No confident pujamap.com match.${m ? ` Closest candidate: "${m.refName}" (score ${m.score.toFixed(2)}, ${m.confidence}).` : ''}`,
  };
}

const allVip = [...vipList.south.map((e) => ({ ...e, side: 'south' })), ...vipList.north.map((e) => ({ ...e, side: 'north' }))];
const vipRows = allVip.map((e, i) => ({ number: i + 1, name: e.name, side: e.side, slug: e.slug, status: e.status, ...classifyVip(e, i + 1) }));

const catCount = { 'MATCHED': 0, 'MATCHED — LOCATION NEEDS REVIEW': 0, 'NOT FOUND': 0 };
vipRows.forEach((r) => { catCount[r.classification] = (catCount[r.classification] || 0) + 1; });

/* ------------------------------------------------------------------ */
/* write matches json                                                   */
/* ------------------------------------------------------------------ */

fs.mkdirSync(path.join(ROOT, 'data', 'ref'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'data', 'ref', 'pujamap-matches.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), catalogueCount: catalogue.count, matches: matched }, null, 2) + '\n',
);

/* ------------------------------------------------------------------ */
/* Phase 2 report (data/pujamap-sync-report.md)                        */
/* ------------------------------------------------------------------ */

const counts = {
  total: matched.length,
  high: matched.filter((m) => m.confidence === 'high').length,
  medium: matched.filter((m) => m.confidence === 'medium').length,
  low: matched.filter((m) => m.confidence === 'low').length,
  none: matched.filter((m) => m.confidence === 'none').length,
};
const identified = counts.high + counts.medium;

const md = [];
md.push('# PujaHop Kolkata ↔ pujamap.com synchronisation report (Phase 2)');
md.push('');
md.push(`Generated ${new Date().toISOString()}. Source: https://pujamap.com/puja-pandel-list/ retrieved live via the WordPress REST API (page 239, embedded HTML widget) → data/ref/pujamap-catalogue.json.`);
md.push('');
md.push('## 1. What the reference site actually exposes');
md.push('');
md.push('pujamap.com is a small WordPress brochure site. Its only public pandal catalogue is one hard-coded ');
md.push(`widget on the "Puja Pandel List" page containing **${counts.total} entries (42 South, 32 North)** — no per-pandal detail pages, no APIs, no surveyed map pins. Each entry is a name, a single locality word (used as "address"), and a 4-decimal coordinate pair.`);
md.push('');
md.push('**Coordinate quality is not usable for correction.** The coordinates are arithmetic placeholders, not survey fixes: e.g. the Dhakuria series runs 22.5380/88.3600 → 22.5440/88.3690 in exact 0.002–0.003° steps, the south tail steps a uniform 0.005° in latitude, and some entries share identical coordinates (Jodhpur Park and Deshapriya Park both 22.5250/88.3450). Four decimals would imply ~100 m precision the data cannot deliver. Per the project rule "do not copy rounded or inaccurate coordinates blindly", **no PujaHop pin was changed to match these values.**');
md.push('');
md.push('Several names on the reference are garbled ("Belghoria 33 Palli" whose own Bengali reads বেলঘাটা, "Ultodanga", "Kakurgachhi", "Rajar bag", "Nandan vicinity Mim Paltel", "Chandni Chowk Mahindra Mall"…), so identity was matched with English + Bengali + locality evidence and **no PujaHop name was overwritten with a worse spelling.**');
md.push('');
md.push('## 2. Summary');
md.push('');
md.push(`| Item | Value |`);
md.push(`| --- | --- |`);
md.push(`| Records retrieved from pujamap.com | ${counts.total} (42 S / 32 N) |`);
md.push(`| Identity matched to existing PujaHop records (high + medium) | ${identified} (high ${counts.high}, medium ${counts.medium}) |`);
md.push(`| Weak signal (low — corroboration only, not relied on) | ${counts.low} |`);
md.push(`| No reliable counterpart (flagged, not added) | ${counts.none} |`);
md.push(`| Names corrected in PujaHop | 0 (reference spellings are lower quality than existing data) |`);
md.push(`| Coordinates corrected in PujaHop | 0 (reference coordinates are synthetic placeholders) |`);
md.push(`| New records added from pujamap.com | 0 (no unmatched entry has a verifiable precise location) |`);
md.push(`| New duplicate pairs consolidated | 0 (existing build-time folds unaffected) |`);
md.push('');
md.push(`The PujaHop catalogue (${pandals.length} pandals) is a superset of the reference catalogue. Every pujamap.com entry with a confident identity already has a PujaHop record; none needed relocation and none needed renaming. Entries without a confident match are mostly obscure or garbled names whose reference coordinates are synthetic — **none were added**, matching the "flag rather than fabricate" rule. This report is therefore the synchronisation audit: what exists, what was corroborated, and what is still unverifiable from this source.`);
md.push('');
md.push('## 3. Match table (all 74)');
md.push('');
md.push('confidence: **high/medium** = identity corroborated; **low** = weak signal (corroboration only); **none** = no reliable counterpart.');
md.push('');
md.push('| # | pujamap.com name | pujamap locality | PujaHop record | confidence | dist (m) | note / action |');
md.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const m of matched) {
  const dist = m.confidence === 'none' ? '—' : `${m.distanceToPujamapM} m`;
  const action = m.confidence === 'high' || m.confidence === 'medium'
    ? 'exists; identity corroborated — coords kept (reference too coarse)'
    : m.confidence === 'low'
      ? 'weak signal — not relied on'
      : 'no reliable counterpart — not added';
  md.push(`| ${m.id} | ${m.refName} | ${m.refAddress} | ${m.name} (\`${m.slug}\`) | ${m.confidence} | ${dist} | ${m.note ? m.note + ' ' : ''}${action} |`);
}
md.push('');
md.push('## 4. Reference entries with no reliable counterpart (flagged, not added)');
md.push('');
const noneList = matched.filter((m) => m.confidence === 'none');
for (const m of noneList) {
  md.push(`- **${m.refName}** (id ${m.id}, ${m.refArea}, ${m.refAddress}) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate ${m.refLat},${m.refLng} is a synthetic placeholder, so a record cannot be added from this source alone.`);
}
md.push('');
md.push('## 5. PujaHop records not present on pujamap.com (kept, not removed)');
md.push('');
md.push(`Absence from the 74-entry reference catalogue is **not** grounds for removal — the PujaHop catalogue (${pandals.length} pandals from a longer provenance) intentionally keeps records outside the reference. ${pandals.length - identified} of ${pandals.length} PujaHop records have no confident counterpart on pujamap.com; representative examples by zone:`);
md.push('');
const zones = {};
for (const p of pandals) (zones[p.zoneName] = zones[p.zoneName] || []).push(p);
for (const [zone, list] of Object.entries(zones)) {
  md.push(`- **${zone}** (${list.length} records; e.g. ${list.slice(0, 5).map((p) => p.name).join(', ')}${list.length > 5 ? ', …' : ''})`);
}
md.push('');
md.push('## 6. Notable observations for the review pile');
md.push('');
md.push('- **Ahiritola:** the reference holds exactly one "Ahiritola Sarbojanin". Confirmed with the owner in Phase 5: the two VIP entries "Ahiritola Sarbojanin Samity" and "Ahiritola Sarbojanin Sarodotsob" are the same committee — both map to `ahiritola`. Our third record `ahiritola-20-pally` stays as-is but is not a VIP stop.');
md.push('- **Dum Dum names:** the reference "Dum Dum Park Tarun Sangha" matches our **separate** record `dum-dum-park-tarun-sangha` (verified pin). It is NOT Dum Dum Tarun Dal, Yubak Brinda, Bharat Chakra or Park Sarbojanin. Phase 5 moved `dum-dum-tarun-dal` to thepujo.com\'s published Dum Dum Park pin; the review flag stays for a ground check.');
md.push('- **Jagat Mukherjee Park:** pin confirmed in Phase 5. The famous pandal is at 1 Jatindra Mohan Avenue, Bagbazar (est. 1936); the record\'s OSM "Jagat Mukherjee Park" anchor (22.5997, 88.3662) is correct. The earlier Harish Mukherjee Road reading was wrong.');
md.push('- **Beleghata 33 Pally:** identity with the reference "Belghoria 33 Palli" is certain (Bengali says বেলঘাটা). Phase 5 corrected the pin to thepujo.com\'s pandal-level position (22.566563, 88.393852); only a ground check remains.');
md.push('- **In-catalogue duplicate review (Phase 5):** `bose-pukur` (area-anchor, Kasba) and `bosepukur-sitala-mandir` (OSM) were compared — they were judged to be a locality row and the committee, not a true duplicate, so both stay. The bare "Samaj Sebi Sangha" record, however, WAS a true duplicate of `samajsebi` (same Lake View Road club) and was folded into it.');
md.push('- **DB Block (Newtown) vs BD Block (Salt Lake):** kept separate; Phase 5 added a new `db-block-newtown` record (DB Block, Action Area I, New Town) so the VIP name now has its own record.');
md.push('- **Shibmandir:** Phase 5 corrected the pin to thepujo.com\'s Lake Terrace (near Lake Market) position (22.5107, 88.3525); the reference "Shib Mandir Palli" at Golpark is name-adjacent only.');
md.push('');
md.push('## 7. What would be needed to finish synchronisation');
md.push('');
md.push('- For the 25 identity matches (18 high, 7 medium): nothing further — identity is corroborated and existing pins are more precise than the reference.');
md.push('- For the flagged entries (low/none): the Phase 5 research pass sourced committee pages, guide pans and published Plus Codes for the previously-missing VIP names — full evidence in data/phase5-research.md. No pin was copied from pujamap.com (its coordinates remain untrusted).');
md.push('');

fs.writeFileSync(path.join(ROOT, 'data', 'pujamap-sync-report.md'), md.join('\n'));

/* ------------------------------------------------------------------ */
/* Phase 4 report (data/vip-reconciliation-report.md)                  */
/* ------------------------------------------------------------------ */

const pinState = (slug) => {
  const r = bySlugInPandals(slug);
  if (!r) return 'no record';
  const m = r.position?.method;
  const reliable = pinReliable(r);
  return `${reliable ? 'verified/OSM-anchored' : 'unverified'} (${m})`;
};

const rm = [];
rm.push('# VIP list (54) reconciliation against pujamap.com (Phase 4)');
rm.push('');
rm.push(`Generated ${new Date().toISOString()}. The 54 names are the owner's fixed VIP/pass list;`);
rm.push('data/vip-list.json is the source of truth for membership. For each name this report says whether');
rm.push('pujamap.com supports the identity and/or the physical location:');
rm.push('');
rm.push('- **MATCHED** — the pandal is listed on pujamap.com, the identity matches, and the PujaHop pin is verified/OSM-anchored.');
rm.push('- **MATCHED — LOCATION NEEDS REVIEW** — the pandal (or a name-similar entry) is listed on pujamap.com, but the physical location is not yet verified.');
rm.push('- **NOT FOUND** — pujamap.com does not reliably list it (missing, different pandal, or identity unconfirmable).');
rm.push('');
rm.push(`Summary: **${catCount['MATCHED']} MATCHED**, **${catCount['MATCHED — LOCATION NEEDS REVIEW']} MATCHED — LOCATION NEEDS REVIEW**, **${catCount['NOT FOUND']} NOT FOUND** (of 54).`);
rm.push('');
rm.push('The reference catalogue is small (74 entries) and covers only ~10 of the 54 VIP names. NOT FOUND here means "not on pujamap.com", not "does not exist".');
rm.push('');
rm.push('## Full classification');
rm.push('');
rm.push('### South Kolkata (1–24)');
rm.push('');
rm.push('| # | VIP name | PujaHop record | pin state | pujamap.com reference | classification |');
rm.push('| --- | --- | --- | --- | --- | --- |');
for (const r of vipRows.filter((x) => x.side === 'south')) {
  rm.push(`| ${r.number} | ${r.name} | ${r.slug ? `\`${r.slug}\`` : '— (no record)'} | ${r.slug ? pinState(r.slug) : '—'} | ${r.pujamapRef || '—'} | ${r.classification} |`);
}
rm.push('');
rm.push('### North Kolkata (25–54)');
rm.push('');
rm.push('| # | VIP name | PujaHop record | pin state | pujamap.com reference | classification |');
rm.push('| --- | --- | --- | --- | --- | --- |');
for (const r of vipRows.filter((x) => x.side === 'north')) {
  rm.push(`| ${r.number} | ${r.name} | ${r.slug ? `\`${r.slug}\`` : '— (no record)'} | ${r.slug ? pinState(r.slug) : '—'} | ${r.pujamapRef || '—'} | ${r.classification} |`);
}
rm.push('');
rm.push('## Notes per classification');
rm.push('');
rm.push('### MATCHED — the reference corroborates these, pin verified/anchor-backed');
rm.push('');
for (const r of vipRows.filter((x) => x.classification === 'MATCHED')) {
  rm.push(`- **#${r.number} ${r.name}** — ${r.note}`);
}
rm.push('');
rm.push('### MATCHED — LOCATION NEEDS REVIEW');
rm.push('');
for (const r of vipRows.filter((x) => x.classification === 'MATCHED — LOCATION NEEDS REVIEW')) {
  rm.push(`- **#${r.number} ${r.name}** — ${r.note}`);
}
rm.push('');
rm.push('## NOT FOUND entries — detail');
rm.push('');
rm.push('Each entry shows what was checked. Phase 5 research is complete for every name — see data/phase5-research.md.');
rm.push('');
for (const r of vipRows.filter((x) => x.classification === 'NOT FOUND')) {
  rm.push(`### #${r.number} ${r.name}`);
  rm.push('');
  rm.push(`- **PujaHop record:** ${r.slug ? `\`${r.slug}\` (${pinState(r.slug)})` : 'none yet (missing)'}`);
  rm.push(`- **pujamap.com reference:** ${r.pujamapRef || '—'}`);
  rm.push(`- **Why no match:** ${r.note || 'no pujamap.com entry for this name/para.'}`);
  const alt = altNamesFor(r.name);
  rm.push(`- **May be listed under a different name:** ${alt}`);
  rm.push(`- **Further information needed:** verified address and map coordinates from a committee page, OSM, or on-ground check.`);
  rm.push('');
}
rm.push('');
rm.push('## Notes on identity-sensitive pairs');
rm.push('');
rm.push('- **Ahiritola (two entries):** resolved in Phase 5. pujamap.com\'s single "Ahiritola Sarbojanin" is the whole story — the owner confirmed "Samity" (#39) and "Sarodotsob" (#40) are the same committee, so both entries map to `ahiritola`. `ahiritola-20-pally` is not a VIP stop.');
rm.push('- **Dum Dum cluster (#47–#50):** pujamap.com lists "Dum Dum Park Tarun Sangha", which matches the **separate** PujaHop record `dum-dum-park-tarun-sangha` — it is not any of the four VIP Dum Dum names. Dum Dum Tarun Dal (#50) was moved in Phase 5 to thepujo.com\'s published Dum Dum Park pin; its review flag stays for a ground check.');
rm.push('- **Shibmandir (#17):** resolved in Phase 5 — pin corrected to thepujo.com\'s Lake Terrace (near Lake Market) position (22.5107, 88.3525). pujamap.com\'s "Shib Mandir Palli" (Golpark) is name-adjacent only.');
rm.push('- **Kumartuli (#38):** `kumartuli-park` is confirmed as a distinct puja from Kumartuli Sarbojanin (66B Rabindra Sarani; pin corroborated by thepujo.com and durgapujopandals.com). The classification stays MATCHED — LOCATION NEEDS REVIEW only because the pin is a published-guide approximation rather than an OSM survey.');
rm.push('- **Jagat Mukherjee Park (#41):** resolved in Phase 5 — the famous pandal is at 1 Jatindra Mohan Avenue, Bagbazar (est. 1936) and the record\'s OSM anchor is correct; the earlier Harish Mukherjee Road reading was incorrect.');
rm.push('- **DB Block (Newtown) vs BD Block (Salt Lake):** kept separate; Phase 5 added the `db-block-newtown` record (Action Area I, New Town), so the VIP entry has its own catalogue record.');
rm.push('');

function altNamesFor(name) {
  const map = {
    Beniatola: 'pujamap.com lists "Shobhabazar Rajbari", a different pandal; Beniatola is a separate Sovabazar para. Check "Sovabazar Beniatola" variants.',
    Chaltabagan: 'check "Chalta Bagan", "Manicktala Chaltabagan".',
    'Sikdar Bagan': 'check "Shikdar Bagan" spellings.',
    Masterda: 'check "Masterda Surya Sen" variants.',
    Kestopur: 'check "Prafulla Kanan" spellings.',
    Telipukur: 'check "Telipukur Yuba Sangha".',
    Attarpara: 'check "Attrapara Unnayan Samity".',
    'Chinar Park': 'check "Adhibasi Brinda" spellings.',
    Aswininagar: 'check "Ashwininagar Bandhumahal".',
    'Hatibagan Nabin': 'pujamap.com lists only "Hatibagan Sarbojanin" — a different puja; Nabin Pally is a separate association.',
    'DB Block': 'New Town\'s DB Block is NOT the catalogue\'s BD Block (Salt Lake, Sector I).',
    Karbagan: 'check "Ultadanga Karbagan" spellings.',
    'Bidhan Sangha': 'check "Ultadanga Bidhan" variants.',
    Trikon: 'check "Tricon Park", "Pratapaditya Tricon", "Santoshpur Trikone".',
    Rajdanga: 'check "Naboday Sangha" spellings.',
    Lakepally: 'check "Lake Pally", "Santoshpur Lake Pally" spellings.',
    'Santosh Mitra': 'well-known pandal, but not on this reference; check "Santosh Mitra Square".',
    Ultadanga: 'reference lists only "Ultodanga Palli" — a different puja.',
    Behala: 'reference lists "Behala Club" (matched) and "Behala Nabapalli"; no Nutan Dal entry.',
    Ajeya: 'check "Ajeyo Sanghati" spellings.',
    'State Bank Park': 'pujamap.com lists "Thakurpukur Boro Mandap" (a different mandap); Phase 5 added the `thakurpukur-state-bank-park-sarbojanin` record from committee/guide sources.',
    Sarodotsob: 'Resolved in Phase 5: both Ahiritola entries are the same committee and both map to `ahiritola`; `ahiritola-20-pally` is not a VIP stop.',
    'Tarun Dal': 'pujamap.com lists "Dum Dum Park Tarun Sangha", which matches the separate record `dum-dum-park-tarun-sangha` (verified pin) — a different association; do not conflate. Phase 5 moved the pin to thepujo.com\'s Dum Dum Park position.',
    'Samajsebi': 'Phase 5: "Samaj Sebi Sangha" was folded into this record (Lake View Road pin); it is no longer a separate PujaHop record.',
    Mudiali: 'check "Mudiali Club" — famous but not on this reference.',
    "Chakraberia": 'check "Chakraberia Sarbojanin" — not on this reference.',
    Alipore: 'check "Alipore Sarbojanin" — not on this reference.',
    '25 Pally': 'reference has Dhakuria 22/23/61/66 Palli but no 25 Pally.',
    '41 Pally': 'reference has Dhakuria 22/23/61/66 Palli but no 41 Pally.',
  };
  for (const [k, v] of Object.entries(map)) if (name.includes(k)) return v;
  return 'pujamap.com has no entry for this para; check Bengali spellings and committee names.';
}
rm.push('');
rm.push('## Bottom line');
rm.push('');
rm.push(`Only ${catCount['MATCHED']} of the 54 VIP names are positively corroborated on pujamap.com, and ${catCount['MATCHED — LOCATION NEEDS REVIEW']} more are corroborated by name but still need a pin check. The other ${catCount['NOT FOUND']} are not on pujamap.com at all — Phase 5 researched and placed every one of them from other published sources (see data/phase5-research.md); the reference site is simply too small to cover them.`);
rm.push('');

fs.writeFileSync(path.join(ROOT, 'data', 'vip-reconciliation-report.md'), rm.join('\n'));

/* ------------------------------------------------------------------ */
/* console summary                                                      */
/* ------------------------------------------------------------------ */

console.log(`pujamap entries: ${counts.total}  →  high ${counts.high} / medium ${counts.medium} / low ${counts.low} / none ${counts.none}`);
console.log(`VIP: ${Object.entries(catCount).map(([k, v]) => `${k}=${v}`).join(', ')}`);
console.log('wrote data/ref/pujamap-matches.json, data/pujamap-sync-report.md, data/vip-reconciliation-report.md');