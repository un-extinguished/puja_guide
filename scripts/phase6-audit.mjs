// Phase 6 audit: what already covers Salt Lake / Bidhannagar / Dakshindari / Dum Dum-adjacent areas?
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pandals.json'), 'utf8'));

console.log('=== records whose name/street/neighbourhood mention the target areas ===');
for (const p of d) {
  const blob = [p.name, p.nameBn || '', p.nearStreet || '', p.neighbourhood || '', p.alsoKnownAs || ''].join(' | ').toLowerCase();
  if (/salt lake|bidhannagar|dakshindari|sector [iv]/.test(blob)) {
    console.log(`${p.slug} | ${p.name} | nb=${p.neighbourhood} | st=${p.nearStreet} | ${p.lat},${p.lon} | ${p.zone}${p.isVIP ? ' VIP' : ''} | m=${p.position.method}${p.position.approximate ? '~' : ''}`);
  }
}

console.log('\n=== every record that looks like a Salt Lake block (name starts with two capital letters + Block/Pally etc.) ===');
const BLOCK_RE = /^(salt lake )?([a-z]{2})-?block|block-?durga|^[a-z]{2} block/i;
for (const p of d) {
  if (BLOCK_RE.test(p.name) || /(^| )[a-z]{2} block/.test(p.name)) {
    console.log(`${p.slug} | ${p.name} | nb=${p.neighbourhood} | ${p.lat},${p.lon} | ${p.zone}${p.isVIP ? ' VIP' : ''}`);
  }
}

console.log('\n=== neighbourhoods containing "Dum" or "Lake" or "Baguiati" or "Joy" ===');
const nbs = new Set();
for (const p of d) nbs.add(p.neighbourhood || '');
for (const nb of [...nbs].sort()) {
  if (/dum|lake|baguiati|joy|kaikhali|nager/i.test(nb)) {
    const list = d.filter((p) => p.neighbourhood === nb);
    console.log(`${nb} (${list.length}): ${list.map((p) => p.name).slice(0, 12).join(', ')}`);
  }
}