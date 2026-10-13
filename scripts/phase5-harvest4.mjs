// Phase 5 harvest round 4: full-page coordinate/address extraction.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

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

async function durgapujopandals(slug) {
  const url = `https://www.durgapujopandals.com/pandals/${slug}/`;
  const t = await get(url).catch((e) => {});
  if (!t) { console.log(`\n## ${slug}: FETCH FAIL`); return; }
  const h = t.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  console.log(`\n## ${slug} :: ${strip(h ? h[1] : '?')}`);
  // look for coordinate-ish things
  const latLon = [...t.matchAll(/([-+]?\d{1,2}\.\d{3,}),\s*([-+]?\d{1,2}\.\d{3,})/g)].slice(0, 8);
  for (const m of latLon) console.log(`   latlon-cand: ${m[1]}, ${m[2]}`);
  const iframes = [...t.matchAll(/<iframe[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  for (const i of iframes.slice(0, 4)) console.log(`   iframe: ${i.slice(0, 220)}`);
  const maps = [...t.matchAll(/https:\/\/maps\.google\.com\/[^"'\s]+/g)].slice(0, 4);
  for (const m of maps) console.log(`   gm: ${m[0].slice(0, 220)}`);
  const addrRe = /(Address|Location|Nearest Metro|Metro|Landmark)[^<]{0,10}<[^>]*>([^<]{5,160})/gi;
  for (const m of [...t.matchAll(addrRe)].slice(0, 10)) console.log(`   field: ${strip(m[1])}: ${strip(m[2])}`);
  const bodyTxt = strip(t.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' '));
  const iAddr = bodyTxt.indexOf('Address');
  const iLoc = bodyTxt.indexOf('Nearest Metro');
  for (const ix of [iAddr, iLoc]) {
    if (ix > -1) console.log(`   ...${bodyTxt.slice(ix, ix + 260)}`);
  }
  // Nearby pandals (context)
  const near = bodyTxt.match(/nearby pandals?[\s\S]{0,400}/i);
  if (near) console.log(`   NEAR: ${near[0].slice(0, 400)}`);
  const mapEnd = t.indexOf('Open Interactive Map');
  const jsonLd = t.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonLd) console.log(`   ld+json: ${strip(jsonLd[1]).slice(0, 600)}`);
}

async function thepujo(slug) {
  const url = `https://www.thepujo.com/pujo/${slug}/`;
  const t = await get(url).catch((e) => {});
  if (!t) { console.log(`\n## thepujo ${slug}: FETCH FAIL`); return; }
  const h = t.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const pin = t.match(/destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
  const txt = strip(t.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' '));
  console.log(`\n## thepujo ${slug} :: ${h ? h[1] : '?'} pin=${pin ? pin[1] + ',' + pin[2] : '?'}`);
  // print the "info" paragraph region: after "Location" or "About"
  const iAbout = txt.search(/about|history|Pujo 2026|Est\./i);
  const iLoc = txt.search(/Location/i);
  for (const ix of [iLoc, iAbout]) {
    if (ix > -1) console.log(`   ...${txt.slice(ix, ix + 700)}`);
  }
  const iNear = txt.search(/Nearby/i);
  if (iNear > -1) console.log(`   NEAR: ${txt.slice(iNear, iNear + 500)}`);
}

async function main() {
  console.log('===== PHOTON: Pratapaditya =====');
  for (const q of ['Pratapaditya Road Kolkata', 'Pratapaditya Road South Kolkata', 'Tricon Park Kolkata']) {
    const res = await photon(q);
    console.log(`\n## ${q}`);
    for (const r of res) {
      if (r.error) console.log(`   error: ${r.error}`);
      else console.log(`   ${(r.type || '').padEnd(18)} ${r.lat.toFixed(5)}, ${r.lon.toFixed(5)}  ${r.name} (${r.city}) ${r.dist}`);
    }
  }
  console.log('\n===== DURGAPUJOPANDALS =====');
  await durgapujopandals('chinar-park-adhibasibrinda');
  await durgapujopandals('db-block-durga-puja-ground');
  console.log('\n===== THEPUJO =====');
  await thepujo('pratapaditya-road-trikon-park');
  await thepujo('dum-dum-tarun-dal');
  await thepujo('sandhani-beliaghata');
  await thepujo('ultadanga-bidhan-sangha');
  await thepujo('karbagan-sarbojanin');
}

main().catch((e) => { console.error(e); process.exit(1); });