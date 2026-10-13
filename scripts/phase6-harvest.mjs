// Phase 6 harvest: Salt Lake block pujas + Dakshindari candidates.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const LATLON = /([-+]?\d{1,2}\.\d{3,}),\s*([-+]?\d{1,2}\.\d{3,})/g;

async function thepujo(slug) {
  const url = `https://www.thepujo.com/pujo/${slug}/`;
  const t = await get(url).catch((e) => {});
  if (!t) { console.log(`\n## thepujo ${slug}: FETCH FAIL`); return; }
  const pin = t.match(/destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
  const txt = strip(t.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' '));
  const h1 = t.match(/<h1[^>]*>([^<]+)<\/h1>/);
  console.log(`\n## thepujo ${slug} :: ${h1 ? strip(h1[1]) : '?'} pin=${pin ? pin[1] + ',' + pin[2] : '?'}`);
  const iLoc = txt.search(/Location/i), iAbout = txt.search(/about|history|Est\./i);
  for (const ix of [iLoc, iAbout]) if (ix > -1) console.log(`   ...${txt.slice(ix, ix + 500)}`);
  const iNear = txt.search(/Nearby/i);
  if (iNear > -1) console.log(`   NEAR: ${txt.slice(iNear, iNear + 420)}`);
  const pa = t.match(/<p[^>]*aria-label="([^"]{10,180})"/i);
  if (pa) console.log(`   aria: ${pa[1]}`);
}

async function dpSearch(q) {
  const url = `https://www.durgapujopandals.com/pandals/?q=${encodeURIComponent(q)}`;
  const t = await get(url).catch((e) => {});
  if (!t) { console.log(`\n## dp ?q=${q}: FETCH FAIL`); return; }
  console.log(`\n## dp ?q=${q}`);
  // result cards: look for href="/pandals/<slug>/" + nearby text + coordinates
  const cards = [...t.matchAll(/<a[^>]*href="\/pandals\/([^"/]+)\/"[^>]*>([\s\S]{0,260}?)<\/a>/g)].slice(0, 12);
  if (!cards.length) {
    const txt = strip(t.replace(/<script[\s\S]*?<\/script>/g, ' ')).slice(0, 900);
    console.log(`   (no cards) head: ${txt.slice(0, 500)}`);
    return;
  }
  const seen = new Set();
  for (const c of cards) {
    const slug = c[1]; if (seen.has(slug)) continue; seen.add(slug);
    const inner = strip(c[2]).slice(0, 140);
    console.log(`   ${slug} :: ${inner}`);
  }
  const coords = [...t.matchAll(LATLON)].slice(0, 6);
  for (const m of coords) console.log(`   latlon-cand: ${m[1]}, ${m[2]}`);
}

async function dpPage(slug) {
  const url = `https://www.durgapujopandals.com/pandals/${slug}/`;
  const t = await get(url).catch((e) => {});
  if (!t) { console.log(`\n## dp/${slug}: FETCH FAIL`); return; }
  const h = t.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  console.log(`\n## dp/${slug} :: ${strip(h ? h[1] : '?')}`);
  const bodyTxt = strip(t.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' '));
  for (const word of ['Address', 'Nearest metro', 'Nearest Metro', 'Landmark', 'Rating', 'Est.']) {
    const ix = bodyTxt.indexOf(word);
    if (ix > -1) console.log(`   ${word}: ${bodyTxt.slice(ix, ix + 200)}`);
  }
  const gm = [...t.matchAll(/https:\/\/www\.google\.com\/maps[^"'\s]*/g)].slice(0, 4);
  for (const m of gm) console.log(`   gm: ${m[0].slice(0, 180)}`);
  const latLon = [...t.matchAll(LATLON)].slice(0, 8);
  for (const m of latLon) console.log(`   latlon-cand: ${m[1]}, ${m[2]}`);
  const jsonLd = t.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonLd) console.log(`   ld+json: ${strip(jsonLd[1]).slice(0, 500)}`);
}

async function kdSearch(q) {
  const url = `https://www.kolkatadurgotsav.com/?s=${encodeURIComponent(q)}`;
  const t = await get(url).catch((e) => {});
  if (!t) { console.log(`\n## kd ?s=${q}: FETCH FAIL`); return; }
  console.log(`\n## kd ?s=${q}`);
  const txt = strip(t.replace(/<script[\s\S]*?<\/script>/g, ' '));
  const idx = txt.indexOf('Nothing Found');
  console.log(`   found: ${idx > -1 ? 'no results' : 'results present'}`);
  for (const m of txt.matchAll(/(.{0,60}(Durkha|Durgatsav|Durgotsav|Puja|puja)[^<]{0,120})/g)) console.log(`   …${m[1].slice(0, 150)}`);
}

const BLOCKS = ['fd', 'fe', 'fc', 'ae', 'bj', 'ha', 'cf', 'gd', 'al', 'bc', 'ab', 'ag', 'ah', 'ad', 'ac'];
const DAK = ['dakshindari'];

async function main() {
  console.log('===== DURGAPUJOPANDALS SEARCHES =====');
  for (const b of BLOCKS) await dpSearch(`${b} block kolkata`);
  for (const d of DAK) await dpSearch(d);
  console.log('\n===== KOLKATADURGOTSAV SEARCHES =====');
  for (const q of ['FD Block', 'HA Block', 'CF Block', 'Dakshindari', 'Dakshindari Youths']) await kdSearch(q);
  console.log('\n===== THEPUJO PAGES (slug guesses) =====');
  const tSlugs = [
    'fd-block', 'fd-block-salt-lake', 'fe-block', 'fc-block-salt-lake', 'ae-block',
    'bj-block', 'ha-block', 'cf-block', 'gd-block', 'al-block', 'bc-block-salt-lake',
    'dakshindari-youths', 'dakshindari-youth-association', 'dakshindari-youngly-club',
    'dakshindari-sarbojanin', 'dakshindari-netaji-club',
  ];
  for (const s of tSlugs) await thepujo(s);
}
main().catch((e) => { console.error(e); process.exit(1); });