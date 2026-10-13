// Phase 6 harvest round 5: JSON-LD slug lists + per-pandal pages (pin / est / metro / where).
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const DIRS = [
  'salt-lake-sector-i', 'salt-lake-sector-ii', 'salt-lake-sector-iii',
  'dum-dum-lake-town', 'new-town-baguiati',
];
const ORG = {}; // slug -> { name, sector }

async function dirPage(sector) {
  const url = `https://www.thepujo.com/directory/saltlake/${sector}/`;
  const t = await get(url).catch((e) => { console.log(`\n## dir ${sector}: FAIL ${e}`); return; });
  if (!t) return;
  const pairs = [...t.matchAll(/"url":"https:\/\/www\.thepujo\.com\/pujo\/([^"]+)\/","name":"([^"]+)"/g)];
  console.log(`\n## directory ${sector} (${pairs.length} pandals)`);
  for (const m of pairs) {
    console.log(`   ${m[2]} :: ${m[1]}`);
    ORG[m[1]] = { name: m[2], sector };
  }
}

async function pandal(slug) {
  const url = `https://www.thepujo.com/pujo/${slug}/`;
  const t = await get(url).catch((e) => { console.log(`\n## ${slug}: FAIL`); return; });
  if (!t) return;
  const pin = t.match(/destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
  const h1 = t.match(/<h1[^>]*>([^<]+?)<\/h1>/);
  const txt = strip(t.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' '));
  const qix = txt.search(/Questions about/);
  const body = qix > -1 ? txt.slice(qix, qix + 800) : txt.slice(0, 400);
  const meta = (ORG[slug] || {}).sector || '';
  console.log(`\n### ${slug} [${meta}] :: ${h1 ? strip(h1[1]) : '?'}\n   pin=${pin ? pin[1] + ', ' + pin[2] : '?'}\n   ${body.substr(0, 620)}`);
}

const CANDIDATES = [
  'fd-block-durgotsab', 'ae-block-durgotsab', 'bj-block-durgotsab',
  'salt-lake-fc-block', 'salt-lake-fe-block', 'salt-lake-gd-block',
  'salt-lake-ha-block', 'salt-lake-hb-block', 'salt-lake-gc-block',
  'salt-lake-al-block', 'salt-lake-ag-block', 'salt-lake-ah-block',
  'salt-lake-bc-block', 'salt-lake-aa-block', 'salt-lake-cc-block',
  'salt-lake-cd-block', 'salt-lake-ce-block', 'salt-lake-ba-block',
  'salt-lake-ee-block', 'salt-lake-dl-block', 'purbachal-sarbojanin',
  'dakshindari-youths',
];

async function main() {
  for (const s of DIRS) await dirPage(s);
  console.log('\n\n############ per-pandal pages ############');
  for (const s of CANDIDATES) {
    if (!ORG[s] && !/dakshindari/.test(s)) console.log(`\n### ${s}: NOT in directories`);
    await pandal(s);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });