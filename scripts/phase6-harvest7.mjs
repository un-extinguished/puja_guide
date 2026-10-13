// Phase 6 harvest round 7: photon-sanity of block centroids, durgapujopandals pins, durgaonline corroboration.
import fs from 'node:fs';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function photon(q) {
  try {
    const t = await get(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=4`);
    const j = JSON.parse(t);
    return (j.features || []).map((f) => {
      const p = f.properties || {};
      return { name: p.name, type: [p.osm_key, p.osm_value].filter(Boolean).join(':'),
               lat: +f.geometry.coordinates[1], lon: +f.geometry.coordinates[0],
               city: p.city || '', dist: p.district || '' };
    });
  } catch (e) { return [{ error: String(e) }]; }
}

async function dpPage(slug) {
  const t = await get(`https://www.durgapujopandals.com/pandals/${slug}/`).catch(() => '');
  if (!t) { console.log(`\n## dp/${slug}: FAIL`); return; }
  const title = (t.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '';
  const qParam = t.match(/[?&]q=(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
  const addr = t.match(/([A-Z][^<>]{6,90}(?:Salt Lake|Kolkata|Bidhannagar|Dum[^<>]{0,40}))/);
  const est = t.match(/Est\.?\s*(\d{4})|Founded in\s*(\d{4})/i);
  const metaRep = t.match(/nearest metro|Bengal Chemical|City Centre|Belgachia|Karunamoyee|Sector V|Stadium metro|Central Park metro/gi);
  console.log(`\n## dp/${slug} :: ${strip(title).slice(0, 80)}\n   q=${qParam ? qParam[1] + ',' + qParam[2] : '?'} est=${(est || ['','']).slice(1).filter(Boolean)[0] || '?'} addr=${addr ? strip(addr[1]).slice(0, 90) : '?'}`);
  console.log(`   metro-ish=${metaRep ? [...new Set(metaRep)].slice(0, 5).join(' | ') : '?'}`);
}

async function durgaCov() {
  const blocks = {};
  for (const yr of ['2024', '2022', '2016', '2014']) {
    const t = await get(`https://www.durgaonline.co.in/${yr}`).catch(() => '');
    const m = t.match(/href="[^"]*\/20\d\d\/[a-z]+"/gi) || [];
    m.forEach((h) => {
      const slug = (h.match(/\/([a-z0-9_+-]+)"?$/i) || [])[1];
      if (slug) {
        const k = slug.replace(/[^a-z]/g, '');
        if (k.length === 2 || k.endsWith('block')) blocks[slug] = true;
      }
    });
  }
  console.log('\ndurgaonline recent slugs:', Object.keys(blocks).sort().join(', '));
}

async function main() {
  console.log('===== PHOTON BLOCK CENTROIDS =====');
  const want = ['AE Block Bidhannagar', 'FD Block Bidhannagar', 'HA Block Bidhannagar', 'CF Block Bidhannagar', 'BJ Block Bidhannagar', 'GD Block Bidhannagar', 'FE Block Bidhannagar'];
  for (const q of want) {
    const r = await photon(q);
    console.log(`\n${q}:`);
    for (const f of r.slice(0, 3)) console.log(`   ${f.name} [${f.type}] ${f.lat},${f.lon} ${f.city} ${f.dist}`);
  }
  console.log('\n===== DURGAPUJOPANDALS PAGES =====');
  for (const s of ['salt-lake-fd-block', 'salt-lake-ae-block', 'salt-lake-bj-block', 'salt-lake-cf-block', 'salt-lake-gd-block', 'salt-lake-fe-block', 'salt-lake-fc-block', 'salt-lake-al-block', 'salt-lake-bc-block', 'salt-lake-ag-block', 'salt-lake-ah-block', 'salt-lake-ha-block', 'dakshindari-youth']) await dpPage(s);
  await durgaCov();
  // wp-json probe
  try {
    const t = await get('https://www.durgapujopandals.com/wp-json/wp/v2/pandals?search=salt%20lake%20fd');
    console.log('\nwp-json probe len:', t.length, '\n', t.slice(0, 400));
  } catch (e) { console.log('wp-json fail', String(e)); }
}
main().catch((e) => { console.error(e); process.exit(1); });