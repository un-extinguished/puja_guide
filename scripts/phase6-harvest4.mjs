// inspect raw directory HTML for pandal link structure
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
(async () => {
  const url = 'https://www.thepujo.com/directory/saltlake/salt-lake-sector-i/';
  const r = await fetch(url, { headers: UA });
  const t = await r.text();
  // find a 1200-char window around each /pujo/ href
  const re = /(.{80}\/pujo\/[^"']{2,60}['"]?[\s\S]{0,300})/g;
  let m, n = 0;
  const out = [];
  while ((m = re.exec(t)) && n < 10) {
    out.push(m[1].slice(-520));
    n++;
  }
  console.log(out.join('\n---\n').slice(0, 6000));
})().catch((e) => { console.error(e); process.exit(1); });