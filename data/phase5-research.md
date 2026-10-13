# Phase 5 — Missing VIP pandal research (evidence log)

Purpose: for each of the 15 missing VIP pandals (+ review items), record the source evidence for
identity and location, and the pin that will be used. Rule: no fabricated pins; every pin must trace
to a published address/locality or a mapped landmark, and the row's `position.method` must be honest.

All 15 new records were written to `data/raw/chunk20-community.jsonl` with `g: "community-report"`,
which the build exempts from dedupe and labels `community` / `approximate` in `data/pandals.json`;
their nearest metro is solved post-build from the station list. One extra record — `kumartuli-park`
— was added to give VIP #38 its own catalogue row.

Sources that worked: thepujo.com (pandal pages, `destination=lat,lon` page pins and directory pins),
durgapujopandals.com (pandal-level pins + addresses + est. years), kolkatadurgotsav.com (`?s=` search),
OSM Nominatim/Photon. Sources that did not work this round: DuckDuckGo html/lite (CAPTCHA), Bing via
webfetch (returns junk). **pujamap.com is the primary matching reference for identity only** — its
coordinates (e.g. Telipukur 22.62052, 88.41251) are arithmetic/synthetic placeholders and were never
copied; where a phone thepujo/pandals pin disagrees, the published pandal-level pin is preferred.

---

## North — new records (11)

### 1. Ultadanga Karbagan (VIP "Ultadanga Karbagan" -> `ultadanga-karbagan`)
- durgapujopandals.com "Kar Bagan / কর বাগান" (est. 1949) — pin 22.595514, 88.383788; address "17/1/49
  Ultadanga Main Road". This is the well-known Ultadanga Karbagan committee.
- Pin used: 22.595514, 88.383788; zone I; bn "কর বাগান".

### 2. Ultadanga Bidhan Sangha (VIP -> `ultadanga-bidhan-sangha`)
- Address "31/A Kath Gola, opposite Telengabagan, Ultadanga" (committee/guide pages). Kath Gola runs
  off Ultadanga Main Road by the rail bridge, just north-west of Telenga Bagan ground (22.59490, 88.38538).
- Pin used: 22.5945, 88.3860 (nearest-locality anchor, approximate); zone I; bn "উল্টাডাঙ্গা বিধান সংঘ".

### 3. Hatibagan Nabin Pally (VIP -> `hatibagan-nabin-pally`)
- thepujo.com pandal page pin 22.5937, 88.3741, address "11/1D Ganendra Mitra Lane, Hatibagan".
- durgapujopandals.com "Nabin Palli" (est. 1943) at 22.5963, 88.3734 — ~330 m away in Hatibagan, same
  association name, corroborates the locality. `hatibagan-sarbojanin` is a **different** committee.
- Pin used: 22.5937, 88.3741; zone I; bn "হাতিবাগান নবীন পল্লী".

### 4. Sikdar Bagan (VIP -> `sikdar-bagan`)
- thepujo.com direccory/pandal pin 22.59662, 88.37231, address "69/1 Sikdar Bagan Street" (Shyambazar /
  Hatibagan belt).
- Pin used: 22.59662, 88.37231; zone I; bn "সিকদার বাগান".

### 5. Kumartuli Park (VIP #38 "Kumartuli Park" -> `kumartuli-park`, new record)
- **Distinct puja from `kumartuli-sarbojanin`.** thepujo.com directory pin 22.5998, 88.3612 (66B
  Rabindra Sarani) + durgapujopandals.com "Kumortuli Park" 22.59905, 88.361469 agree at ~90 m.
- thepujo.com's *page-level* pin for kumartuli-park (22.5985, 88.3603) and the old VIP pointer
  (`kumartuli-sarbojanin`, a "verified" 22.5989, 88.36144 read) both actually sit on the Park's spot —
  the committee name on the older record is the misleading part, not the location.
- Pin used: 22.5994, 88.3613 (mid-point of the two agreeing published pins); zone I; bn
  "কুমারটুলি পার্ক সর্বজনীন". `kumartuli-sarbojanin` (Banamali Sarkar Street) is kept as-is, non-VIP.

### 6. Chinar Park Adhibasibrinda (VIP -> `chinar-park-adhibasibrinda`)
- durgapujopandals.com "Chinar Park Adhibasibrinda" 22.623907, 88.439779, address "Chinar Park,
  Tegharia, Rajarhat 700052"; Nominatim "Chinar Park" primary node 22.62359, 88.44105 corroborates.
- Pin used: 22.623907, 88.439779; zone I; bn "চিনার পার্ক অধিবাসীবৃন্দ".

### 7. Aswininagar Bandhumahal (VIP -> `aswininagar-bandhumahal`)
- kolkatadurgotsav.com lists "Aswininagar Bandhumahal Club" (holding no. 26, Aswini Nagar, Baguiati);
  thepujo.com search centre for Aswini Nagar (Baguiati) is 22.61002, 88.43293.
- Pin used: 22.61, 88.4329; zone I; bn "অশ্বিনীনগর বন্ধুমহল".

### 8. Masterda Smriti Sangha (VIP -> `masterda-smriti-sangha`)
- Address "AB-61/1 Prafulla Kanan West" (700101). Prafulla Kanan West is the mapped school block
  (~22.60295–22.60335, 88.42399–88.42430); the committee works a few hundred metres further north.
- Pin used: 22.6045, 88.4240 (approximate, school-block anchor); zone I; bn "মাস্টারদা স্মৃতি সংঘ".

### 9. Kestopur Prafullakanan (VIP -> `kestopur-prafullakanan`)
- thepujo.com pin 22.6076, 88.42163 for the "Kestopur Prafullakanan (Paschim) Adhibasibrinda" puja,
  Kestopur (AA-122 Lipika Abasan, Prafulla Kanan). Kept as an `alsoKnownAs` alias on the record.
- Pin used: 22.6076, 88.42163; zone I; bn "কেষ্টপুর প্রফুল্লকানন".

### 10. Yuba Sangha Telipukur (VIP -> `yuba-sangha-telipukur`)
- Address "Ananda Mohan Bose Road, Telipukur, Nagerbazar, Dum Dum 700074". Telipukur is the cluster
  south-west of Nager Bazar market (~22.6205, 88.4032) on Dum Dum Road.
- Pin used: 22.6195, 88.4115 (approximate). pujamap.com's 22.62052, 88.41251 was treated as a
  synthetic placeholder and **not** copied; zone I; bn "তেলিপুকুর যুব সংঘ".

### 11. Attarpara Unnayan Samity (VIP -> `attarpara-unnayan-samity`)
- Attapara (also spelled Attarpara), Sinthi, north of Sinthee More; pincode 700050. The existing
  records `sinthee-sarbojainin` (22.63067, 88.37984) and `bangali-sangha` (22.63106, 88.37408) bracket the
  locality. No street-level pin found.
- Pin used: 22.6308, 88.3798 (approximate); zone I; bn "আট্টারপাড়া উন্নয়ন সমিতি".

---

## North — new records (2, New Town / Salt Lake)

### 12. DB Block (Newtown) (VIP -> `db-block-newtown`)
- **Distinct from `bd-block-durga-puja` (BD Block, Salt Lake Sector I).** durgapujopandals.com
  "DB Block Durga Puja Ground" 22.571222, 88.467807, address "DB Block(Newtown), Action Area I,
  New Town 700107". Zone II precedent — Action Area I is the Salt Lake-adjacent New Town cluster.
- Pin used: 22.571222, 88.467807; zone II; bn "নিউ টাউন ডি বি ব্লক".

### 13. EC Block (Salt Lake) (VIP -> `ec-block-salt-lake`)
- Published Plus Code **7MJCHCP5+299** (Kolkata prefix "7M") decodes to 22.58505, 88.40838 (EC
  Block Market, Salt Lake, Sector I, opposite Mani Square); thepujo.com pin 22.58526, 88.40930
  corroborates. durgapujopandals.com "EC Block Sarbojanin" est. 1964.
- Pin used: 22.58505, 88.40838; zone I; bn "সল্ট লেক ইসি ব্লক".

---

## South — new records (3)

### 14. Santoshpur Lakepally (VIP -> `santoshpur-lakepally`)
- thepujo.com pandal-level pin 22.491508, 88.382774 (Santoshpur Lake). Zone IV precedent.
- Pin used: 22.491508, 88.382774; zone IV; bn "সন্তোষপুর লেকপল্লি".

### 15. Beleghata Sandhani (VIP -> `beleghata-sandhani`)
- Committee address "P-68, CIT Road, Beliaghata". Subhas Sarobar (22.56840, 88.40092) bounds the
  para ~700 m SE; Phoolbagan metro is ~1.3 km away (zone II). No street-level pin published.
- Pin used: 22.5665, 88.3965 (approximate, between the named landmarks); zone II; bn "বেলেঘাটা সন্ধানী".

### 16. Thakurpukur State Bank Park Sarbojanin (VIP -> `thakurpukur-state-bank-park-sarbojanin`)
- Addresses published: "50, State Bank Park, Thakurpukur 700063" (kolkatadurgotsav.com,
  indianfestivaldiary.com); "133, Diamond Harbour Rd, East Barisha Govt Colony" (durgapujopandals.com);
  "near Thakurpukur metro station". Est. 1971 (55th in 2026).
- Anchors: Thakurpukur metro 22.46437, 88.30753; State Bank corporate branch (Diamond Harbour Rd)
  22.45931, 88.30633 — the State Bank Park colony lies between them, east of Diamond Harbour Road.
  thepujo.com's *page* pin (22.482, 88.305) failed its own internal consistency check, so it was not used.
- Pin used: 22.4620, 88.3090 (approximate, colon anchor); zone IV; bn "ঠাকুরপুকুর স্টেট ব্যাংক পার্ক
  সর্বজনীন". **Kept `vipReview`** — publishable, needs a ground check.

---

## Review items resolved

### Dum Dum Tarun Dal (VIP #50 -> `dum-dum-tarun-dal`, pin moved)
- Only published pandal-level pin: thepujo.com, Dum Dum Park 22.61173, 88.41874. The earlier visitor
  report ("Lake Town, Block B" 22.60708, 88.40532) is ~1.6 km away. Owner approved the published pin.
- Pin used: 22.61173, 88.41874; "Dum Dum Park"; **kept `vipReview`** for a ground check.

### Ahiritola #44/#45 (both -> `ahiritola`; `ahiritola-20-pally` kept, non-VIP)
- pujamap.com, thepujo.com ("Ahiritola Sarbojanin", pin 22.596, 88.3587), durgapujopandals.com
  ("Ahiritola", est. 1951, 22.594695, 88.360333) and kolkatadurgotsav.com all list exactly **one**
  Ahiritola Sarbojanin puja ("Ahiritola Jubak Brinda" is a junior committee). No "Sarodotsob" and no
  "Ahiritola 20 Pally" exists anywhere published.
- Decision (owner-confirmed): "Sarodotsob Samity" is the same committee as "Samity" — both VIP
  entries map to `ahiritola` (B.K. Paul Avenue, 22.594838, 88.357193, within 350 m of both published
  pins). `ahiritola-20-pally` (Strand Road) stays in the catalogue but is not a VIP stop.

### Samajsebi (VIP #16, merged)
- `samajsebi` (chunk04) and `samaj-sebi-sangha` (chunk12, Lake View Road, osm-surveyed 22.5147361,
  88.3559994, m Kalighat, d 1070) are the same club; the thepujo.com page pin (22.515591, 88.357719)
  corroborates the Lake View Road / Lake Gardens siting — not the Southern Avenue fuzzy pin.
- Action: chunk04 row updated to the osm pin + "Samaj Sebi Sangha" alias; chunk12 row deleted.

### Pratapaditya Road Tricon Park (VIP #19 -> `trikon-park`, confirmed)
- Photon "Tricon Park" (22.51364, 88.34460 — Kalighat) + thepujo.com page pin agree with the record's
  22.5135401, 88.3446465; durgapujopandals' pin (22.51559, 88.35772) was the outlier. Street updated
  to "Pratapaditya Road, Kalighat". `vipReview` cleared.

### Shib Mandir (VIP #17 -> `shib-mandir`, pin fixed)
- thepujo.com page pin 22.5107, 88.3525, "Lake Terrace near Lake Market" — north-west of the old pin
  (22.5111, 88.3500, "Lake Avenue Sebaksangha"). Pin + street updated; `vipReview` cleared.
  (pujamap.com's "Shib Mandir Palli" at Golpark is name-adjacent, not the same para.)

### Beleghata 33 Pally (VIP #26 -> `beleghata-33-pally`, pin fixed)
- Old pin 22.5643, 88.4028 was pujamap-derived (untrusted). thepujo.com pandal-level pin is
  22.566563, 88.393852 (CIT Road). Record updated; method stays `geocoded`/approximate (not OSM).

### Jagat Mukherjee Park (VIP #41, confirmed)
- The famous puja is at 1 Jatindra Mohan Avenue, Bagbazar (est. 1936); the OSM "Jagat Mukherjee Park"
  anchor (22.5997, 88.3662) on the record is correct. The earlier Harish Mukherjee Road (Bhowanipore)
  note in phase-4 materials was wrong and is rescinded. No change; `vipReview` was already clear.

### Bose Pukur (kept, not a duplicate)
- `bose-pukur` (22.504076, 88.371956, locality anchor, Kasba) was compared with
  `bosepukur-sitala-mandir` (thepujo-confirmed, VIP #14). Judged a locality row, not a true duplicate
  of the committee — kept as-is, non-VIP. The unseen "Bose Pukur" committee is the Sitala Mandir one.

---

## Build notes

- Raw rows: 309 (290 upstream + 19 community); 13 rows merged → **296 pandals**; 53 unique VIP
  records (54 list entries; Ahiritola counted once); VIP review flags now only on
  `thakurpukur-state-bank-park-sarbojanin` and `dum-dum-tarun-dal`.
- `data/meta.json`: pandalCount 296, vipCount 53, vipSouthCount 24, vipNorthCount 30,
  vipMissingCount 0.
- Ship-side: `public/app.js` `DATA_VERSION` → 20261013-odbl-2; `public/sw.js` VERSION → pujahop-v18
  (asset `?v=17` → `?v=18`, data stamps updated); index.html/manifest/README/package.json counts
  updated 281 → 296, 39 → 53.