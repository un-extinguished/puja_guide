# The data behind PujaHop Kolkata

Everything here is built from `raw/` by [`scripts/build-data.mjs`](../scripts/build-data.mjs):

```bash
npm run build:data
```

| File | What it holds |
| --- | --- |
| `raw/chunk*.jsonl` | The source catalogue rows, one pandal per line. |
| `archive/unverified-completeness-pally.jsonl` | 70 unverified placeholder rows (`Completeness Pally 101`–`170`), preserved for review and excluded from the active catalogue. |
| `pandals.json` | The active catalogue the app serves: 338 pandals (53 of them are the owner's VIP pass pandals). |
| `stations.json` | The metro stations the pandals name, with estimated positions. |
| `routes.json` | 20 walking routes, generated from the coordinates. |
| `meta.json` | Counts and the derived-field list, shown on the About page. |
| `vip-list.json` | The owner's pass list — the source of truth for which pandals are VIP. |
| `crowd.json` | Live queue reports. Created at runtime, expires in 90 minutes. |
| `LICENSE.txt` | ODbL and the full provenance note. |

## The build, step by step

1. **Read** every `raw/chunk*.jsonl` row. The review archive is checked to ensure it only contains placeholders, but is never loaded into the active catalogue.
2. **Merge duplicates.** The upstream catalogue carries a second pass of rows
   over ground already covered — *Trinayanee* beside *Trinayani*, *Adarsha
   Samiti* beside *Adarsha Samity*, and so on. Rows merge only when their
   normalised names are equal within 600 m, or are ≥85% similar within 400 m,
   or ≥70% similar within 120 m — and never when the pally numbers differ,
   because *74 Pally* and *75 Pally* are two different pujas on one street.
   Two more spelling pairs are folded by name before this rule runs — *25 Palli*
   beside *Kidderpore 25 Pally*, and *Paddapukur Youth Association* beside
   *Padmapukur Youth Assn.* — because a locality prefix or an abbreviated
   suffix hides them from the similarity heuristic.
   This build merged 13 such rows into 338 pandals. The 70 sequential
   `Completeness Pally N` rows are unverified placeholders with invented
   names and locations; they remain in `archive/unverified-completeness-pally.jsonl`
   for review and are excluded from the active catalogue. The build fails if a
   placeholder is reintroduced into `raw/`.
3. **Fill silent neighbourhoods** from the nearest pandal that names one, and
   mark the record `neighbourhoodInferred: true`.
4. **Split areas** from the published zone and latitude.
5. **Solve the stations.** See below.
6. **Generate the routes.** See below.
7. **Mark the VIP pandals.** `vip-list.json` is the owner's pass list; every
   listed slug is written into `pandals.json` as `isVIP: true`, and the two
   entries whose pin is still uncertain carry `vipReview: true`.
   Entries with no slug stay `missing` in the list and are not added to the
   catalogue.

The pin methods are not a guarantee that every pandal has been independently
checked on the ground. `verified` is the upstream label for a committee or
on-the-ground check; `osm` means matched to a place in OpenStreetMap. Geocoded,
street-snapped and neighbourhood-anchor pins are explicitly approximate, and
community submissions are identified separately. A recent source refresh added a second Kashi Bose Lane record about 416 m from
the GPS coordinates of its licensed photograph. The selected pin stays at the
existing location, which the photo GPS corroborates to within 1 m. That
evidence checks this pin, not the entire catalogue.

## Station positions are estimated, and say so

Upstream publishes, per pandal, the walk to that pandal's nearest station — not
the station's coordinates. For each station this build collects every pandal
that names it and searches for the point whose straight-line distances to those
pandals best match the published walks divided by 1.28 (the usual correction
from a straight line to a Kolkata street walk). `fitMeters` in
`stations.json` is the RMS of that fit, so the app can be honest about how good
the estimate is; the median across stations is around 400 m.

## Routes are generated, not curated

A route is: a seed pandal, the seven nearest to it within 2.6 km, and a
nearest-neighbour ordering from the seed. Nothing in this repository asserts
that a puja is famous or worth queueing for — that is not something the
coordinates can support. `walkMeters` per leg is straight-line × 1.28 and is
labelled an estimate in the app; the app can also measure the legs on the
public OSM foot router when the visitor asks.
