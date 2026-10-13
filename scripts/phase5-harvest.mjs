// Phase 5 research harvest: fetch thepujo directory/pandal pages, extract pins,
// run Nominatim for locality anchors, and decode the EC Block Plus Code.
// Run: node scripts/phase5-harvest.mjs
const UA = { 'User-Agent': 'PujaHop-phase5-research/1.0 (contact: local research)' };

async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}

// ---- Plus code (Open Location Code) decode ----
const ALPH = '23456789CFGHJMPQRVWX';
const ALPH_INDEX = Object.fromEntries([...ALPH].map((c, i) => [c, i]));
const CELL = [20, 1, 1 / 20, 1 / 400, 1 / 8000, 1 / 160000];
function decodePlus(code) {
  const clean = code.replace(/[^0-9A-Z]/g, '').toUpperCase();
  let lat = -90, lon = -180; // not used; we use explicit accumulation from 0 cell
  let latC = 0, lonC = 0;
  for (let i = 0; i < clean.length; i++) {
    const idx = ALPH_INDEX[clean[i]];
    const size = CELL[Math.floor(i / 2)];
    if (i % 2 === 0) latC += idx * size; else lonC += idx * size;
  }
  // decode() in the spec returns the center of the code area:
  const lastSize = CELL[Math.floor((clean.length - 1) / 2)];
  return { lat: latC + lastSize / 2, lon: lonC + lastSize / 2 };
}

// ---- Nominatim helper ----
async function nominatim(q) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=3&q=${encodeURIComponent(q)}`;
    const t = await get(url);
    const j = JSON.parse(t);
    return j.map((x) => ({
      name: x.name, display: x.display_name.slice(0, 110),
      lat: +x.lat, lon: +x.lon, cat: `${x.category}:${x.type}`,
    }));
  } catch (e) { return [{ error: String(e) }]; }
}

// ---- thepujo directory page extraction ----
function extractPandals(html) {
  const out = [];
  const re = /href="\/pujo\/([a-z0-9-]+)\/"[\s\S]{0,400}?<strong>([^<]+)<\/strong>|href="\/pujo\/([a-z0-9-]+)\/"[\s\S]{0,1200}?destination=(-?\d+\.\d+),(-?\d+\.\d+)/g;
  // simpler: find all pandal anchors, then pair with nearest destination= coords
  const anchors = [...html.matchAll(/<a href="\/pujo\/([a-z0-9-]+)\/"[^>]*>([^<]*)<\/a>/g)]
    .map((m) => ({ slug: m[1], name: (m[2] || '').trim() }));
  const coords = [...html.matchAll(/destination=(-?\d+\.\d+),(-?\d+\.\d+)/g)]
    .map((m) => [+m[1], +m[2]]);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    // the Directions anchor appears after the name anchor in the list markup
    out.push({ slug: a.slug, name: a.name, pin: coords[i] || null });
  }
  return out;
}

const DIRS = [
  ['kasba-santoshpur', 'https://www.thepujo.com/directory/south/kasba-santoshpur/'],
  ['behala-barisha', 'https://www.thepujo.com/directory/south/behala-barisha/'],
  ['kumartuli-ahiritola-sovabazar', 'https://www.thepujo.com/directory/north/kumartuli-ahiritola-sovabazar/'],
  ['kalighat-rashbehari', 'https://www.thepujo.com/directory/south/kalighat-rashbehari/'],
  ['tala-belgachia-dakshineswar', 'https://www.thepujo.com/directory/north/tala-belgachia-dakshineswar/'],
  ['bhowanipore-hazra', 'https://www.thepujo.com/directory/south/bhowanipore-hazra/'],
  ['bagbazar-shyambazar', 'https://www.thepujo.com/directory/north/bagbazar-shyambazar/'],
];

const PAGES = [
  ['hatibagan-nabin-pally', 'https://www.thepujo.com/pujo/hatibagan-nabin-pally/'],
  ['sikdar-bagan', 'https://www.thepujo.com/pujo/sikdar-bagan-sadharan-durgotsab/'],
  ['karbagan', 'https://www.thepujo.com/pujo/karbagan-sarbojanin/'],
  ['kestopur-pfk', 'https://www.thepujo.com/pujo/kestopur-prafulla-kanan-paschim-adhibasi-brinda/'],
  ['aswininagar', 'https://www.thepujo.com/pujo/aswininagar-bandhu-mahal-club/'],
];

const NOMI = [
  'State Bank Park, Thakurpukur, Kolkata',
  'Subhas Sarobar, Kolkata',
  'Kathgola, Ultadanga, Kolkata',
  'Ultadanga Main Road, Daspara, Kolkata',
  'Telipukur, Dum Dum, Kolkata',
  'Ananda Mohan Bose Road, Dum Dum, Kolkata',
  'Prafulla Kanan, Kestopur, Kolkata',
  'DB Block, New Town, Kolkata',
  'Chinar Park, Kolkata',
  'Aswini Nagar, Baguiati, Kolkata',
  'Sinthi, Kolkata',
  'Santoshpur, Kolkata',
  'Ganendra Mitra Lane, Hatibagan, Kolkata',
  'Sikdar Bagan Street, Kolkata',
  'Harish Mukherjee Road, Kolkata',
  'Pratapaditya Road, Kolkata',
];

async function main() {
  console.log('===== THEPUJO DIRECTORIES =====');
  for (const [label, url] of DIRS) {
    try {
      const html = await get(url);
      const list = extractPandals(html);
      console.log(`\n## ${label}`);
      for (const p of list) {
        console.log(`${p.pin ? p.pin.map((n) => n.toFixed(5)).join(',') : 'no-pin    '}  ${p.name.padEnd(38)} /pujo/${p.slug}/`);
      }
    } catch (e) { console.log(`\n## ${label} ERROR ${e.message}`); }
  }

  console.log('\n===== THEPUJO SPECIFIC PAGES =====');
  for (const [label, url] of PAGES) {
    try {
      const html = await get(url);
      const m = html.match(/destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
      const h = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
      const acc = html.match(/Map accuracy\*\*([^*]+)\*\*/);
      console.log(`\n## ${label}`);
      console.log(`title: ${h ? h[1] : '?'}  pin: ${m ? `${+m[1]}, ${+m[2]}` : 'none'}  accuracy: ${acc ? acc[1].trim() : '?'}`);
    } catch (e) { console.log(`\n## ${label} ERROR ${e.message}`); }
  }

  console.log('\n===== PLUS CODE =====');
  for (const code of ['HCP5+299', '3649H8P5+299']) {
    const d = decodePlus(code);
    console.log(`${code.padEnd(18)} -> ${d.lat.toFixed(6)}, ${d.lon.toFixed(6)}`);
  }

  console.log('\n===== NOMINATIM ANCHORS =====');
  for (const q of NOMI) {
    const res = await nominatim(q);
    console.log(`\n## ${q}`);
    for (const r of res) {
      if (r.error) console.log(`   error: ${r.error}`);
      else console.log(`   ${r.cat.padEnd(22)} ${r.lat.toFixed(5)}, ${r.lon.toFixed(5)}  ${r.display}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });