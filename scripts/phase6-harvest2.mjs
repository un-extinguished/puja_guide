// Phase 6 harvest round 2: enumerate full pandal indexes, then grep for Salt Lake / Dakshindari.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function dpIndex() {
  // durgapujopandals.com pandals index — try paginated /pandals/?page=N and /pandals/page/N
  const slugs = new Set();
  for (const form of [
    (p) => `https://www.durgapujopandals.com/pandals/?page=${p}`,
    (p) => `https://www.durgapujopandals.com/pandals/page/${p}/`,
  ]) {
    for (let p = 1; p <= 3; p++) {
      const t = await get(form(p)).catch((e) => { console.log('  index fail', p, String(e)); return null; });
      if (!t) continue;
      const found = [...t.matchAll(/href="\/pandals\/([^"/]+)\/"/g)].map((m) => m[1]);
      const before = slugs.size;
      found.forEach((s) => slugs.add(s));
      console.log(`index page ${p}: +${slugs.size - before} (total ${slugs.size})`);
      if (!/pandals\/([^"/]+)\//.test(t) || found.length === 0) break;
    }
  }
  const out = [...slugs].sort();
  console.log('\nTOTAL SLUGS:', out.length);
  const hits = out.filter((s) => /(salt-lake|bidhannagar|dakshindari|block)/.test(s));
  console.log('BLOCK/HIT SLUGS:\n' + hits.join('\n'));
  return out;
}

async function main() {
  const slugs = await dpIndex();
  const fs = await import('node:fs');
  fs.writeFileSync('data/phase6-dp-slugs.txt', [...slugs].sort().join('\n'));
}
main().catch((e) => { console.error(e); process.exit(1); });