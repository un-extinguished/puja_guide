// Phase 6 harvest round 3: thepujo Salt Lake sector directories + per-pandal pins.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&quot;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const DIRS = [
  'salt-lake-sector-i',
  'salt-lake-sector-ii',
  'salt-lake-sector-iii',
];
const SLUGS = {};

async function dirPage(sector) {
  const url = `https://www.thepujo.com/directory/saltlake/${sector}/`;
  const t = await get(url).catch((e) => { console.log(`\n## dir ${sector}: FAIL ${e}`); return null; });
  if (!t) return;
  console.log(`\n## directory ${sector}`);
  // capture contextual headings + links in order
  const items = [...t.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>|<a[^>]*href="\/pujo\/([^"/]+)\/"[^>]*>([\s\S]*?)<\/a>/g)];
  let heading = '(top)';
  for (const m of items) {
    if (m[1] !== undefined) {
      heading = strip(m[1]).slice(0, 90);
      console.log(`   [${heading}]`);
    } else if (m[2]) {
      const label = strip(m[3]).slice(0, 80);
      if (label) {
        console.log(`     - ${label} :: /pujo/${m[2]}/`);
        SLUGS[m[2]] = label;
      }
    }
  }
}

async function pandal(slug) {
  const url = `https://www.thepujo.com/pujo/${slug}/`;
  const t = await get(url).catch((e) => { console.log(`!pandal ${slug} FAIL ${e}`); return; });
  if (!t) return;
  const pin = t.match(/destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
  const txt = strip(t.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' '));
  const qa = txt.indexOf('Questions about');
  const body = qa > -1 ? txt.slice(qa, qa + 700) : '';
  const pinStr = pin ? `${pin[1]}, ${pin[2]}` : '?';
  console.log(`\n## ${slug} :: pin=${pinStr}\n   ${body.replace(/\. [A-Z]|(acther|nearest|where|which|when|what)/gi, (m) => '\n   ' + m.trim())}`);
}

async function main() {
  for (const s of DIRS) await dirPage(s);
  // also probe some extra directory roots
  for (const u of ['https://www.thepujo.com/directory/saltlake/', 'https://www.thepujo.com/directory/saltlake/dum-dum-lake-town/']) {
    const t = await get(u).catch(() => '');
    if (t) {
      const dirs = [...t.matchAll(/href="(?:https:\/\/www\.thepujo\.com)?(\/directory\/[^"#]+)"/g)].map((m) => m[1]);
      console.log(`\n## dir-roots from ${u}: ${[...new Set(dirs)].slice(0, 40).join(' | ')}`);
    }
  }
  console.log('\n\n############ per-pandal pages ############');
  const slugs = Object.keys(SLUGS).filter((s) => /block|durgotsab|nagar|club/.test(s));
  for (const s of slugs.sort()) await pandal(s);
}
main().catch((e) => { console.error(e); process.exit(1); });