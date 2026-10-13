// Phase 5 harvest round 5: last remaining anchors (Telipukur, Masterda, Attapara) + review pins check.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
async function get(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}
async function nominatim(q) {
  try {
    const t = await get(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`);
    const j = JSON.parse(t);
    return j.map((x) => ({ label: x.display_name.slice(0, 90), lat: +x.lat, lon: +x.lon, type: x.type }));
  } catch (e) { return [{ error: String(e) }]; }
}
async function photon(q) {
  try {
    const t = await get(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`);
    const j = JSON.parse(t);
    return (j.features || []).map((f) => {
      const p = f.properties || {};
      return { name: p.name, type: [p.osm_key, p.osm_value].filter(Boolean).join(':'),
               lat: +f.geometry.coordinates[1], lon: +f.geometry.coordinates[0],
               city: p.city || p.state || '', dist: p.district || p.street || '' };
    });
  } catch (e) { return [{ error: String(e) }]; }
}
async function thepujo(slug) {
  const url = `https://www.thepujo.com/pujo/${slug}/`;
  const t = await get(url).catch((e) => '');
  if (!t) { console.log(`\n## thepujo ${slug}: FETCH FAIL`); return; }
  const pin = t.match(/destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
  const txt = t.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").replace(/\s+/g, ' ').trim();
  console.log(`\n## thepujo ${slug} :: pin=${pin ? pin[1] + ',' + pin[2] : '?'}`);
  for (const re of [/Location[^,.]{0,120}/, /pair[^.]{0,200}/i, /metro[^.]{0,120}/i, /Bust stop[^.]{0,90}/i, /Address[^.]{0,120}/i]) {
    const m = txt.match(re);
    if (m) console.log(`   ${m[0].slice(0, 220)}`);
  }
}

async function main() {
  console.log('===== NOMINATIM =====');
  for (const q of ['Telipukur North Dum Dum', 'Ananda Mohan Bose Road Kolkata', 'Masterda Smriti Sangha Prafulla Kanan',
                   'Attapara Sinthi Kolkata', 'State Bank Park Thakurpukur', 'Chinar Park Rajarhat']) {
    const res = await nominatim(q);
    console.log(`\n## ${q}`);
    for (const r of res) console.log(r.error ? `   error ${r.error}` : `   ${r.type.padEnd(14)} ${r.lat.toFixed(5)}, ${r.lon.toFixed(5)}  ${r.label}`);
  }
  console.log('\n===== PHOTON =====');
  for (const q of ['Telipukur Amarpalli', 'Nager Bazar', 'Thakurpukur State Bank Colony']) {
    const res = await photon(q);
    console.log(`\n## ${q}`);
    for (const r of res) console.log(r.error ? `   error ${r.error}` : `   ${(r.type || '').padEnd(18)} ${r.lat.toFixed(5)}, ${r.lon.toFixed(5)}  ${r.name} (${r.city}) ${r.dist}`);
  }
  console.log('\n===== THEPUJO pages =====');
  const tpages = ['yuba-sangha-telipukur', 'telipukur-yuba-sangha', 'attarpara-unnayan-samity', 'aswininagar-bandhu-mahal-club',
                  'hatibagan-nabin-pally', 'sikdar-bagan', 'kestopur-prafullakanan', 'masterda-smriti-sangha',
                  'ultadanga-bidhan-sangha', 'thakurpukur-sb-park-sarbojanin', 'ec-block-salt-lake', 'db-block-newtown'];
  for (const s of tpages) await thepujo(s);
}
main().catch((e) => { console.error(e); process.exit(1); });