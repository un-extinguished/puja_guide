// Phase 6 harvest round 8: pujokolkata pins + dakshindari location triangulation + remaining photon probes.
import fs from 'node:fs';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function pkPage(slug) {
  const t = await get(`https://pujokolkata.com/puja/${slug}`).catch(() => '');
  if (!t) { console.log(`\n## pk/${slug}: FAIL`); return; }
  const title = (t.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '';
  const txt = strip(t.replace(/<script[\s\S]*?<\/script>/g, ' '));
  const pin = txt.match(/([-+]?\d{2}\.\d{4,}),\s*([-+]?\d{2}\.\d{4,})/);
  const nb = txt.match(/Neighbourhood\s*([A-Za-z &]+)/);
  const metro = txt.match(/Nearest metro\s*([^.]+)/);
  const kind = txt.match(/Kind\s*([A-Za-z /]+)/);
  const why = txt.match(/this pin (?:marks|was placed)[^.]{0,140}/i);
  console.log(`\n## pk/${slug} :: ${strip(title).slice(0, 90)}\n   pin=${pin ? pin[1] + ',' + pin[2] : '?'} nb=${nb ? nb[1] : '?'} metro=${metro ? metro[1].slice(0, 40) : '?'} kind=${kind ? kind[1] : '?'}\n   note=${why ? why[0].slice(0, 130) : ''}`);
}

async function photon(q) {
  try {
    const t = await get(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`);
    const j = JSON.parse(t);
    return (j.features || []).map((f) => ({ name: f.properties.name, t: [f.properties.osm_key, f.properties.osm_value].filter(Boolean).join(':'),
      lat: +f.geometry.coordinates[1], lon: +f.geometry.coordinates[0], city: f.properties.city || '' }));
  } catch (e) { return [{ error: String(e) }]; }
}

async function kdDakshindari() {
  const t = await get('https://www.kolkatadurgotsav.com/dakshindari-youths-durgotsav.html').catch(() => '');
  if (!t) { console.log('\n## kd dakshindari: FAIL'); return; }
  const txt = strip(t.replace(/<script[\s\S]*?<\/script>/g, ' '));
  const addrIdx = txt.search(/Address|Location|Where|Dakshindari/);
  console.log('\n## kolkatadurgotsav dakshindari page:\n   ' + txt.slice(addrIdx > -1 ? addrIdx : 0, addrIdx + 600).replace(/\b(Navami|Ashtami|Saptami|Panchami|Shashthi|Dashami|Bijoya)\b/g, '\n   $1'));
}

async function main() {
  console.log('===== PUJOKOLKATA PAGES =====');
  const pks = ['dakshindari-youths', 'salt-lake-fd-block', 'salt-lake-ae-block', 'salt-lake-bj-block', 'salt-lake-cf-block', 'salt-lake-ha-block', 'salt-lake-gd-block', 'salt-lake-fe-block', 'salt-lake-aa-block', 'salt-lake-al-block', 'salt-lake-ah-block', 'salt-lake-ag-block', 'salt-lake-bc-block', 'salt-lake-cd-block'];
  for (const s of pks) await pkPage(s);
  console.log('\n===== PHOTON DAKSHINDARI + REMAINING BLOCKS =====');
  for (const q of ['Dakshindari Road Kolkata', 'Dakshindari playground', 'Dakshindari South Dum Dum', '17 no Dakshindari', 'Salt Lake IA Block Bidhannagar', 'Salt Lake IB Block Bidhannagar', 'Salt Lake JC Block Bidhannagar', 'Salt Lake AL Block Bidhannagar', 'Salt Lake BC Block Bidhannagar', 'Salt Lake CD Block Bidhannagar']) {
    const r = await photon(q);
    console.log(`\n${q}:`);
    for (const f of r.slice(0, 4)) console.log(`   ${f.name} [${f.t}] ${f.lat},${f.lon} ${f.city}`);
  }
  await kdDakshindari();
  // durgapujopandals dakshindari plural slug
  const t = await get('https://www.durgapujopandals.com/pandals/dakshindari-youths/').catch(() => '');
  if (t) { console.log('\n## dp/dakshindari-youths EXISTS len=' + t.length); }
  else console.log('\n## dp/dakshindari-youths: FAIL');
}
main().catch((e) => { console.error(e); process.exit(1); });