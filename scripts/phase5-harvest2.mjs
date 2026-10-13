// Phase 5 harvest round 2: corrected Plus Code decoder, DDG HTML lookups,
// Photon queries, and targeted thepujo pages.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };

async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}

// ---- Plus code decode (correct convention) ----
const ALPH = '23456789CFGHJMPQRVWX';
const AIDX = Object.fromEntries([...ALPH].map((c, i) => [c, i]));
const CSIZE = [20, 1, 1 / 20, 1 / 400, 1 / 8000, 1 / 160000];
function decodeFull(code) {
  const clean = code.replace(/[^0-9A-Z]/g, '').toUpperCase();
  let lat = -90, lon = -180;
  for (let i = 0; i < clean.length; i++) {
    const size = CSIZE[Math.floor(i / 2)];
    if (i % 2 === 0) lat += AIDX[clean[i]] * size; else lon += AIDX[clean[i]] * size;
  }
  const last = CSIZE[Math.floor((clean.length - 1) / 2)];
  return { lat: +(lat + last / 2).toFixed(6), lon: +(lon + last / 2).toFixed(6) };
}
function shortCodeFull(short, refLat, refLon) {
  // pad missing leading pairs using reference location
  let lat = refLat + 90, lon = refLon + 180;
  let prefix = '';
  for (let i = 0; i < 4; i++) {
    const size = CSIZE[Math.floor(i / 2)];
    if (i % 2 === 0) { const d = Math.floor(lat / size); prefix += ALPH[d]; lat -= d * size; }
    else { const d = Math.floor(lon / size); prefix += ALPH[d]; lon -= d * size; }
  }
  return prefix + short;
}

// ---- DDG HTML search ----
async function ddg(q) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  let t = '';
  try { t = await get(url); } catch (e) { return [{ error: String(e) }]; }
  const out = [];
  const re = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  // fall back to plain href/heading pairs
  const rg = /<a[^>]*class="result__a"[^>]*>(.*?)<\/a>/g;
  const sn = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/g;
  const titles = [...t.matchAll(rg)].map((m) => strip(m[1]));
  const snippets = [...t.matchAll(sn)].map((m) => strip(m[1]));
  for (let i = 0; i < Math.min(titles.length, 6); i++) {
    out.push({ title: titles[i], snippet: snippets[i] || '' });
  }
  return out;
}
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").trim();

// ---- Photon ----
async function photon(q) {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=4`;
    const t = await get(url);
    const j = JSON.parse(t);
    return (j.features || []).map((f) => {
      const p = f.properties || {};
      return { name: p.name, type: [p.osm_key, p.osm_value].filter(Boolean).join(':'),
               lat: +f.geometry.coordinates[1], lon: +f.geometry.coordinates[0],
               city: p.city || p.state || '', dist: p.district || '' };
    });
  } catch (e) { return [{ error: String(e) }]; }
}

// ---- thepujo page ----
async function thepujoPage(slug) {
  const url = `https://www.thepujo.com/pujo/${slug}/`;
  try {
    const html = await get(url);
    const h = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const pin = html.match(/destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
    const acc = html.match(/Map accuracy\*\*([^*]+)\*\*/);
    const loc = html.match(/Durga Puja 2026 · ([^<\n]+)/);
    const also = [...html.matchAll(/Also known as: ([^<\n]+)/g)].map((m) => m[1].trim());
    const para = html.match(/<p>([^<]{60,500})<\/p>/);
    return { title: h ? h[1] : '?', pin: pin ? [+pin[1], +pin[2]] : null,
             accuracy: acc ? acc[1].trim() : '?', loc: loc ? loc[1].trim() : '',
             also: also.join(' | '), firstPara: para ? strip(para[1]) : '' };
  } catch (e) { return { error: String(e) }; }
}

async function main() {
  console.log('===== PLUS CODE (fixed) =====');
  for (const c of ['HCP5+299', '3649H8P5+299']) {
    const full = c.startsWith('H') ? shortCodeFull(c, 22.5726, 88.3639) : c;
    const d = decodeFull(full);
    console.log(`${c.padEnd(14)} -> full ${full.padEnd(16)} lat ${d.lat} lon ${d.lon}`);
  }

  console.log('\n===== THEPUJO PAGES =====');
  for (const slug of ['kumartuli-park-sarbojanin', 'kumartuli-sarbojanin', 'ahiritola-sarbojanin',
                      'santoshpur-lake-pally', 'thakurpukur-sb-park-sarbojanin',
                      'kasba-bosepukur-sitala-mandir', 'samaj-sebi-sangha',
                      'pratapaditya-road-trikon-park']) {
    const p = await thepujoPage(slug);
    console.log(`\n## ${slug}`);
    console.log(JSON.stringify(p));
  }

  console.log('\n===== DDG =====');
  const Q = [
    'Chinar Park Adhibasibrinda Durga Puja address',
    'Attarpara Unnayan Samity Sinthi address',
    'Kumartuli Park 66B Rabindra Sarani Durga Puja',
    'Ahiritola 20 Pally Durga Puja address',
    'Samaj Sebi Sangha Lake Place Durga Puja address',
    'Telipukur Yuba Sangha Nagerbazar address',
    'DB Block Newtown Durga Puja khuti address',
    'Masterda Smriti Sangha Prafulla Kanan Kestopur address',
  ];
  for (const q of Q) {
    const res = await ddg(q);
    console.log(`\n## ${q}`);
    for (const r of res) {
      if (r.error) console.log(`   error: ${r.error}`);
      else console.log(`   - ${r.title}\n     ${r.snippet}`);
    }
  }

  console.log('\n===== PHOTON =====');
  for (const q of ['Subhas Sarobar', 'Telipukur Kolkata', 'Karbagan Kolkata', 'State Bank Park Thakurpukur',
                   'DB Block Newtown', 'Chinar Park Adhibasibrinda', 'Attarpara Sinthi', 'Prafulla Kanan Kestopur']) {
    const res = await photon(q);
    console.log(`\n## ${q}`);
    for (const r of res) {
      if (r.error) console.log(`   error: ${r.error}`);
      else console.log(`   ${(r.type || '').padEnd(20)} ${r.lat.toFixed(5)}, ${r.lon.toFixed(5)}  ${r.name} (${r.city})`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });