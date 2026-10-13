// Phase 5 harvest round 3: remaining identity/pin resolutions.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").replace(/&nbsp;/g, ' ').trim();

async function ddg(q) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const t = await get(url).catch((e) => '');
  const titles = [...t.matchAll(/<a[^>]*class="result__a"[^>]*>(.*?)<\/a>/g)].map((m) => strip(m[1]));
  const snippets = [...t.matchAll(/<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/g)].map((m) => strip(m[1]));
  const out = [];
  for (let i = 0; i < Math.min(titles.length, 5); i++) out.push({ title: titles[i], snippet: snippets[i] || '' });
  return out;
}
async function photon(q) {
  try {
    const t = await get(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=4`);
    const j = JSON.parse(t);
    return (j.features || []).map((f) => {
      const p = f.properties || {};
      return { name: p.name, type: [p.osm_key, p.osm_value].filter(Boolean).join(':'),
               lat: +f.geometry.coordinates[1], lon: +f.geometry.coordinates[0],
               city: p.city || p.state || '', dist: p.district || p.street || '' };
    });
  } catch (e) { return [{ error: String(e) }]; }
}
async function pageTitleBody(url) {
  const t = await get(url).catch((e) => {});
  if (!t) return { error: 'fetch fail' };
  const h = t.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  const body = t.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1400);
  return { title: h ? strip(h[1]) : '?', body };
}

async function main() {
  console.log('===== PHOTON =====');
  for (const q of ['Prafulla Kanan Kolkata', 'Prafulla Kanan West Kestopur', 'Telipukur Dum Dum', 'Nager Bazar Dum Dum',
                   'DB Block New Town Kolkata', 'Action Area I New Town Kolkata', 'Chinar Park Kolkata', 'Hatiara Kolkata',
                   'State Bank Colony Thakurpukur', 'Thakurpukur Diamond Harbour Road']) {
    const res = await photon(q);
    console.log(`\n## ${q}`);
    for (const r of res) {
      if (r.error) console.log(`   error: ${r.error}`);
      else console.log(`   ${(r.type || '').padEnd(18)} ${r.lat.toFixed(5)}, ${r.lon.toFixed(5)}  ${r.name} (${r.city}) ${r.dist}`);
    }
  }

  console.log('\n===== DDG =====');
  const Q = [
    'Pratapaditya Road Tricon Park Durga Puja address',
    'Tricon Park Pratapaditya Road puja committee trikon park address',
    'DB Block Newtown Durga Puja 700107 location',
    '"DB Block" New Town kolkata durga puja khuti',
    'Chinar Park Adhibasibrinda durga puja Hatiara',
    'Telipukur Yuba Sangha durga puja address Dum Dum',
    'Masterda Smriti Sangha Kolkata durga puja address',
    'Ahiritola Sarbojanin Sarodotsob durga puja',
    'Samajsebi Southern Avenue durga puja',
    'Samaj Sebi Sangha Lake View Road durga puja address',
    'Dum Dum Tarun Dal durga puja address lake town',
  ];
  for (const q of Q) {
    const res = await ddg(q);
    console.log(`\n## ${q}`);
    for (const r of res) console.log(`   - ${r.title}\n     ${r.snippet}`);
  }

  console.log('\n===== DURGAPUJOPANDALS =====');
  for (const slug of ['chinar-park-adhibasibrinda', 'db-block-newtown', 'db-block-durga-puja-ground', 'thakurpukur-state-bank-park-sarbojanin', 'aswininagar-bandhumahal', 'telipukur-yuba-sangha']) {
    const p = await pageTitleBody(`https://www.durgapujopandals.com/pandals/${slug}/`);
    console.log(`\n## ${slug}`);
    console.log(p.title || p.error);
    console.log((p.body || '').slice(0, 600));
  }

  console.log('\n===== DURGAPUJAKOLKATA =====');
  for (const slug of ['db-block-newtown', 'chinar-park-adhibasibrinda', 'aswininagar-bandhu-mahal-club', 'masterda-smriti-sangha', 'attarpara-unnayan-samity']) {
    const p = await pageTitleBody(`https://durgapujakolkata.in/${slug}/`);
    console.log(`\n## ${slug}`);
    console.log(p.title || p.error);
    console.log((p.body || '').slice(0, 600));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });