// Phase 6 harvest round 9: find a trustworthy Dakshindari Youths pin (thepujo map data, kd raw, pujokolkata retry).
const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};
async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers }, redirect: 'follow' });
  return { status: r.status, text: await r.text() };
}
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function main() {
  console.log('===== thepujo map data: dum-dum-lake-town =====');
  for (const u of ['https://www.thepujo.com/map/a/dum-dum-lake-town/', 'https://www.thepujo.com/directory/saltlake/dum-dum-lake-town/']) {
    const { status, text: t } = await get(u);
    console.log(`\n${u} -> ${status} len=${t.length}`);
    // look for dakshindari context with numbers
    const idx = t.toLowerCase().indexOf('dakshindari');
    if (idx > -1) console.log('   ctx:', strip(t.slice(Math.max(0, idx - 400), idx + 400)).slice(0, 700));
    // any lat/lon pairs
    const latlon = [...t.matchAll(/(?:lat|latitude)["':=\s]+(-?\d{2}\.\d{3,})[^\d-]{1,20}(?:lo?n|longitude)["':=\s]+(-?\d{2}\.\d{3,})/g)].slice(0, 8);
    for (const m of latlon) console.log('   latlon:', m[1], m[2]);
  }

  console.log('\n===== kolkatadurgotsav raw dakshindari =====');
  const kd = await get('https://www.kolkatadurgotsav.com/dakshindari-youths-durgotsav.html');
  console.log('status', kd.status, 'len', kd.text.length);
  const t2 = kd.text;
  for (const pat of [/maps[^"'\s]{0,120}/gi, /(?:lat|lng|longitude|latitude)[^,;"'\s]{0,30}/gi, /17\s*No\.?[^<>]{0,80}/gi, /Dakshindari[^<>]{0,140}/gi]) {
    const hits = [...t2.matchAll(pat)].map((m) => m[0]).slice(0, 6);
    if (hits.length) console.log(`  ${pat}: ${hits.join(' || ').slice(0, 700)}`);
  }
  const addr = strip(t2).match(/(?:Address|Location|where)[:\s]*([^]{0,220})/i);
  if (addr) console.log('  ADDR-ish:', addr[1].slice(0, 220));

  console.log('\n===== pujokolkata retry =====');
  for (const u of ['https://pujokolkata.com/puja/salt-lake-fc-block', 'https://pujokolkata.com/puja/salt-lake-fc-block/', 'https://pujokolkata.com/', 'https://www.pujokolkata.com/puja/salt-lake-fc-block']) {
    const { status, text: t } = await get(u);
    console.log(`  ${u} -> ${status} len=${t.length}`);
    if (status === 200 && /FC Block/i.test(t)) {
      const pin = strip(t).match(/(-?\d{2}\.\d{4,}),\s*(-?\d{2}\.\d{4,})/);
      console.log('     pin text:', pin ? pin[0] : '?');
    }
  }

  console.log('\n===== websearch-style: duckduckgo html for dakshindari youths =====');
  for (const u of ['https://html.duckduckgo.com/html/?q=Dakshindari+Youths+17+No+playground', 'https://lite.duckduckgo.com/lite/?q=Dakshindari+Youths+pandal+address']) {
    const { status, text: t } = await get(u);
    console.log(`  ${u} -> ${status} len=${t.length}`);
    if (status === 200) console.log('   ', strip(t).slice(0, 500));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });