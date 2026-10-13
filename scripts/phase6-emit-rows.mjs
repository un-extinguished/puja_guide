// Phase 6: emit chunk21-saltlake-dakshindari.jsonl (42 rows) and print them.
import fs from 'node:fs';

// [n, s, la, lo, k]
const rows = [
  // ---- Salt Lake Sector I ----
  ['AE Block Durgotsab',            'AE Block, Salt Lake Sector I',       22.59856,   88.409409,  'Salt Lake AE Block'],
  ['Salt Lake AA Block',            'AA Block, Salt Lake Sector I',       22.5917995, 88.39736,   null],
  ['Salt Lake AB Block',            'AB Block, Salt Lake Sector I',       22.593313,  88.3997852, null],
  ['Salt Lake AC Block',            'AC Block, Salt Lake Sector I',       22.5948385, 88.4034229, null],
  ['Salt Lake AD Block',            'AD Block, Salt Lake Sector I',       22.596855,  88.406448,  null],
  ['Salt Lake AG Block',            'AG Block, Salt Lake Sector I',       22.598421,  88.423286,  null],
  ['Salt Lake AH Block',            'AH Block, Salt Lake Sector I',       22.594231,  88.427269,  null],
  ['Salt Lake BA Block',            'BA Block, Salt Lake Sector I',       22.5888325, 88.3985726, null],
  ['Salt Lake BB Block',            'BB Block, Salt Lake Sector I',       22.5918475, 88.4022104, null],
  ['Salt Lake BC Block',            'BC Block, Salt Lake Sector I',       22.5929856, 88.4043323, null],
  ['Salt Lake BE Block',            'BE Block, Salt Lake Sector I',       22.596836,  88.412193,  null],
  ['Salt Lake CA Block',            'CA Block, Salt Lake Sector I',       22.5869917, 88.4006947, null],
  ['Salt Lake CB Block',            'CB Block, Salt Lake Sector I',       22.5888806, 88.4034229, null],
  ['Salt Lake CD Block',            'CD Block, Salt Lake Sector I',       22.588,     88.412,     null],
  ['Salt Lake CE Block',            'CE Block, Salt Lake Sector I',       22.5949341, 88.4131218, null],
  ['Salt Lake CF Block',            'CF Block, Salt Lake Sector I',       22.5938691, 88.4179169, null],
  ['Salt Lake DA Block',            'DA Block, Salt Lake Sector I',       22.5847695, 88.4019072, null],
  ['Salt Lake DB Block',            'DB Block, Salt Lake Sector I',       22.5862889, 88.4049385, null],
  ['Salt Lake Labony Estate',       'Labony Estate, Salt Lake Sector I',  22.583099,  88.4069754, null],
  // ---- Salt Lake Sector II ----
  ['BJ Block Durgotsab',            'BJ Block, Salt Lake Sector II',      22.590794,  88.42672,   'Salt Lake BJ Block'],
  ['Karunamayee G Block',           'G Block, near Karunamoyee, Salt Lake Sector II', 22.588, 88.412, 'Salt Lake G Block'],
  ['Salt Lake AL Block',            'AL Block, Salt Lake Sector II',      22.5861982, 88.4337248, null],
  ['Salt Lake BG Block',            'BG Block, Salt Lake Sector II',      22.5953985, 88.4225156, null],
  ['Salt Lake BH Block',            'BH Block, Salt Lake Sector II',      22.5939268, 88.4243335, null],
  ['Salt Lake BK Block',            'BK Block, Salt Lake Sector II',      22.5876407, 88.4288779, null],
  ['Salt Lake BL Block',            'BL Block, Salt Lake Sector II',      22.5846852, 88.4313014, null],
  ['Salt Lake CG Block',            'CG Block, Salt Lake Sector II',      22.5920383, 88.4216066, null],
  ['Salt Lake CJ Block',            'CJ Block, Salt Lake Sector II',      22.58927,   88.423599,  null],
  ['Salt Lake CK-CL Block',         'CK-CL Block, Salt Lake Sector II',   22.584633,  88.427864,  null],
  ['Salt Lake DL Block',            'DL Block, Salt Lake Sector II',      22.582136,  88.425819,  null],
  ['Salt Lake EE Block',            'EE Block, Salt Lake Sector II',      22.5801459, 88.4240305, null],
  // ---- Salt Lake Sector III ----
  ['FD Block Durgotsab',            'FD Block, Salt Lake Sector III',     22.583464,  88.412216,  'Salt Lake FD Block; Salt Lake FD Block Durga Puja'],
  ['Salt Lake FC Block',            'FC Block, Salt Lake Sector III',     22.5800034, 88.409485,  null],
  ['Salt Lake FE Block',            'FE Block, Salt Lake Sector III',     22.5815762, 88.4179705, null],
  ['Salt Lake GC Block',            'GC Block, Salt Lake Sector III',     22.5785377, 88.4119096, null],
  ['Salt Lake GD Block',            'GD Block, Salt Lake Sector III',     22.576777,  88.414162,  null],
  ['Salt Lake HA Block',            'HA Block, Salt Lake Sector III',     22.5756353, 88.4112045, null],
  ['Salt Lake HB Block',            'HB Block, Salt Lake Sector III',     22.5741049, 88.4155462, null],
  ['Salt Lake IA Block',            'IA Block, Salt Lake Sector III',     22.5725,    88.413,     null],
  ['Salt Lake IB Block',            'IB Block, Salt Lake Sector III',     22.5720152, 88.4134611, null],
  ['Salt Lake JC Block',            'JC Block, Salt Lake Sector III',     22.5696125, 88.4131218, null],
  // ---- Dakshindari ----
  ['Dakshindari Youths',            '17 No. Playground, Dakshindari Road, Ward 35, South Dumdum, Kolkata 700048', 22.595455, 88.393977, 'Dakshindari Youth Durga Puja; Dakshindari Youths Durga Puja Committee'],
];

const bname = {
  'salt-lake-aa-block': 'সল্টলেক এ-এ ব্লক',
  'salt-lake-ab-block': 'সল্টলেক এ-বি ব্লক',
  'salt-lake-ac-block': 'সল্টলেক এ-সি ব্লক',
  'salt-lake-ad-block': 'সল্টলেক এ-ডি ব্লক',
  'ae-block-durgotsab': 'সল্টলেক এ-ই ব্লক দুর্গোৎসব',
  'salt-lake-ag-block': 'সল্টলেক এ-জি ব্লক',
  'salt-lake-ah-block': 'সল্টলেক এ-এইচ ব্লক',
  'salt-lake-ba-block': 'সল্টলেক বি-এ ব্লক',
  'salt-lake-bb-block': 'সল্টলেক বি-বি ব্লক',
  'salt-lake-bc-block': 'সল্টলেক বি-সি ব্লক',
  'salt-lake-be-block': 'সল্টলেক বি-ই ব্লক',
  'salt-lake-ca-block': 'সল্টলেক সি-এ ব্লক',
  'salt-lake-cb-block': 'সল্টলেক সি-বি ব্লক',
  'salt-lake-cd-block': 'সল্টলেক সি-ডি ব্লক',
  'salt-lake-ce-block': 'সল্টলেক সি-ই ব্লক',
  'salt-lake-cf-block': 'সল্টলেক সি-এফ ব্লক',
  'salt-lake-da-block': 'সল্টলেক ডি-এ ব্লক',
  'salt-lake-db-block': 'সল্টলেক ডি-বি ব্লক',
  'salt-lake-labony-estate': 'সল্টলেক ল্যাবনি এস্টেট',
  'bj-block-durgotsab': 'সল্টলেক বি-জে ব্লক দুর্গোৎসব',
  'karunamayee-g-block': 'সল্টলেক জি ব্লক (করুণাময়ী)',
  'salt-lake-al-block': 'সল্টলেক এ-এল ব্লক',
  'salt-lake-bg-block': 'সল্টলেক বি-জি ব্লক',
  'salt-lake-bh-block': 'সল্টলেক বি-এইচ ব্লক',
  'salt-lake-bk-block': 'সল্টলেক বি-কে ব্লক',
  'salt-lake-bl-block': 'সল্টলেক বি-এল ব্লক',
  'salt-lake-cg-block': 'সল্টলেক সি-জি ব্লক',
  'salt-lake-cj-block': 'সল্টলেক সি-জে ব্লক',
  'salt-lake-ck-cl-block': 'সল্টলেক সি-কে-সি-এল ব্লক',
  'salt-lake-dl-block': 'সল্টলেক ডি-এল ব্লক',
  'salt-lake-ee-block': 'সল্টলেক ই-ই ব্লক',
  'fd-block-durgotsab': 'সল্টলেক এফ-ডি ব্লক দুর্গোৎসব',
  'salt-lake-fc-block': 'সল্টলেক এফ-সি ব্লক',
  'salt-lake-fe-block': 'সল্টলেক এফ-ই ব্লক',
  'salt-lake-gc-block': 'সল্টলেক জি-সি ব্লক',
  'salt-lake-gd-block': 'সল্টলেক জি-ডি ব্লক',
  'salt-lake-ha-block': 'সল্টলেক এইচ-এ ব্লক',
  'salt-lake-hb-block': 'সল্টলেক এইচ-বি ব্লক',
  'salt-lake-ia-block': 'সল্টলেক আই-এ ব্লক',
  'salt-lake-ib-block': 'সল্টলেক আই-বি ব্লক',
  'salt-lake-jc-block': 'সল্টলেক জে-সি ব্লক',
  'dakshindari-youths': 'দক্ষিণদাড়ি যুবক',
};

const slugify = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lines = rows.map(([n, s, la, lo, k]) => {
  const slug = slugify(n);
  const r = { n, b: bname[slug], z: 'I', s, h: n === 'Dakshindari Youths' ? 'Dakshindari' : 'Salt Lake', la, lo, g: 'community-report' };
  if (k) r.k = k;
  return r;
});

fs.writeFileSync('data/raw/chunk21-saltlake-dakshindari.jsonl', lines.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log('wrote', lines.length, 'rows');
for (const r of lines) console.log(`${r.n} | ${r.s} | ${r.la},${r.lo}${r.k ? ' | aka: ' + r.k : ''}`);