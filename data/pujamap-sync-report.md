# PujaHop Kolkata ↔ pujamap.com synchronisation report (Phase 2)

Generated 2026-10-13T15:37:08.455Z. Source: https://pujamap.com/puja-pandel-list/ retrieved live via the WordPress REST API (page 239, embedded HTML widget) → data/ref/pujamap-catalogue.json.

## 1. What the reference site actually exposes

pujamap.com is a small WordPress brochure site. Its only public pandal catalogue is one hard-coded 
widget on the "Puja Pandel List" page containing **74 entries (42 South, 32 North)** — no per-pandal detail pages, no APIs, no surveyed map pins. Each entry is a name, a single locality word (used as "address"), and a 4-decimal coordinate pair.

**Coordinate quality is not usable for correction.** The coordinates are arithmetic placeholders, not survey fixes: e.g. the Dhakuria series runs 22.5380/88.3600 → 22.5440/88.3690 in exact 0.002–0.003° steps, the south tail steps a uniform 0.005° in latitude, and some entries share identical coordinates (Jodhpur Park and Deshapriya Park both 22.5250/88.3450). Four decimals would imply ~100 m precision the data cannot deliver. Per the project rule "do not copy rounded or inaccurate coordinates blindly", **no PujaHop pin was changed to match these values.**

Several names on the reference are garbled ("Belghoria 33 Palli" whose own Bengali reads বেলঘাটা, "Ultodanga", "Kakurgachhi", "Rajar bag", "Nandan vicinity Mim Paltel", "Chandni Chowk Mahindra Mall"…), so identity was matched with English + Bengali + locality evidence and **no PujaHop name was overwritten with a worse spelling.**

## 2. Summary

| Item | Value |
| --- | --- |
| Records retrieved from pujamap.com | 74 (42 S / 32 N) |
| Identity matched to existing PujaHop records (high + medium) | 25 (high 18, medium 7) |
| Weak signal (low — corroboration only, not relied on) | 19 |
| No reliable counterpart (flagged, not added) | 30 |
| Names corrected in PujaHop | 0 (reference spellings are lower quality than existing data) |
| Coordinates corrected in PujaHop | 0 (reference coordinates are synthetic placeholders) |
| New records added from pujamap.com | 0 (no unmatched entry has a verifiable precise location) |
| New duplicate pairs consolidated | 0 (existing build-time folds unaffected) |

The PujaHop catalogue (338 pandals) is a superset of the reference catalogue. Every pujamap.com entry with a confident identity already has a PujaHop record; none needed relocation and none needed renaming. Entries without a confident match are mostly obscure or garbled names whose reference coordinates are synthetic — **none were added**, matching the "flag rather than fabricate" rule. This report is therefore the synchronisation audit: what exists, what was corroborated, and what is still unverifiable from this source.

## 3. Match table (all 74)

confidence: **high/medium** = identity corroborated; **low** = weak signal (corroboration only); **none** = no reliable counterpart.

| # | pujamap.com name | pujamap locality | PujaHop record | confidence | dist (m) | note / action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Ekdalia Evergreen Club | Gariahat | Ekdalia Evergreen (`ekdalia-evergreen`) | high | 2461 m | exists; identity corroborated — coords kept (reference too coarse) |
| 2 | Bosepukur Sitala Mandir | Kasba | Bosepukur Sitala Mandir (`bosepukur-sitala-mandir`) | high | 3974 m | exists; identity corroborated — coords kept (reference too coarse) |
| 3 | Suruchi Sangha | New Alipore | Suruchi Sangha (`suruchi-sangha`) | high | 1536 m | exists; identity corroborated — coords kept (reference too coarse) |
| 4 | Badamtala Ashar Sangha | Kalighat | Badamtala Ashar Sangha (`badamtala-ashar-sangha`) | high | 337 m | exists; identity corroborated — coords kept (reference too coarse) |
| 5 | Jodhpur Park | Jodhpur Park | Jodhpur Park (`jodhpur-park`) | high | 3092 m | exists; identity corroborated — coords kept (reference too coarse) |
| 6 | Hindusthan Park | Hindusthan Park | Hindustan Park Sarbojonin (`hindustan-park-sarbojonin`) | medium | 1936 m | exists; identity corroborated — coords kept (reference too coarse) |
| 7 | Singhi Park | Singhi Park | Singhi Park Sarbojanin (`singhi-park-sarbojanin`) | high | 1716 m | exists; identity corroborated — coords kept (reference too coarse) |
| 8 | Tridhara Sammilani | Tridhara | Tridhara Sammilani (`tridhara-sammilani`) | high | 2096 m | exists; identity corroborated — coords kept (reference too coarse) |
| 9 | Maddox Square | Maddox Square | Maddox Square (`maddox-square`) | high | 988 m | exists; identity corroborated — coords kept (reference too coarse) |
| 10 | Deshapriya Park | Deshapriya Park | Deshapriya Park (`deshapriya-park`) | high | 1139 m | exists; identity corroborated — coords kept (reference too coarse) |
| 11 | Baghajatin Cultural | Baghajatin | Ballygunge Cultural (`ballygunge-cultural`) | low | 1719 m | weak signal — not relied on |
| 12 | Garfa Park | Garfa | Sakuntala Park (`sakuntala-park`) | low | 2875 m | weak signal — not relied on |
| 13 | Ballygunge Garden | Ballygunge | Adi Ballygunge Sarbojanin (`adi-ballygunge-sarbojanin`) | none | — | no reliable counterpart — not added |
| 14 | Dhakuria 22 Palli | Dhakuria | 22 Palli (`22-palli`) | low | 851 m | "22 Palli" is a very common name; the reference says Dhakuria 22 Palli while this PujaHop record is a generic "22 Palli" (Elgin Road) — identity of the specific para is unconfirmed. weak signal — not relied on |
| 15 | Dhakuria 23 Palli | Dhakuria | 23 Palli (`23-palli`) | low | 1988 m | "23 Palli" is a common name; reference Dhakuria 23 Palli vs generic "23 Palli" (Hazra) — identity of the specific para is unconfirmed. weak signal — not relied on |
| 16 | Dhakuria 61 Palli | Dhakuria | 22 Palli (`22-palli`) | none | — | no reliable counterpart — not added |
| 17 | Dhakuria 66 Palli | Dhakuria | 26 Palli (`26-palli`) | none | — | no reliable counterpart — not added |
| 18 | Golpark | Golpark | Jodhpur Park (`jodhpur-park`) | none | — | no reliable counterpart — not added |
| 19 | Shib Mandir Palli | Golpark | Shib Mandir (`shib-mandir`) | high | 4748 m | exists; identity corroborated — coords kept (reference too coarse) |
| 20 | Beleghata Park | Rasbehari | Sakuntala Park (`sakuntala-park`) | low | 5441 m | weak signal — not relied on |
| 21 | Baghajatin Colony | Baghajatin | Ranikuti (`ranikuti`) | none | — | no reliable counterpart — not added |
| 22 | Ramnagar Sarbojanin | Ramnagar | Sahidnagar Sarbojanin (`sahidnagar-sarbojanin`) | low | 3810 m | weak signal — not relied on |
| 23 | Naktala Udayan Palli | Naktala | Naktala Udayan Sangha (`naktala-udayan-sangha`) | medium | 5119 m | Udayan Palli/Sangha variant of the same Naktala para (locality matches). exists; identity corroborated — coords kept (reference too coarse) |
| 24 | Bikrampur Club | Bikrampur | Agradut Club (`agradut-club`) | none | — | no reliable counterpart — not added |
| 25 | Rajar bag Club | Rajar bag | Barisha Club (`barisha-club`) | none | — | no reliable counterpart — not added |
| 26 | Kanakpaga Sarbojanin | Kanakpaga | Hatibagan Sarbojanin (`hatibagan-sarbojanin`) | low | 11945 m | weak signal — not relied on |
| 27 | Lalmohan Smriti Palli | Lalmohan | Masterda Smriti Sangha (`masterda-smriti-sangha`) | none | — | no reliable counterpart — not added |
| 28 | Juhar Abasan Palli | Juhar Abasan | 22 Palli (`22-palli`) | none | — | no reliable counterpart — not added |
| 29 | Bandhagobhar Sarbojanin | Bandhagobhar | Bagbazar Sarbojanin (`bagbazar-sarbojanin`) | low | 14588 m | weak signal — not relied on |
| 30 | Shagi Nagar Sangha | Shagi Nagar | VIP Nagar (`vip-nagar`) | none | — | no reliable counterpart — not added |
| 31 | Ragbagi Palli | Rasbehari | 22 Palli (`22-palli`) | low | 8097 m | weak signal — not relied on |
| 32 | Mehandnagar Palli | Mehandnagar | 22 Palli (`22-palli`) | none | — | no reliable counterpart — not added |
| 33 | Bongebi Sarbojanin | Bongebi | Sahidnagar Sarbojanin (`sahidnagar-sarbojanin`) | low | 7860 m | weak signal — not relied on |
| 34 | Joynagar Sigilni Palli | Joynagar | 22 Palli (`22-palli`) | none | — | no reliable counterpart — not added |
| 35 | Behala Club | Behala | Behala Club (`behala-club`) | high | 2894 m | exists; identity corroborated — coords kept (reference too coarse) |
| 36 | Thakurpukur Boro Mandap | Thakurpukur | Thakurpukur State Bank Park Sarbojanin (`thakurpukur-state-bank-park-sarbojanin`) | none | — | no reliable counterpart — not added |
| 37 | Sahapur Sarbojanin | Sahapur | Sahapur Sangha (`sahapur-sangha`) | high | 1024 m | exists; identity corroborated — coords kept (reference too coarse) |
| 38 | Behala Nabapalli | Behala | Charu Avenue Nabapally Sangha (`charu-avenue-nabapally-sangha`) | low | 4430 m | weak signal — not relied on |
| 39 | Shibtala Sarbojanin | Behala | Barisha Sarbojanin (`barisha-sarbojanin`) | low | 4828 m | Same Behala locality, but "Shibtala Sarbojanin" and "Barisha Sarbojanin" are distinct committee names — token+locality overlap only. weak signal — not relied on |
| 40 | Panti Club | Panti | Behala Club (`behala-club`) | none | — | no reliable counterpart — not added |
| 41 | Nagshwari Dakhin Palli | Thakurpukur | Parnashree Palli (`parnashree-palli`) | none | — | no reliable counterpart — not added |
| 42 | Shree Kalyan Sangha | Thakurpukur | Shree Sangha (`shree-sangha`) | none | — | no reliable counterpart — not added |
| 43 | Bagbazar Sarbojanin | Bagbazar | Bagbazar Sarbojanin (`bagbazar-sarbojanin`) | high | 1637 m | exists; identity corroborated — coords kept (reference too coarse) |
| 44 | Shobhabazar Rajbari | Shobhabazar | Sovabazar Rajbari (`sovabazar-rajbari`) | medium | 207 m | exists; identity corroborated — coords kept (reference too coarse) |
| 45 | Kumartuli Sarbojanin | Kumartuli | Kumartuli Sarbojanin (`kumartuli-sarbojanin`) | high | 1005 m | exists; identity corroborated — coords kept (reference too coarse) |
| 46 | Ahiritola Sarbojanin | Ahiritola | Ahiritola (`ahiritola`) | high | 1456 m | exists; identity corroborated — coords kept (reference too coarse) |
| 47 | Simla Byam Samiti | Simla | Simla Bayam Samiti (`simla-bayam-samiti`) | medium | 906 m | Byam/Bayam transliteration variant of Simla Bayam Samiti (same Jorasanko locality). exists; identity corroborated — coords kept (reference too coarse) |
| 48 | Hatibagan Sarbojanin | Hatibagan | Hatibagan Sarbojanin (`hatibagan-sarbojanin`) | high | 831 m | exists; identity corroborated — coords kept (reference too coarse) |
| 49 | College Square | College Square | College Square (`college-square`) | high | 1723 m | exists; identity corroborated — coords kept (reference too coarse) |
| 50 | Mohammad Ali Park | Mohammad Ali Park | Md. Ali Park (`md-ali-park`) | medium | 1841 m | exists; identity corroborated — coords kept (reference too coarse) |
| 51 | Lebutala/Sangeet Mitra | Lebutala | Mitra Sangha (`mitra-sangha`) | none | — | no reliable counterpart — not added |
| 52 | Central Avenue Shrimoni | Central Avenue | Linton Street Children Youth Forum (`linton-street-children-youth-forum`) | none | — | no reliable counterpart — not added |
| 53 | Burrabazar Nako’da | Burrabazar | Sovabazar Rajbari (`sovabazar-rajbari`) | none | — | no reliable counterpart — not added |
| 54 | Lal Bazar Sarbojanin | Lal Bazar | Ramlal Bazar Sarbojanin (`ramlal-bazar-sarbojanin`) | low | 7502 m | "Lal Bazar" and "Ramlal Bazar" are different markets; match is token-based only, not identity. weak signal — not relied on |
| 55 | Posta Burrabazar | Posta | Sovabazar Rajbari (`sovabazar-rajbari`) | none | — | no reliable counterpart — not added |
| 56 | Bagbazar Ghat Bala | Bagbazar | Bagbazar Sarbojanin (`bagbazar-sarbojanin`) | none | — | no reliable counterpart — not added |
| 57 | Bala Shitala Mandir | Bala | Shib Mandir (`shib-mandir`) | none | — | no reliable counterpart — not added |
| 58 | Kazipara Sarbojanin | Kazipara | Natunpara Sarbojanin (`natunpara-sarbojanin`) | low | 7108 m | weak signal — not relied on |
| 59 | Kakurgachhi Jubakbandh | Kakurgachhi | Dum Dum Park Yubak Brinda (`dum-dum-park-yubak-brinda`) | none | — | no reliable counterpart — not added |
| 60 | Belghoria 33 Palli | Belghoria | Beleghata 33 Pally (`beleghata-33-pally`) | medium | 5190 m | Reference garbled: EN says "Belghoria" but the Bengali reads বেলঘাটা ৩৩ পল্লী — the same numbered "Beleghata 33 Pally". exists; identity corroborated — coords kept (reference too coarse) |
| 61 | Ultodanga Palli | Ultodanga | 22 Palli (`22-palli`) | none | — | no reliable counterpart — not added |
| 62 | Shribhumi Sporting Club | Ultodanga | Kalitala Sporting (`kalitala-sporting`) | low | 11738 m | weak signal — not relied on |
| 63 | Lake Town Chandni Chowk | Lake Town | New Town Sarbojanin (`new-town-sarbojanin`) | none | — | no reliable counterpart — not added |
| 64 | Chandni Chowk Mahindra Mall | Chandni Chowk | Rabindra Pally Mangal (`rabindra-pally-mangal`) | none | — | no reliable counterpart — not added |
| 65 | Central Lane Dupurhar | Central Lane | Linton Street Children Youth Forum (`linton-street-children-youth-forum`) | none | — | no reliable counterpart — not added |
| 66 | Katgachhi Sarbojanin | Katgachhi | Hatibagan Sarbojanin (`hatibagan-sarbojanin`) | low | 2229 m | weak signal — not relied on |
| 67 | Batala Sarbojanin | Batala | Barisha Sarbojanin (`barisha-sarbojanin`) | low | 7112 m | weak signal — not relied on |
| 68 | Ramkrishna Mission Palli | Ramkrishna Mission | 22 Palli (`22-palli`) | none | — | no reliable counterpart — not added |
| 69 | More Bazar Sarbojanin | More Bazar | Ramlal Bazar Sarbojanin (`ramlal-bazar-sarbojanin`) | low | 7063 m | "More Bazar" and "Ramlal Bazar" are different markets; match is token-based only, not identity. weak signal — not relied on |
| 70 | Wholesale Market Rajkalpa | Wholesale Market | EC Block (Salt Lake) (`ec-block-salt-lake`) | none | — | no reliable counterpart — not added |
| 71 | Central Park Palli | Central Park | Jodhpur Park (`jodhpur-park`) | low | 7244 m | weak signal — not relied on |
| 72 | Nandan vicinity Mim Paltel | Nandan | Salt Lake Labony Estate (`salt-lake-labony-estate`) | none | — | no reliable counterpart — not added |
| 73 | Dum Dum Park Tarun Sangha | Dum Dum | Dum Dum Park Tarun Sangha (`dum-dum-park-tarun-sangha`) | high | 1193 m | exists; identity corroborated — coords kept (reference too coarse) |
| 74 | Jagat Mukherjee Park | Jagat Mukherjee Park | Jagat Mukherjee Park Sadharan Durgotsab (`jagat-mukherjee-park-sadharan-durgotsab`) | medium | 4332 m | Identity match; pin confirmed in Phase 5 — the famous pandal is at 1 Jatindra Mohan Avenue, Bagbazar (est. 1936) and the OSM anchor is correct (the earlier Harish Mukherjee Road reading was rescinded). exists; identity corroborated — coords kept (reference too coarse) |

## 4. Reference entries with no reliable counterpart (flagged, not added)

- **Ballygunge Garden** (id 13, south, Ballygunge) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.536,88.358 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Dhakuria 61 Palli** (id 16, south, Dhakuria) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.542,88.366 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Dhakuria 66 Palli** (id 17, south, Dhakuria) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.544,88.369 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Golpark** (id 18, south, Golpark) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.546,88.372 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Baghajatin Colony** (id 21, south, Baghajatin) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.52,88.34 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Bikrampur Club** (id 24, south, Bikrampur) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.505,88.332 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Rajar bag Club** (id 25, south, Rajar bag) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.5,88.33 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Lalmohan Smriti Palli** (id 27, south, Lalmohan) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.49,88.326 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Juhar Abasan Palli** (id 28, south, Juhar Abasan) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.485,88.324 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Shagi Nagar Sangha** (id 30, south, Shagi Nagar) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.475,88.32 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Mehandnagar Palli** (id 32, south, Mehandnagar) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.465,88.316 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Joynagar Sigilni Palli** (id 34, south, Joynagar) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.455,88.312 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Thakurpukur Boro Mandap** (id 36, south, Thakurpukur) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.51,88.334 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Panti Club** (id 40, south, Panti) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.477,88.305 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Nagshwari Dakhin Palli** (id 41, south, Thakurpukur) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.519,88.343 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Shree Kalyan Sangha** (id 42, south, Thakurpukur) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.525,88.349 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Lebutala/Sangeet Mitra** (id 51, north, Lebutala) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.582,88.3785 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Central Avenue Shrimoni** (id 52, north, Central Avenue) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.58,88.381 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Burrabazar Nako’da** (id 53, north, Burrabazar) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.5775,88.383 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Posta Burrabazar** (id 55, north, Posta) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.5735,88.386 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Bagbazar Ghat Bala** (id 56, north, Bagbazar) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.5925,88.3655 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Bala Shitala Mandir** (id 57, north, Bala) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.594,88.364 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Kakurgachhi Jubakbandh** (id 59, north, Kakurgachhi) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.597,88.36 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Ultodanga Palli** (id 61, north, Ultodanga) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.601,88.355 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Lake Town Chandni Chowk** (id 63, north, Lake Town) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.606,88.348 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Chandni Chowk Mahindra Mall** (id 64, north, Chandni Chowk) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.608,88.345 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Central Lane Dupurhar** (id 65, north, Central Lane) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.585,88.38 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Ramkrishna Mission Palli** (id 68, north, Ramkrishna Mission) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.574,88.386 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Wholesale Market Rajkalpa** (id 70, north, Wholesale Market) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.568,88.39 is a synthetic placeholder, so a record cannot be added from this source alone.
- **Nandan vicinity Mim Paltel** (id 72, north, Nandan) — no confident match to any PujaHop name/Bengali name/locality. Reference coordinate 22.562,88.394 is a synthetic placeholder, so a record cannot be added from this source alone.

## 5. PujaHop records not present on pujamap.com (kept, not removed)

Absence from the 74-entry reference catalogue is **not** grounds for removal — the PujaHop catalogue (338 pandals from a longer provenance) intentionally keeps records outside the reference. 313 of 338 PujaHop records have no confident counterpart on pujamap.com; representative examples by zone:

- **North & Central Kolkata** (133 records; e.g. Sinthee Sarbojainin, Bangali Sangha, Cossipore Shakti Sangha, Paikpara 15 Palli, Chowddar Pally, …)
- **South & South East Kolkata** (69 records; e.g. Adi Sammilita 57/58 Palli Sarbojanin Durgotsab, Chakraberia Sarbojanin, Gokhale Sporting, Agradut 76 Palli, Uday Sangha, …)
- **Port Area** (9 records; e.g. Udayan, Nabarag, 26 Palli, Kabitirtha Saradotsav, Milan Sangha, …)
- **South Suburban & South West (Jadavpur & Behala Division)** (127 records; e.g. C N Roy Rd Sarbojonin, Golmath Durgapuja Samity, Milan Tirtha, Rup Chand Mukherjee Sarbojonin, 68 Palli, …)

## 6. Notable observations for the review pile

- **Ahiritola:** the reference holds exactly one "Ahiritola Sarbojanin". Confirmed with the owner in Phase 5: the two VIP entries "Ahiritola Sarbojanin Samity" and "Ahiritola Sarbojanin Sarodotsob" are the same committee — both map to `ahiritola`. Our third record `ahiritola-20-pally` stays as-is but is not a VIP stop.
- **Dum Dum names:** the reference "Dum Dum Park Tarun Sangha" matches our **separate** record `dum-dum-park-tarun-sangha` (verified pin). It is NOT Dum Dum Tarun Dal, Yubak Brinda, Bharat Chakra or Park Sarbojanin. Phase 5 moved `dum-dum-tarun-dal` to thepujo.com's published Dum Dum Park pin; the review flag stays for a ground check.
- **Jagat Mukherjee Park:** pin confirmed in Phase 5. The famous pandal is at 1 Jatindra Mohan Avenue, Bagbazar (est. 1936); the record's OSM "Jagat Mukherjee Park" anchor (22.5997, 88.3662) is correct. The earlier Harish Mukherjee Road reading was wrong.
- **Beleghata 33 Pally:** identity with the reference "Belghoria 33 Palli" is certain (Bengali says বেলঘাটা). Phase 5 corrected the pin to thepujo.com's pandal-level position (22.566563, 88.393852); only a ground check remains.
- **In-catalogue duplicate review (Phase 5):** `bose-pukur` (area-anchor, Kasba) and `bosepukur-sitala-mandir` (OSM) were compared — they were judged to be a locality row and the committee, not a true duplicate, so both stay. The bare "Samaj Sebi Sangha" record, however, WAS a true duplicate of `samajsebi` (same Lake View Road club) and was folded into it.
- **DB Block (Newtown) vs BD Block (Salt Lake):** kept separate; Phase 5 added a new `db-block-newtown` record (DB Block, Action Area I, New Town) so the VIP name now has its own record.
- **Shibmandir:** Phase 5 corrected the pin to thepujo.com's Lake Terrace (near Lake Market) position (22.5107, 88.3525); the reference "Shib Mandir Palli" at Golpark is name-adjacent only.

## 7. What would be needed to finish synchronisation

- For the 25 identity matches (18 high, 7 medium): nothing further — identity is corroborated and existing pins are more precise than the reference.
- For the flagged entries (low/none): the Phase 5 research pass sourced committee pages, guide pans and published Plus Codes for the previously-missing VIP names — full evidence in data/phase5-research.md. No pin was copied from pujamap.com (its coordinates remain untrusted).
