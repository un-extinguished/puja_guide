# Phase 6 — Salt Lake & Dakshindari research (evidence log)

Purpose: close the two biggest holes in the catalogue — Salt Lake (only 4 block records before this
phase) and Dakshindari (zero records). For every candidate, record the source evidence for identity
and location, the pin used, and what still needs a human check. Rule: no fabricated pins; every pin
traces to a published guide pin, an OSM block centroid, or an address/nearby-landmark geocode, and
the row's `position.method` stays honest (`community-report`, approximate).

All 42 new records were written to `data/raw/chunk21-saltlake-dakshindari.jsonl` with
`g: "community-report"`, the same marker Phase 5 used. Why not `geocoded`: the build's dedupe
fuzzy-merges any two rows with ≥85 % bigram-similar names inside 400 m, and adjacent block names
("Salt Lake AA Block" vs "Salt Lake AB Block") score ~0.88 with the shared *Salt Lake*/*Block* words
— the 42 rows collapsed into ~27 without the exemption. The build source states "a row this project
added is never a duplicate of an upstream row", and `community-report` is exactly that marker
(Phase 5's chunk20 uses it too). The pins themselves are published guide/OSM positions, so the
`approximate: true` label is honest either way. Nearest metro is solved post-build.

Sources that worked: thepujo.com 2026 Salt Lake sector directories (`/directory/saltlake/*`, JSON-LD
item lists) + per-pandal pages (`destination=lat,lon` pins, nearest-metro), durgapujopandals.com
(`/pandals/*/` pages with est. years), kolkatadurgotsav.com (address pages), The Telegraph 2025 Salt
Lake guide, durgaonline.co.in (year pages), OSM via Photon (block centroids), durgapujakolkata.in and
thepuja.app (virtual tours) and news reports (The Statesman / India TV, 2020 FD Block fire). **pujamap.com
stays identity-reference only** — no coordinate copied from it. pujokolkata.com surfaced in search
results (its FC Block pin 22.5800, 88.4095 matches thepujo's) but direct fetches were blocked.

---

## 1. Dakshindari — new record (1)

### Dakshindari Youths → `dakshindari-youths` (the only independently verifiable Dakshindari puja)

- **Address (kolkatadurgotsav.com, "Dakshindari Youths Durgotsav" page):** "17 No. Playground,
  Dakshindari Road, Ultadanga, Kolkata-700048, North Kolkata." Same wording on durgapujakolkata.in:
  "17 No Playground, Dakshindari Rd, Ward 35, South Dumdum, Kolkata 700048 • Belgachhia".
- The Hindu (2025, theme *Dahan* — acid-attack survivors) places it in **South Dum Dum**. thepuja.app
  hosts a 360° tour for Dakshindari Youth 2024/2025; official account @dakshindariyouths. kolkatadurgotsav
  says 26 years of celebration in 2026 (est. ~2000) and lists past themes (2024 *Singhabahini*, Tapan
  Sinha centenary).
- **Pin used: 22.595455, 88.393977 (published guide coordinate).** Source: Wikivoyage
  *Kolkata/Northern Suburbs* → "Lake Town · Durga Puja venues", entry 10, "Dakshindari Youths, 17,
  Dakshindari Rd." = 22.595455, 88.393977 (updated Nov 2025) — the **Ultadanga (south-west) end** of
  Dakshindari Road, not the Sreebhumi end. Corroboration: thepujo's live page puts it "between Ultadanga
  and Lake Town", 410 m from Ultadanga PS, ~700 m north-east of Bidhannagar Road station (OSM 22.59177,
  88.39078) and ~1.8 km on foot from Belgachia — only the Ultadanga-end coordinate fits (~530 m
  straight / ~700 m walk to Bidhannagar Road). thepujo's own map pin is labelled "neighbourhood
  estimate" and is not used. **Corrected — supersedes the Phase-6 pin 22.6006, 88.4040, which sat at the
  wrong (Sreebhumi) end of the road, ~1.2 km away.** The "Ultadanga vs South Dum Dum" labels are not a
  contradiction: the road straddles the KMC / South Dum Dum boundary (kolkatadurgotsav says
  "Ultadanga, 700048"; durgapujakolkata.in says "Ward 35, South Dumdum"); thepujo files it under the
  Lake Town belt. Sreebhumi Sporting Club (22.600355, 88.40265) and Lake Town Adhibasi Brinda are
  separate listings on the same Wikivoyage list, so there is no identity confusion.
- Needs a human check: exact ground entrance on Dakshindari Road (flagged approximate).

### Other Dakshindari pandals
- None found that are both Dakshindari-named and independently verifiable. The named pujas on the same
  stretch — **Sreebhumi Sporting Club, Dum Dum Park Bharat Chakra / Tarun Sangha / Yubak Brinda /
  Sarbojanin, Dum Dum Tarun Dal** — are already in the catalogue. Candidates seen once (Motijheel
  Sarbojanin, Jawpur Bayam Samiti) were not added: single-source, and they sit in adjacent localities
  outside this phase's Salt Lake / Dakshindari scope.

---

## 2. Salt Lake — named candidates (FD, AE, BJ, AJ, HA, CF, GD, FE)

| Block | Verdict | Evidence | Pin used |
| --- | --- | --- | --- |
| **FD Block** | ADD `fd-block-durgotsab` | thepujo S3 pin 22.583464,88.412216; durgapujopandals est. 1985; The Statesman / India TV fire report (Oct 2020) names the "Salt Lake FD Block Durga Puja pandal"; durgaonline fdblock pages; thepuja.app 360° | 22.583464, 88.412216 (OSM FD Block centroid 22.5824,88.4123 — 117 m) |
| **AE Block** | ADD `ae-block-durgotsab` | thepujo S1 "Well-known here: AE Block" + page pin 22.59856,88.409409 | 22.59856, 88.409409 (OSM AE 22.6005,88.4124 — ~430 m) |
| **BJ Block** | ADD `bj-block-durgotsab` | thepujo S2 pin 22.590794,88.42672; durgapujopandals est. 1984; durgaonline bjblock | 22.590794, 88.42672 (OSM BJ 22.5903,88.4269 — 57 m) |
| **AJ Block** | ALREADY PRESENT — no row added | thepujo tags it "Sector I" but **OSM says Sector II** (AJ Block 22.591987,88.429343); the catalogue's existing "AJ Block, Salt Lake Sector II" and its pin 22.592155,88.428351 are correct (thepujo's own pin 22.592161,88.428291 matches within 76 m) | keep existing |
| **HA Block** | ADD `salt-lake-ha-block` | thepujo S3 page exists but its pin 22.5725,88.413 is a clamped placeholder (identical to its IA/IB pins); durgapujopandals est. 1980; Telegraph 2025 (40th year) | 22.5756353, 88.4112045 = **OSM HA Block centroid** (Sector III) |
| **CF Block** | ADD `salt-lake-cf-block` | **not in thepujo directories at all**; Telegraph 2025 Salt Lake guide confirms it (41st year, clay idol); OSM CF Block 22.593869,88.417917 (Sector I) | 22.5938691, 88.4179169 = OSM block centroid (approximate; ground needs check) |
| **GD Block** | ADD `salt-lake-gd-block` | thepujo S3 pin 22.576777,88.414162; durgapujopandals est. 1982; durgaonline gdblock; Telegraph 2025 | 22.576777, 88.414162 (OSM GD 22.5778,88.4166 — ~260 m) |
| **FE Block** | ADD `salt-lake-fe-block` | thepujo S3 pin 22.5815762,88.4179705; Telegraph 2025 | 22.5815762, 88.4179705 (OSM FE 22.5812,88.4174 — 80 m) |

## 3. Salt Lake — full block-by-block set (41 rows added)

thepujo's three sector directories (2026) list 21 + 13 + 11 pandals. Existing catalogue rows already
cover AJ, AK, BD and EC Block, and "Salt Lake EC Market" is the same committee as `ec-block-salt-lake`
(thepujo pin 22.585261,88.4092955 vs catalogue 22.585047,88.408378 — 130 m), so those stay single. That
leaves 40 Salt Lake rows from the directories, plus **CF Block** (researched above, absent from thepujo)
= 41 Salt Lake rows; Dakshindari Youths makes the 42nd new record overall.

**Sector I (19 added):** AE Block Durgotsab, Salt Lake AA / AB / AC / AD / AG / AH / BA / BB / BC / BE /
CA / CB / CD / CE / CF / DA / DB Block, Salt Lake Labony Estate.
**Sector II (12 added):** BJ Block Durgotsab, Karunamayee G Block, Salt Lake AL / BG / BH / BK / BL /
CG / CJ / CK-CL / DL / EE Block.
**Sector III (10 added):** FD Block Durgotsab, Salt Lake FC / FE / GC / GD / HA / HB / IA / IB / JC Block.

Pin provenance per row (details for the named eight above; the rest follow the same pattern):

| Row | Sector | Pin used (lat, lon) | thepujo published pin | OSM block centroid | Notes |
| --- | --- | --- | --- | --- | --- |
| AE Block Durgotsab | I | 22.598560, 88.409409 | 22.59856, 88.409409 | 22.60047, 88.41241 | directory "well-known" |
| Salt Lake AA Block | I | 22.591800, 88.397360 | 22.5917995, 88.39736 | — | |
| Salt Lake AB Block | I | 22.593313, 88.399785 | 22.593313, 88.3997852 | — | |
| Salt Lake AC Block | I | 22.594839, 88.403423 | 22.5948385, 88.4034229 | — | |
| Salt Lake AD Block | I | 22.596855, 88.406448 | 22.596855, 88.406448 | — | durgaonline `adblock` (2024) |
| Salt Lake AG Block | I | 22.598421, 88.423286 | 22.598421, 88.423286 | — | Telegraph 2025 (39th); dp est. 1986 |
| Salt Lake AH Block | I | 22.594231, 88.427269 | 22.594231, 88.427269 | — | Telegraph 2025 (42nd); dp est. 1986 |
| Salt Lake BA Block | I | 22.588833, 88.398573 | 22.5888325, 88.3985726 | — | Telegraph 2025 (46th) |
| Salt Lake BB Block | I | 22.591848, 88.402210 | 22.5918475, 88.4022104 | — | |
| Salt Lake BC Block | I | 22.592986, 88.404332 | 22.5929856, 88.4043323 | — | |
| Salt Lake BE Block | I | 22.596836, 88.412193 | 22.596836, 88.412193 | — | |
| Salt Lake CA Block | I | 22.586992, 88.400695 | 22.5869917, 88.4006947 | — | |
| Salt Lake CB Block | I | 22.588881, 88.403423 | 22.5888806, 88.4034229 | — | |
| Salt Lake CD Block | I | 22.588000, 88.412000 | 22.588, 88.412 (coarse) | — | coarse pin — see review list |
| Salt Lake CE Block | I | 22.594934, 88.413122 | 22.5949341, 88.4131218 | — | |
| Salt Lake CF Block | I | 22.593869, 88.417917 | — (no page) | 22.59387, 88.41792 | OSM-anchored; ground needs check |
| Salt Lake DA Block | I | 22.584770, 88.401907 | 22.5847695, 88.4019072 | — | |
| Salt Lake DB Block | I | 22.586289, 88.404939 | 22.5862889, 88.4049385 | — | |
| Salt Lake Labony Estate | I | 22.583099, 88.406975 | 22.583099, 88.4069754 | — | single-source (thepujo) |
| BJ Block Durgotsab | II | 22.590794, 88.426720 | 22.590794, 88.42672 | 22.59032, 88.42692 | |
| Karunamayee G Block | II | 22.588000, 88.412000 | 22.588, 88.412 (coarse) | — | coarse pin — see review list |
| Salt Lake AL Block | II | 22.586198, 88.433725 | 22.5861982, 88.4337248 | — | |
| Salt Lake BG Block | II | 22.595399, 88.422516 | 22.5953985, 88.4225156 | — | |
| Salt Lake BH Block | II | 22.593927, 88.424334 | 22.5939268, 88.4243335 | — | |
| Salt Lake BK Block | II | 22.587641, 88.428878 | 22.5876407, 88.4288779 | — | |
| Salt Lake BL Block | II | 22.584685, 88.431301 | 22.5846852, 88.4313014 | — | |
| Salt Lake CG Block | II | 22.592038, 88.421607 | 22.5920383, 88.4216066 | — | |
| Salt Lake CJ Block | II | 22.589270, 88.423599 | 22.58927, 88.423599 | — | |
| Salt Lake CK-CL Block | II | 22.584633, 88.427864 | 22.584633, 88.427864 | — | combined CK+CL puja |
| Salt Lake DL Block | II | 22.582136, 88.425819 | 22.582136, 88.425819 | — | |
| Salt Lake EE Block | II | 22.580146, 88.424031 | 22.5801459, 88.4240305 | — | |
| FD Block Durgotsab | III | 22.583464, 88.412216 | 22.583464, 88.412216 | 22.58241, 88.41232 | fire-report named 2020 |
| Salt Lake FC Block | III | 22.580003, 88.409485 | 22.5800034, 88.409485 | — | pujokolkata.com pin 22.5800,88.4095 agrees |
| Salt Lake FE Block | III | 22.581576, 88.417971 | 22.5815762, 88.4179705 | 22.58120, 88.41740 | |
| Salt Lake GC Block | III | 22.578538, 88.411910 | 22.5785377, 88.4119096 | — | |
| Salt Lake GD Block | III | 22.576777, 88.414162 | 22.576777, 88.414162 | 22.57780, 88.41660 | |
| Salt Lake HA Block | III | 22.575635, 88.411205 | 22.5725, 88.413 (clamped, rejected) | 22.57563, 88.41120 | OSM-anchored pin |
| Salt Lake HB Block | III | 22.574105, 88.415546 | 22.5741049, 88.4155462 | — | Telegraph 2025 mentions HB |
| Salt Lake IA Block | III | 22.572500, 88.413000 | 22.5725, 88.413 (clamped) | — | review — clampped pin kept |
| Salt Lake IB Block | III | 22.572015, 88.413461 | 22.5725, 88.413 (clamped) | 22.57202, 88.41346 (house anchor) | OSM-anchored pin |
| Salt Lake JC Block | III | 22.569613, 88.413122 | 22.5696125, 88.4131218 | — | review — stadium side |
| Dakshindari Youths | — | 22.595455, 88.393977 | 22.592, 88.392 (fallback, rejected) | Wikivoyage Kolkata/Northern Suburbs "Lake Town" (Nov 2025), 17 Dakshindari Rd; thepujo Ultadanga-end anchors | published guide coordinate |

**Coverage choice.** Salt Lake residential pujas follow block committees; the two 2026 guides that cover
Salt Lake exhaustively are thepujo (44 pages incl. the existing four) and durgapujopandals (subset).
Every row above has at least a published guide or OSM pin; the eight named candidates and the notable
blocks (FC, AG, AH, BA, AL, HB…) are doubly corroborated.

## 4. Duplicates avoided, identity questions

- **AJ Block** — thepujo's "Sector I" tag contradicted by OSM ("Sector II"); existing catalogue row kept
  as-is (no rename, same pin ± 76 m).
- **Salt Lake EC Market** — same committee as the existing `ec-block-salt-lake` (pins agree ~130 m);
  skipped.
- **Purbachal Sarbojanin under Sector III (thepujo, pin 22.573, 88.407, "Salt Lake Stadium" metro)** —
  the catalogue already has `purbachal-sarbojanin` at **Purbachal township, B K Chatterjee Road**
  (22.506088, 88.398530). Two different localities share the name; adding the thepujo entry would be a
  false duplicate if it is the same committee mis-mapped, or a genuinely separate stadium-side puja.
  **Flagged, not added** — needs an on-ground identity check before the second row appears.
- Block pairs like CD Block and Karunamayee G Block share thepujo's coarse pin 22.588, 88.412 — the two
  grounds are adjacent around City Centre / 5th Avenue but the shared pin is coarse, not evidence of the
  same puja (names, sectors and committees differ). Kept separate, both approximate.
- No name collisions with the 296 existing catalogue rows; build merged 13 rows (same as Phase 5 — the
  new rows are dedupe-exempt project rows).

## 5. Still needs verification (flagged, approximate)

1. **Dakshindari Youths** — pin is the published Wikivoyage "Lake Town" coordinate (17, Dakshindari Rd),
   supported by thepujo's Ultadanga-end anchors; confirm the ground entrance on site.
2. **IA / JC Block** — thepujo pins are coarse/clamped (IA shares the HA/IB placeholder); IB was corrected
   to the OSM house anchor, IA/JC kept as published. On-ground check for all three south-east-corner blocks.
3. **CF Block** — no thepujo page; pin is the OSM block centroid (block exists and runs a puja per
   Telegraph 2025); find the actual pandal ground.
4. **CD Block / Karunamayee G Block** — shared coarse pin; true grounds are adjacent but distinct.
5. **Salt Lake Labony Estate** — single-source (thepujo page); no independent corroboration yet.
6. **AJ existing row** — pin unchanged and correct; no action.
7. **Station-set gap (resolved).** The app's Green Line set lacked **City Centre** and **Salt Lake
   Stadium**, so Sector I/III blocks near them resolved their nearest metro to Central Park / Bengal
   Chemical / Karunamoyee instead (HA → Bengal Chemical 1.45 km, though the stadium station is only
   ~680 m away in a straight line). City Centre came in first, via the BD Block fix (§6 #2), taking 18
   Sector I blocks; OSM confirms our coordinates (22.587069, 88.407875) to ~4 m. The remaining stadium
   gap was a *builder* bug rather than missing data — the estimator only considered stations that a
   published-walk pandal names, so a station with published coordinates but no upstream row could never
   be assigned to a visitor-reported pandal. The builder now seeds its candidate map from **every**
   `STATION_COORDS` entry (§6 #3), which adds Salt Lake Stadium (6 blocks) and Thakurpukur (1).

## 6. Build notes

- Raw rows: 351 (290 upstream + 61 community); 13 rows merged → **338 pandals**; 53 unique VIP records
  (54 list entries) — **unchanged**, no new VIPs.
- `data/meta.json`: pandalCount 338, communityCount 61, vipCount 53, vipSouthCount 24, vipNorthCount 30,
  vipMissingCount 0.
- New file: `data/raw/chunk21-saltlake-dakshindari.jsonl` (42 rows, all `g: community-report`).
- Regenerated: `data/pandals.json`, `stations.json`, `routes.json`, `meta.json`,
  `data/ref/pujamap-matches.json`, `data/pujamap-sync-report.md` (338 pandals, 313 without a pujamap
  counterpart), `data/vip-reconciliation-report.md`.
- Ship-side (Phase 6): `public/app.js` `DATA_VERSION` → 20261013-odbl-3; `public/sw.js` VERSION →
  pujahop-v19 (asset `?v=18` → `?v=19`, data stamps updated to `-odbl-3`); README / data/README /
  package.json / index.html meta / manifest counts updated 296 → 338.
- **Post-Phase-6 follow-up (Dakshindari pin + intro preloader).** Dakshindari Youths pin corrected to
  22.595455, 88.393977 — see §1. Intro preloader reworked: black & white only, plays on **every** page
  load (the once-per-session gate is gone), ~5 s long (min beat 5000 ms, hard caps 5400/5600 ms, CSS
  safety net 6.8 s). Ship-side bumped again: `DATA_VERSION` → 20261013-odbl-4; `sw.js` VERSION →
  pujahop-v20; `app.js` `?v=20`, preloader assets `?v=2`. `scripts/render-test.mjs` preloader
  expectations updated (a repeat view still shows it; it holds ~5 s). Counts unchanged: 338 pandals,
  53 VIP records (54 list entries), 61 community.
- **Post-Phase-6 follow-up #2 (BD Block pin).** `BD Block Durga Puja` was geocoded ~1 km too far
  south, landing on Salt Lake City Centre mall / EC Block (22.5862, 88.4088). Corrected to the **OSM
  "BD Block" centroid, 22.5948023, 88.4080991** (way 155142853, `place=city_block`; the OSM
  neighbourhood node and OSM BD Park agree within ~55 m, and the reference pujomap pin 22.59491,
  88.40760 sits on BD Park). Corroboration: pujomap's own "pandals near" distances (AD 260 m, AE
  430 m, BE 510 m, Sreebhumi 790 m) all match the corrected pin. Nearest metro corrected to **City
  Centre, 860 m** — Central Park is 911 m from the corrected pin, and the old row's Central Park/847 m
  was derived from the wrong coordinate. Pointing the row at City Centre added it to `stations.json`
  (36 → 37) and re-solved **18 Sector I blocks** onto it, closing the gap in §5 item 7. Position method
  stays `geocoded` (approximate — a block centroid, not the pandal gate). Counts unchanged: 338
  pandals, 53 VIP records, 61 community, 290 upstream rows.
- Ship-side (post-Phase-6 #2): `DATA_VERSION` → 20261013-odbl-5; `sw.js` VERSION → pujahop-v21;
  `app.js` `?v=21`; data stamps updated to `-odbl-5`.
- **UI follow-up (header search).** The search box lived inline in the top bar and was the item that
  got flex-squeezed on maximised / mid-width windows (the owner reported it as missing). The header is
  now two rows — `.top-bar` (brand, toggles, nav, actions) plus a full-width search row capped at
  760 px; a new `--search-row` feeds `--header-height` so the map/panel inset stays exact. Ship-side:
  `style.css` `?v=19` → `?v=20`.
- **Post-Phase-6 follow-up #3 (station candidate set).** Root cause of the stadium gap fixed in
  `scripts/build-data.mjs`: `stationPos` used to be seeded only from stations a published-walk pandal
  names, so a station with published coordinates and no upstream row (Salt Lake Stadium 22.573056,
  88.403056; Thakurpukur 22.464261, 88.307555) could never be the nearest metro for a
  `community-report` row. The builder now seeds `stationPos` from **all** of `STATION_COORDS` (solved
  stations still fill any gaps), and the estimate loop creates a `byStation` bucket if the chosen
  station had none. Result: `stations.json` 37 → **39**. The 6 Salt Lake blocks re-solve to Salt Lake
  Stadium (HA 1132 m, IA 1309, IB 1376, JC 1411, GD 1553, HB 1648 — all `estimated`), and
  `thakurpukur-state-bank-park-sarbojanin` moves off Joka (1684 m) to Thakurpukur (374 m). Only those
  7 estimated rows changed; no published-walk row moved, so the median walk residual is unchanged
  within noise (286 → 284 m). Bengali names added for both new stations. Counts unchanged: 338
  pandals, 53 VIP records, 61 community, 290 upstream rows.
- Ship-side (post-Phase-6 #3): `DATA_VERSION` → 20261013-odbl-6; `sw.js` VERSION → pujahop-v23;
  `app.js` `?v=22`; data stamps updated to `-odbl-6`.
- Tests: `scripts/smoke.mjs` and `scripts/render-test.mjs` pass (render-test asserts the "338 pandals"
  count line, the 53/54 VIP invariants, and the dynamic station count — 37 after #2, **39** after #3).