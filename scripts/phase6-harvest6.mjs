// Phase 6 harvest round 6: all Salt Lake block pins + mobile metro + durgaonline corroboration index.
import fs from 'node:fs';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const SLUGS = [
  // sector I (21 incl existing)
  'ae-block-durgotsab', 'salt-lake-aa-block', 'salt-lake-ab-block', 'salt-lake-ac-block',
  'salt-lake-ad-block', 'salt-lake-ag-block', 'salt-lake-ah-block', 'salt-lake-aj-block',
  'salt-lake-ba-block', 'salt-lake-bb-block', 'salt-lake-bc-block', 'salt-lake-bd-block',
  'salt-lake-be-block', 'salt-lake-ca-block', 'salt-lake-cb-block', 'salt-lake-cd-block',
  'salt-lake-ce-block', 'salt-lake-da-block', 'salt-lake-db-block', 'salt-lake-ec-market',
  'salt-lake-labony-estate',
  // sector II (13)
  'bj-block-durgotsab', 'karunamayee-g-block', 'salt-lake-ak-block', 'salt-lake-al-block',
  'salt-lake-bg-block', 'salt-lake-bh-block', 'salt-lake-bk-block', 'salt-lake-bl-block',
  'salt-lake-cg-block', 'salt-lake-cj-block', 'salt-lake-ck-cl-block', 'salt-lake-dl-block',
  'salt-lake-ee-block',
  // sector III (11)
  'fd-block-durgotsab', 'purbachal-sarbojanin', 'salt-lake-fc-block', 'salt-lake-fe-block',
  'salt-lake-gc-block', 'salt-lake-gd-block', 'salt-lake-ha-block', 'salt-lake-hb-block',
  'salt-lake-ia-block', 'salt-lake-ib-block', 'salt-lake-jc-block',
];
const SECTOR = {};
for (const [i, s] of SLUGS.entries()) {
  SECTOR[s] = i < 21 ? 'I' : i < 34 ? 'II' : 'III';
}

const out = {};
async function pandal(slug) {
  const t = await get(`https://www.thepujo.com/pujo/${slug}/`).catch(() => '');
  if (!t) { out[slug] = { fail: true }; return; }
  const pin = t.match(/destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
  const txt = strip(t.replace(/<script[\s\S]*?<\/script>/g, ' '));
  const metro = txt.match(/nearest metro station is ([^.]+?) metro/);
  const qix = txt.search(/Questions about/);
  const body = qix > -1 ? txt.slice(qix, qix + 400) : '';
  const where = body.match(/^(?:Where is [^?]+\?)\s*([\s\S]{0,160})/);
  out[slug] = {
    sector: SECTOR[slug],
    pin: pin ? [+pin[1], +pin[2]] : null,
    metro: metro ? strip(metro[1]) : null,
    where: where ? strip(where[1]).slice(0, 160) : '',
    h1: (t.match(/<h1[^>]*>([^<]+?)<\/h1>/) || [])[1] || '',
  };
  console.log(`${slug} [S${SECTOR[slug]}] pin=${out[slug].pin ? out[slug].pin.join(',') : '?'} metro=${out[slug].metro} :: ${out[slug].where.slice(0, 90)}`);
}

async function durgaOnlineCoverage() {
  const blocks = {};
  for (const yr of [2024, 2022, 2016]) {
    const t = await get(`https://www.durgaonline.co.in/${yr}`).catch(() => '');
    const links = [...t.matchAll(/href="[^"]*\/([a-z]{2}(?:block|_block| -block))\.html"/gi)].map((m) => m[1].toLowerCase());
    links.forEach((l) => { const key = (l.match(/^([a-z]{2})/) || [])[1]; if (key) blocks[key] = true; });
  }
  console.log('\ndurgaonline block coverage:', Object.keys(blocks).sort().join(', '));
  return blocks;
}

async function main() {
  for (let i = 0; i < SLUGS.length; i += 5) {
    await Promise.all(SLUGS.slice(i, i + 5).map(pandal));
  }
  fs.writeFileSync('data/phase6-thepujo-pins.json', JSON.stringify(out, null, 1));
  await durgaOnlineCoverage();
}
main().catch((e) => { console.error(e); process.exit(1); });